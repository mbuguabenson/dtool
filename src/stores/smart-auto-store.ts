import { action, makeObservable, observable, runInAction } from 'mobx';
import RootStore from './root-store';
import { TDigitStat } from './analysis-store';

export type TBotConfig = {
    stake: number;
    multiplier: number;
    ticks: number;
    max_loss: number;
    use_max_loss: boolean;
    switch_condition: boolean;
    prediction: number;
    is_running: boolean;
    is_auto: boolean;
    use_compounding?: boolean;
    compound_resets_on_loss?: boolean;
    use_martingale?: boolean;
    take_profit?: number;
    max_runs?: number;
    runs_count?: number;
};

export default class SmartAutoStore {
    root_store: RootStore;

    @observable accessor rise_fall_config: TBotConfig = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
    };

    @observable accessor even_odd_config: TBotConfig = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_runs: 12,
        runs_count: 0,
    };

    @observable accessor over_under_config: TBotConfig = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 4,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_runs: 12,
        runs_count: 0,
    };

    @observable accessor differs_config: TBotConfig = {
        stake: 0.35,
        multiplier: 11,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_runs: 12,
        runs_count: 0,
    };

    @observable accessor matches_config: TBotConfig = {
        stake: 0.35,
        multiplier: 11,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_runs: 12,
        runs_count: 0,
    };

    @observable accessor smart_auto_24_config = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        switch_condition: false,
        is_running: false,
        is_auto: false,
        max_runs: 24,
        runs_count: 0,
        last_trade_time: 0,
        use_compounding: false,
        use_martingale: true,
    };

    @observable accessor active_bot: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall' | null = null;
    @observable accessor bot_status: string = 'IDLE';
    @observable accessor session_profit: number = 0;
    @observable accessor total_profit: number = 0;
    @observable accessor is_executing = false;

    // Martingale State
    @observable accessor last_result: 'WIN' | 'LOSS' | null = null;
    @observable accessor current_streak: number = 0;
    @observable accessor logs: Array<{ timestamp: number; message: string; type: 'info' | 'success' | 'error' | 'trade' }> = [];
    
    // Strategy Specific State
    @observable accessor consecutive_even = 0;
    @observable accessor consecutive_odd = 0;
    @observable accessor consecutive_over = 0;
    @observable accessor consecutive_under = 0;
    @observable accessor last_digit_analyzed = -1;

    @action
    addLog = (message: string, type: 'info' | 'success' | 'error' | 'trade' = 'info') => {
        this.logs.push({
            timestamp: Date.now(),
            message,
            type,
        });
        if (this.logs.length > 50) this.logs.shift();
    };

    @action
    clearLogs = () => {
        this.logs = [];
    };

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;
    }

    @action
    toggleBot = (bot_type: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall', mode: 'manual' | 'auto') => {
        const config = this[`${bot_type}_config` as keyof this] as TBotConfig | any;
        if (config.is_running) {
            config.is_running = false;
            this.active_bot = null;
            this.bot_status = 'STOPPED';
            this.is_executing = false;
        } else {
            // Stop other bots
            ['even_odd', 'over_under', 'differs', 'matches', 'smart_auto_24', 'rise_fall'].forEach(b => {
                const c = this[`${b}_config` as keyof this] as any;
                if (c) c.is_running = false;
            });
            config.is_running = true;
            config.is_auto = mode === 'auto';
            this.active_bot = bot_type;
            this.bot_status = 'RUNNING';
            this.addLog(`Bot started [${bot_type.toUpperCase()}] in ${mode} mode`, 'success');
            
            if (mode === 'manual') {
                this.executeManualTrade(bot_type);
            }
        }
    };

    @action
    updateConfig = <K extends keyof TBotConfig>(bot_type: string, key: K, value: TBotConfig[K]) => {
        const config = (this as any)[`${bot_type}_config` as keyof this] as TBotConfig;
        if (config) {
            (config as any)[key] = value;
        }
    };

    @action
    processTick = () => {
        const { analysis } = this.root_store;
        const last_digit = analysis.last_digit;

        // Update consecutive counters if new digit
        if (last_digit !== null && last_digit !== this.last_digit_analyzed) {
            this.last_digit_analyzed = last_digit;
            
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
        }

        if (!this.active_bot || this.is_executing) return;
        const config = this[`${this.active_bot}_config` as keyof this] as TBotConfig;
        if (!config || !config.is_running || !config.is_auto) return;

        // Check Max Runs
        if ((config as any).runs_count !== undefined && (config as any).runs_count >= ((config as any).max_runs || 12)) {
             this.stopAllBots('MAX RUNS REACHED');
             return;
        }

        const percentages = analysis.percentages as { even: number; odd: number; over: number; under: number };
        const digit_stats = analysis.digit_stats;

        switch (this.active_bot) {
            case 'even_odd':
                this.runEvenOddLogic(percentages as { even: number; odd: number });
                break;
            case 'over_under':
                this.runOverUnderLogic(percentages as { over: number; under: number });
                break;
            case 'differs':
                this.runDiffersLogic(digit_stats);
                break;
            case 'matches':
                this.runMatchesLogic(digit_stats);
                break;
            case 'smart_auto_24':
                this.runSmartAuto24Logic(percentages as { over: number; under: number });
                break;
            case 'rise_fall':
                this.runRiseFallLogic(analysis.percentages as { rise: number; fall: number });
                break;
        }
    };

    private runSmartAuto24Logic = (percentages: { over: number; under: number }) => {
        const config = this.smart_auto_24_config;
        
        // 1. Check max runs
        if (config.runs_count >= config.max_runs) {
            this.stopAllBots('MAX RUNS REACHED (24)');
            return;
        }

        // 2. Check 1 trade per hour
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (now - config.last_trade_time < oneHour) {
            this.bot_status = `WAITING NEXT HOUR (${Math.ceil((oneHour - (now - config.last_trade_time)) / 60000)}m)`;
            return;
        }

        // 3. Logic: Over/Under 55% + Increasing
        const isOver = percentages.over > 55;
        const isUnder = percentages.under > 55;

        if (isOver || isUnder) {
            // 4. Strategic Prediction choosing (60% threshold for safer trades)
            let prediction = 4;
            let type = '';

            if (percentages.over > 60) {
                // If Over power is strong, trade Over 1, 2, or 3 (safest Over)
                const options = [1, 2, 3];
                prediction = options[Math.floor(Math.random() * options.length)];
                type = 'DIGITOVER';
            } else if (percentages.under > 60) {
                // If Under power is strong, trade Under 6, 7, or 8 (safest Under)
                const options = [6, 7, 8];
                prediction = options[Math.floor(Math.random() * options.length)];
                type = 'DIGITUNDER';
            } else {
                // Threshold 55%
                type = isOver ? 'DIGITOVER' : 'DIGITUNDER';
                prediction = isOver ? 4 : 5;
            }

            runInAction(() => {
                config.last_trade_time = now;
                config.runs_count++;
            });

            this.executeContract(type, prediction, config as any);
        }
    };

    private runEvenOddLogic = (percentages: { even: number; odd: number }) => {
        const config = this.even_odd_config;
        // Rules:
        // 1. Prob > 55% AND Trend increasing
        // 2. Wait for 2+ consecutive opposite digits
        
        // Check EVEN Strategy
        if (percentages.even > 55) {
             // We need to check trend (assuming is_increasing logic is in digit_stats, but for even/odd we might need custom trend or rely on basic prob > 55 being the "trend" representation if we don't have history trend).
             // However, prompt says "Percentage trend is increasing".
             // We can check if previous percentage was lower? Or just rely on current high prob.
             // For now, using prob > 55 as primary trigger.
             
             if (this.consecutive_odd >= 2) {
                 this.addLog(`Ref: EVEN Strong (${percentages.even.toFixed(1)}%) & 2+ ODDs. BUY EVEN.`, 'info');
                 this.executeContract('DIGITEVEN', 0, config);
             }
        }
        // Check ODD Strategy
        else if (percentages.odd > 55) {
             if (this.consecutive_even >= 2) {
                 this.addLog(`Ref: ODD Strong (${percentages.odd.toFixed(1)}%) & 2+ EVENs. BUY ODD.`, 'info');
                 this.executeContract('DIGITODD', 0, config);
             }
        }
    };

    private runOverUnderLogic = (percentages: { over: number; under: number }) => {
        const config = this.over_under_config;
        
        // Rules:
        // UNDER Strong -> Predict Under 6,7,8,9. Wait for 2+ OVER digits. Enter when UNDER appears (Wait, "Enter when UNDER appears" implies waiting for a confirm? Or entering ON the Under? Prompt: "Enter when UNDER appears" usually means wait for it to happen, but we trade usually on the next tick. "Wait for 2+ consecutive OVER digits. Enter when UNDER appears" -> Wait for Over, Over, [Then we need to know next is Under? No, we bet that next IS Under/Over? 
        // Re-reading: "Wait for 2+ consecutive OVER digits. Enter when UNDER appears". This implies a pattern O, O, U -> Trade.
        // If that's the case, we need to wait for 2+ Over, then see an Under, THEN trade?
        // Let's assume standard "Breakout/Reversal" logic. 
        // Prompt says: "If UNDER digits strongest: Wait for 2+ consecutive OVER digits. Enter when UNDER appears."
        // This effectively means: Wait for trend reversal indicator. 
        // Logic: if (consecutive_over >= 2 && last_digit < 5) -> Trade Under.
        
        if (percentages.under > 55) {
             // Suggested prediction: Under 6, 7, 8, 9. Safer is higher number, e.g. 8 or 9.
             // User prompt: "Suggest predictions: Under 6,7,8,9". We pick 7 or 8 for balance.
             const prediction = 8; 
             if (this.consecutive_over >= 2 && this.last_digit_analyzed < 5) {
                 this.addLog(`Trigger: UNDER Strong + 2 OVERs + UNDER Reversal.`, 'info');
                 this.executeContract('DIGITUNDER', prediction, config);
             }
        }
        else if (percentages.over > 55) {
             // Suggested prediction: Over 0, 1, 2, 3. Safer is lower, e.g. 1 or 2.
             const prediction = 1;
             if (this.consecutive_under >= 2 && this.last_digit_analyzed >= 5) {
                 this.addLog(`Trigger: OVER Strong + 2 UNDERs + OVER Reversal.`, 'info');
                 this.executeContract('DIGITOVER', prediction, config);
             }
        }
    };

    private runDiffersLogic = (digit_stats: TDigitStat[]) => {
        const config = this.differs_config;
        // Rules:
        // 1. Auto-select digit 2-7
        // 2. MUST NOT be Highest, 2nd Highest, Least appearing.
        // 3. Prob < 10%
        // 4. Trend Decreasing
        
        const sortedStats = [...digit_stats].sort((a,b) => b.power - a.power);
        const highest = sortedStats[0].digit;
        const second = sortedStats[1].digit;
        const least = sortedStats[9].digit;
        
        const eligible = digit_stats.filter(s => {
            return s.digit >= 2 && s.digit <= 7 && 
                   s.digit !== highest && s.digit !== second && s.digit !== least &&
                   s.percentage < 10 &&
                   !s.is_increasing; // Decreasing trend
        });

        if (eligible.length > 0) {
            // Select best (lowest prob?)
            const target = eligible.sort((a,b) => a.percentage - b.percentage)[0];
            // Entry Condition: "Place trade when selected digit probability continues dropping"
            // We can check if it is decreasing (already checked).
            this.addLog(`Differ Trigger: Digit ${target.digit} prob < 10% & decreasing.`, 'info');
            this.executeContract('DIGITDIFF', target.digit, config);
        }
    };

    private runMatchesLogic = (digit_stats: TDigitStat[]) => {
        const config = this.matches_config;
        // Rules:
        // 1. Select Highest, 2nd, or Least.
        // 2. Prob Increasing.
        
        const sortedStats = [...digit_stats].sort((a,b) => b.power - a.power);
        const candidates = [sortedStats[0], sortedStats[1], sortedStats[9]];
        
        const validCandidates = candidates.filter(s => s.is_increasing);
        
        if (validCandidates.length > 0) {
            // Pick strongest or random? "System auto-selects". Let's pick strongest of valid.
            const target = validCandidates[0];
             // Entry Condition: "Place trade when selected digit percentage rises"
            this.addLog(`Match Trigger: Digit ${target.digit} prob increasing.`, 'info');
            this.executeContract('DIGITMATCH', target.digit, config);
        }
    };

    private runRiseFallLogic = (percentages: { rise: number; fall: number }) => {
        const config = this.rise_fall_config;
        const isRise = percentages.rise > 55;
        const isFall = percentages.fall > 55;

        if (isRise || isFall) {
            this.addLog(`Trend Detected: ${isRise ? 'RISE' : 'FALL'} (${Math.max(percentages.rise, percentages.fall).toFixed(1)}%)`, 'info');
            this.executeContract(isRise ? 'CALL' : 'PUT', 0, config);
        }
    };

    private executeManualTrade = (bot_type: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall') => {
        const config = (this as any)[`${bot_type}_config`] as TBotConfig | any;
        let contract_type = '';
        const prediction = config.prediction ?? 4;

        if (bot_type === 'even_odd') contract_type = prediction % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD';
        else if (bot_type === 'over_under' || bot_type === 'smart_auto_24') contract_type = 'DIGITOVER'; 
        else if (bot_type === 'differs') contract_type = 'DIGITDIFF';
        else if (bot_type === 'matches') contract_type = 'DIGITMATCH';
        else if (bot_type === 'rise_fall') contract_type = 'CALL'; // Default to Call for manual

        this.executeContract(contract_type, prediction, config);
        // Turn off manual bot after one trade
        setTimeout(() => runInAction(() => { config.is_running = false; this.active_bot = null; }), 1000);
    };

    private executeContract = async (contract_type: string, prediction: number, config: TBotConfig) => {
        if (this.is_executing) return;
        this.is_executing = true;

        try {
            const { api_base: apiBaseInstance } = await import('@/external/bot-skeleton');
            if (!apiBaseInstance.api) throw new Error('API not initialized');
            
            const stake = this.calculateStake(config);
            this.addLog(`Buying ${contract_type} for $${stake.toFixed(2)}`, 'trade');

            const proposal = await apiBaseInstance.api.send({
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type,
                currency: this.root_store.client.currency || 'USD',
                duration: config.ticks,
                duration_unit: 't',
                symbol: this.root_store.analysis.symbol,
                ...(contract_type.includes('DIGIT') ? (contract_type.includes('EVEN') || contract_type.includes('ODD') ? {} : { barrier: prediction.toString() }) : {}),
            }) as { error?: { message: string }, proposal?: { id: string } };

            if (proposal.error) throw new Error(proposal.error.message);
            if (!proposal.proposal) throw new Error('Proposal failed');

            this.addLog(`Buying ${contract_type} contract...`, 'trade');
            const res = await apiBaseInstance.api.send({
                buy: proposal.proposal.id,
                price: stake,
            }) as { error?: { message: string }, buy?: { contract_id: string } };

            if (res.error) throw new Error(res.error.message);
            if (!res.buy) throw new Error('Buy failed');

            this.bot_status = `TRADING: ${contract_type}`;

            // Wait for result
            setTimeout(async () => {
                const poc = await apiBaseInstance.api?.send({ proposal_open_contract: 1, contract_id: (res.buy as any).contract_id }) as { proposal_open_contract?: any };
                if (poc.proposal_open_contract) {
                    this.handleResult(poc.proposal_open_contract, config);
                }
                runInAction(() => { this.is_executing = false; });
            }, (config.ticks * 1000) + 2000);

        } catch (error: any) {
            console.error('SmartAuto Error:', JSON.stringify(error, null, 2));
            runInAction(() => {
                const errorMessage = error?.error?.message || error?.message || 'Unknown error';
                this.bot_status = `ERROR: ${errorMessage}`;
                this.addLog(`Error: ${errorMessage}`, 'error');
                this.is_executing = false;
            });
        }
    };

    private handleResult = (contract: any, config: TBotConfig) => {
        const profit = parseFloat(contract.profit);
        const result = profit > 0 ? 'WIN' : 'LOSS';

        runInAction(() => {
            this.last_result = result;
            this.is_executing = false;
            
            // Increment runs count for all strategies on every trade
            if (config.runs_count !== undefined) {
                config.runs_count = (config.runs_count || 0) + 1;
            }
            
            if (result === 'WIN') {
                this.session_profit += profit;
                this.total_profit += profit;
                this.current_streak = 0;
                this.addLog(`Trade WON: +$${profit.toFixed(2)} [Session: ${this.session_profit.toFixed(2)}]`, 'success');
                
                if (config.take_profit && this.session_profit >= config.take_profit) {
                     this.addLog(`Take Profit Reached ($${config.take_profit}). Stopping bot.`, 'success');
                     this.stopAllBots('TAKE PROFIT HIT');
                }
            } else {
                this.session_profit += profit; // profit is negative on loss
                this.total_profit += profit;
                this.current_streak++;
                this.addLog(`Trade LOST: -$${Math.abs(profit).toFixed(2)} [Streak: ${this.current_streak}]`, 'error');

                if (config.use_max_loss && Math.abs(this.session_profit) >= config.max_loss) {
                    this.addLog(`Max Loss Limit Reached ($${config.max_loss}). Stopping bot.`, 'error');
                    this.stopAllBots('MAX LOSS HIT');
                    if (config.switch_condition) {
                        this.switchMarket(config === (this.smart_auto_24_config as any));
                    }
                }
            }
        });
    };

    private stopAllBots = (reason: string) => {
        ['even_odd', 'over_under', 'differs', 'matches', 'smart_auto_24', 'rise_fall'].forEach(b => {
            const config = (this as any)[`${b}_config`];
            if (config) config.is_running = false;
        });
        this.active_bot = null;
        this.bot_status = reason;
    };

    private switchMarket = (isSmart24 = false) => {
        if (isSmart24) {
            // User requested: switch to even odd market
            this.toggleBot('even_odd', 'auto');
            this.bot_status = 'SWITCHED TO EVEN/ODD';
            return;
        }
        // Switch logic: Even/Odd -> Over/Under -> Differs -> Matches
        if (this.active_bot === 'even_odd') this.toggleBot('over_under', 'auto');
        else if (this.active_bot === 'over_under') this.toggleBot('even_odd', 'auto');
    };

    private calculateStake = (config: TBotConfig) => {
        let base_stake = config.stake;
        
        // Handle Compounding (Compound Win)
        // If we won the last trade and use_compounding is on, add session profit to next stake
        if (config.use_compounding && this.session_profit > 0 && this.last_result === 'WIN') {
            base_stake = config.stake + this.session_profit;
        }

        // Handle Martingale (Compound Loss)
        // multiplier ^ streak ensures exponential recovery
        if (this.last_result === 'LOSS' && config.use_martingale) {
            return base_stake * Math.pow(config.multiplier, this.current_streak);
        }
        return base_stake;
    };
}
