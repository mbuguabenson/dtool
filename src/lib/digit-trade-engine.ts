import { action, makeObservable, observable, runInAction } from 'mobx';
import { api_base } from '@/external/bot-skeleton';
import { TDigitStat } from '@/stores/analysis-store';

export type TTradeConfig = {
    stake: number;
    multiplier: number;
    ticks: number;
    max_loss: number;
    use_max_loss: boolean;
    switch_condition: boolean;
    prediction: number;
    is_running: boolean;
    is_auto: boolean;
    take_profit?: number;
    max_runs?: number;
    runs_count?: number;
    use_compounding?: boolean;
    use_martingale?: boolean;
};

export type TTradeLog = {
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'trade';
};

export class DigitTradeEngine {
    @observable accessor even_odd_config: TTradeConfig = {
        stake: 0.35, multiplier: 2.1, ticks: 1, max_loss: 5, use_max_loss: true,
        take_profit: 10, switch_condition: false, prediction: 0, is_running: false, is_auto: false,
        use_compounding: false, use_martingale: true, max_runs: 12, runs_count: 0
    };
    @observable accessor over_under_config: TTradeConfig = {
        stake: 0.35, multiplier: 2.1, ticks: 1, max_loss: 5, use_max_loss: true,
        take_profit: 10, switch_condition: false, prediction: 4, is_running: false, is_auto: false,
        use_compounding: false, use_martingale: true, max_runs: 12, runs_count: 0
    };
    @observable accessor differs_config: TTradeConfig = {
        stake: 0.35, multiplier: 11, ticks: 1, max_loss: 5, use_max_loss: true,
        take_profit: 10, switch_condition: false, prediction: 0, is_running: false, is_auto: false,
        use_compounding: false, use_martingale: true, max_runs: 12, runs_count: 0
    };
    @observable accessor matches_config: TTradeConfig = {
        stake: 0.35, multiplier: 11, ticks: 1, max_loss: 5, use_max_loss: true,
        take_profit: 10, switch_condition: false, prediction: 0, is_running: false, is_auto: false,
        use_compounding: false, use_martingale: true, max_runs: 12, runs_count: 0
    };

    @observable accessor active_strategy: 'even_odd' | 'over_under' | 'differs' | 'matches' | null = null;
    @observable accessor trade_status: string = 'IDLE';
    @observable accessor session_profit: number = 0;
    @observable accessor total_profit: number = 0;
    @observable accessor is_executing = false;
    @observable accessor logs: TTradeLog[] = [];

    // Martingale State
    @observable accessor last_result: 'WIN' | 'LOSS' | null = null;
    @observable accessor current_streak: number = 0;

    // Strategy State
    private consecutive_even = 0;
    private consecutive_odd = 0;
    private consecutive_over = 0;
    private consecutive_under = 0;

    constructor() {
        makeObservable(this);
    }

    @action
    addLog = (message: string, type: 'info' | 'success' | 'error' | 'trade' = 'info') => {
        this.logs.unshift({ timestamp: Date.now(), message, type });
        if (this.logs.length > 50) this.logs.pop();
    };

    @action
    clearLogs = () => { this.logs = []; };

    @action
    updateConfig = <K extends keyof TTradeConfig>(strategy: string, key: K, value: TTradeConfig[K]) => {
        const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;
        if (config) config[key] = value;
    };

    @action
    toggleStrategy = (strategy: 'even_odd' | 'over_under' | 'differs' | 'matches') => {
        const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;
        
        if (config.is_running) {
            // Stop
            config.is_running = false;
            this.active_strategy = null;
            this.trade_status = 'STOPPED';
            this.is_executing = false;
        } else {
            // Start
            // Ensure others are stopped
            ['even_odd', 'over_under', 'differs', 'matches'].forEach(s => {
                const c = (this as Record<string, unknown>)[`${s}_config`] as TTradeConfig;
                if (c) c.is_running = false;
            });

            config.is_running = true;
            this.active_strategy = strategy;
            this.trade_status = 'RUNNING';
            this.addLog(`Strategy started: ${strategy.toUpperCase()}`, 'success');
        }
    };

    @action
    processTick = (last_digit: number, stats: { percentages: { even: number; odd: number; over: number; under: number; rise: number; fall: number }, digit_stats: TDigitStat[] }, symbol: string, currency: string) => {
        // Update local counters
        if (last_digit % 2 === 0) {
            this.consecutive_even++;
            this.consecutive_odd = 0;
        } else {
            this.consecutive_odd++;
            this.consecutive_even = 0;
        }

        if (last_digit >= 5) {
            this.consecutive_over++;
            this.consecutive_under = 0;
        } else {
            this.consecutive_under++;
            this.consecutive_over = 0;
        }

        if (!this.active_strategy) return;
        
        const config = (this as Record<string, unknown>)[`${this.active_strategy}_config`] as TTradeConfig;
        if (!config || !config.is_running) return;

        if (this.is_executing) return;

        // Check Max Runs
        if ((config.runs_count || 0) >= (config.max_runs || 100)) {
            this.stopAll('MAX RUNS REACHED');
            return;
        }

        switch (this.active_strategy) {
            case 'even_odd':
                this.checkEvenOdd(stats.percentages, config, symbol, currency);
                break;
            case 'over_under':
                this.checkOverUnder(stats.percentages, config, symbol, currency);
                break;
            case 'differs':
                this.checkDiffers(stats.digit_stats, config, symbol, currency);
                break;
            case 'matches':
                this.checkMatches(stats.digit_stats, config, symbol, currency);
                break;
        }
    };

    private checkEvenOdd = (percentages: { even: number; odd: number }, config: TTradeConfig, symbol: string, currency: string) => {
        // Logic: Wait for streak break
        if (percentages.even > 55 && this.consecutive_even >= 1 && this.consecutive_odd === 0) {
             // Basic trigger: Strong even trend
             this.executeTrade('DIGITEVEN', 0, config, symbol, currency);
        } else if (percentages.odd > 55 && this.consecutive_odd >= 1 && this.consecutive_even === 0) {
             this.executeTrade('DIGITODD', 0, config, symbol, currency);
        }
    };

    private checkOverUnder = (percentages: { over: number; under: number }, config: TTradeConfig, symbol: string, currency: string) => {
        let prediction = config.prediction;
        if (percentages.under > 55 && this.consecutive_under >= 1) {
            if (prediction < 6) prediction = 8;
            this.executeTrade('DIGITUNDER', prediction, config, symbol, currency);
        } else if (percentages.over > 55 && this.consecutive_over >= 1) {
            if (prediction > 3) prediction = 1;
            this.executeTrade('DIGITOVER', prediction, config, symbol, currency);
        }
    };

    private checkDiffers = (digit_stats: TDigitStat[], config: TTradeConfig, symbol: string, currency: string) => {
        // Simple logic: Pick least frequent
        const sorted = [...digit_stats].sort((a,b) => a.count - b.count);
        const target = sorted[0].digit;
        if (target !== config.prediction) {
            runInAction(() => config.prediction = target);
        }
        // Always trade differs if running? Or wait for condition?
        // For differs, usually continuous or when prob is low.
        if (sorted[0].percentage < 8) {
             this.executeTrade('DIGITDIFF', target, config, symbol, currency);
        }
    };

    private checkMatches = (digit_stats: TDigitStat[], config: TTradeConfig, symbol: string, currency: string) => {
        const sorted = [...digit_stats].sort((a,b) => b.count - a.count);
        const target = sorted[0].digit;
         if (target !== config.prediction) {
            runInAction(() => config.prediction = target);
        }
        if (sorted[0].percentage > 12) { // Arbitrary threshold
             this.executeTrade('DIGITMATCH', target, config, symbol, currency);
        }
    };

    @action
    executeTrade = async (contract_type: string, prediction: number, config: TTradeConfig, symbol: string, currency: string) => {
        if (this.is_executing) return;
        this.is_executing = true;

        try {
            if (!api_base.api) throw new Error('API not connected');

            const stake = this.calculateStake(config);
            this.addLog(`Buying ${contract_type} ($${stake})`, 'trade');

            const proposal = await api_base.api.send({
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type,
                currency: currency || 'USD',
                duration: config.ticks,
                duration_unit: 't',
                symbol: symbol,
                ...(contract_type.includes('DIGIT') && !['DIGITEVEN', 'DIGITODD'].includes(contract_type) ? { barrier: String(prediction) } : {})
            }) as { error?: { message: string }, proposal?: { id: string } };

            if (proposal.error) throw new Error(proposal.error.message);

            const buy = await api_base.api.send({
                buy: proposal.proposal!.id,
                price: stake
            }) as { error?: { message: string }, buy?: { contract_id: string } };

            if (buy.error) throw new Error(buy.error.message);

            this.trade_status = `TRADING ${contract_type}`;
            
            // Monitor result
            this.monitorTrade(buy.buy!.contract_id, config);

        } catch (e: unknown) {
            console.error(e);
            runInAction(() => {
                const message = (e as Error).message || 'Unknown Error';
                this.addLog(`Error: ${message}`, 'error');
                this.is_executing = false;
                this.trade_status = 'ERROR';
            });
        }
    };

    private monitorTrade = (contract_id: string, config: TTradeConfig) => {
        const check = setInterval(async () => {
            try {
                const data = await api_base.api?.send({ proposal_open_contract: 1, contract_id }) as { proposal_open_contract?: { is_sold: number; profit: number } };
                if (data.proposal_open_contract && data.proposal_open_contract.is_sold) {
                    clearInterval(check);
                    this.handleResult(data.proposal_open_contract, config);
                }
            } catch (e) {
                clearInterval(check);
                runInAction(() => this.is_executing = false);
            }
        }, 1000);
    };

    @action
    handleResult = (contract: { profit: number }, config: TTradeConfig) => {
        const profit = Number(contract.profit);
        const result = profit > 0 ? 'WIN' : 'LOSS';

        this.last_result = result;
        this.session_profit += profit;
        this.total_profit += profit;
        this.is_executing = false;
        
        if (result === 'WIN') {
            this.current_streak = 0;
            this.addLog(`WIN: +${profit.toFixed(2)}`, 'success');
            if (config.take_profit && this.session_profit >= config.take_profit) {
                this.stopAll('TAKE PROFIT HIT');
            }
        } else {
            this.current_streak++;
            this.addLog(`LOSS: ${profit.toFixed(2)}`, 'error');
             if (config.use_max_loss && Math.abs(this.session_profit) >= config.max_loss) {
                this.stopAll('MAX LOSS HIT');
            }
        }
        
        if (config.runs_count !== undefined) config.runs_count++;
        this.trade_status = 'RUNNING';
    };

    @action
    stopAll = (reason: string) => {
         ['even_odd', 'over_under', 'differs', 'matches'].forEach(s => {
            const c = (this as Record<string, unknown>)[`${s}_config`] as TTradeConfig;
            if (c) c.is_running = false;
        });
        this.active_strategy = null;
        this.trade_status = reason;
        this.addLog(reason, 'info');
    };

    private calculateStake = (config: TTradeConfig) => {
        let stake = config.stake;
        if (this.last_result === 'LOSS' && config.use_martingale) {
            stake = stake * Math.pow(config.multiplier, this.current_streak);
        }
        return Number(stake.toFixed(2));
    };
}
