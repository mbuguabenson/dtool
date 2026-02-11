import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { TDigitStat } from './analysis-store';
import RootStore from './root-store';

type TStrategyStats = {
    percentages: { even: number; odd: number; over: number; under: number; rise: number; fall: number };
    digit_stats: TDigitStat[];
    prev_streak_odd: number;
    prev_streak_even: number;
    prev_streak_over: number;
    prev_streak_under: number;
    is_new_digit: boolean;
};

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
// ... existing types ...

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

        // Auto-process ticks when analysis updates
        reaction(
            () => this.root_store.analysis.last_digit,
            (digit) => {
                if (digit !== null) {
                    this.processTick();
                }
            }
        );
    }

    @action
    toggleBot = (bot_type: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall', mode: 'manual' | 'auto') => {
        const configKey = `${bot_type}_config` as keyof SmartAutoStore;
        const config = this[configKey] as unknown as TBotConfig;
        if (config.is_running) {
            runInAction(() => {
                config.is_running = false;
                this.active_bot = null;
                this.bot_status = 'STOPPED';
                this.is_executing = false;
            });
        } else {
            // Stop other bots
            (['even_odd', 'over_under', 'differs', 'matches', 'smart_auto_24', 'rise_fall'] as const).forEach(b => {
                const c = this[`${b}_config` as keyof SmartAutoStore] as unknown as TBotConfig;
                if (c) runInAction(() => { c.is_running = false; });
            });
            runInAction(() => {
                config.is_running = true;
                config.is_auto = mode === 'auto';
                this.active_bot = bot_type;
                this.bot_status = 'RUNNING';
            });
            this.addLog(`Bot started [${bot_type.toUpperCase()}] in ${mode} mode`, 'success');
            
            if (mode === 'manual') {
                this.executeManualTrade(bot_type);
            }
        }
    };

    @action
    updateConfig = <K extends keyof TBotConfig>(bot_type: string, key: K, value: TBotConfig[K]) => {
        const configKey = `${bot_type}_config` as keyof SmartAutoStore;
        const config = this[configKey] as unknown as TBotConfig;
        if (config) {
            config[key] = value;
        }
    };

    @action
    processTick = () => {
        const { analysis } = this.root_store;
        const last_digit = analysis.last_digit;

        if (last_digit === null) return;

        let prev_streak_odd = 0;
        let prev_streak_even = 0;
        let prev_streak_over = 0;
        let prev_streak_under = 0;

        // Update Even/Odd Counters
        if (last_digit % 2 === 0) {
            // Current is EVEN
            if (this.consecutive_odd > 0) {
                prev_streak_odd = this.consecutive_odd;
            }
            this.consecutive_even++;
            this.consecutive_odd = 0;
        } else {
            // Current is ODD
            if (this.consecutive_even > 0) {
                prev_streak_even = this.consecutive_even;
            }
            this.consecutive_odd++;
            this.consecutive_even = 0;
        }

        // Update Over/Under Counters
        if (last_digit >= 5) { // Over
            if (this.consecutive_under > 0) {
                prev_streak_under = this.consecutive_under;
            }
            this.consecutive_over++;
            this.consecutive_under = 0;
        } else { // Under
            if (this.consecutive_over > 0) {
                prev_streak_over = this.consecutive_over;
            }
            this.consecutive_under++;
            this.consecutive_over = 0;
        }

        this.last_digit_analyzed = last_digit as number;

        if (!this.active_bot || this.is_executing) return;

        const configKey = `${this.active_bot}_config` as keyof SmartAutoStore;
        const config = this[configKey] as unknown as TBotConfig;
        if (!config || !config.is_running || !config.is_auto) return;

        // Check Max Runs
        if ((config.runs_count || 0) >= (config.max_runs || 12)) {
             this.stopAllBots('MAX RUNS REACHED');
             return;
        }

        const stats = {
            percentages: analysis.percentages,
            digit_stats: analysis.digit_stats,
            prev_streak_odd,
            prev_streak_even,
            prev_streak_over,
            prev_streak_under,
            is_new_digit: true
        };

        switch (this.active_bot) {
            case 'even_odd':
                this.runEvenOddLogic(stats);
                break;
            case 'over_under':
                this.runOverUnderLogic(stats);
                break;
            case 'differs':
                this.runDiffersLogic(stats.digit_stats);
                break;
            case 'matches':
                this.runMatchesLogic(stats.digit_stats);
                break;
            case 'smart_auto_24':
                this.runSmartAuto24Logic(stats.percentages as { over: number; under: number });
                break;
            case 'rise_fall':
                this.runRiseFallLogic(stats.percentages as { rise: number; fall: number });
                break;
        }
    };

    private runEvenOddLogic = (stats: TStrategyStats) => {
        const config = this.even_odd_config;
        const { percentages, prev_streak_odd, prev_streak_even } = stats;

        // Rule: Highest % is Even -> Wait for 2+ Odd -> Even appears -> Trade Even
        if (percentages.even > 55) {
            // Check if we just had an ODD streak of >= 2, and now we carry on with EVEN (current digit is Even)
            // consecutive_even is mostly likely 1 right now if we just switched.
            if (this.consecutive_even >= 1 && prev_streak_odd >= 2) {
                this.addLog(`Trigger: EVEN Strong (${percentages.even.toFixed(1)}%) & ${prev_streak_odd} consecutive ODDs ended.`, 'info');
                this.executeContract('DIGITEVEN', 0, config);
            }
        }
        // Rule: Highest % is Odd -> Wait for 2+ Even -> Odd appears -> Trade Odd
        else if (percentages.odd > 55) {
            if (this.consecutive_odd >= 1 && prev_streak_even >= 2) {
                this.addLog(`Trigger: ODD Strong (${percentages.odd.toFixed(1)}%) & ${prev_streak_even} consecutive EVENs ended.`, 'info');
                this.executeContract('DIGITODD', 0, config);
            }
        }
    };

    private runOverUnderLogic = (stats: TStrategyStats) => {
        const config = this.over_under_config;
        const { percentages, prev_streak_over, prev_streak_under } = stats;
        
        // Rule: Under > 55% -> Suggest Under 6-9 -> Wait for 2+ Over -> Under appears -> Trade Under
        if (percentages.under > 55) {
             // Config prediction should be set by user or default. If user sets it, respect it.
             // If prediction is low (0-4), it's contradicting the strategy "Trade Under 6-9".
             // The prompt says "suggest to user". Assuming user set it or we force strict rule?
             // Prompt says "makesure to place correct prediction". I will force prediction if not set correctly or just use config.
             // Let's use config.prediction if it's safe (6,7,8,9). If < 6, default to 8.
             let prediction = config.prediction;
             if (prediction < 6) prediction = 8; // Default safe Under prediction

             if (this.consecutive_under >= 1 && prev_streak_over >= 2) {
                 this.addLog(`Trigger: UNDER Strong (${percentages.under.toFixed(1)}%) & ${prev_streak_over} consecutive OVERs ended. Trading UNDER ${prediction}.`, 'info');
                 this.executeContract('DIGITUNDER', prediction, config);
             }
        }
        // Rule: Over > 55% -> Suggest Over 0-3 -> Wait for 2+ Under -> Over appears -> Trade Over
        else if (percentages.over > 55) {
             let prediction = config.prediction;
             if (prediction > 3) prediction = 1; // Default safe Over prediction

             if (this.consecutive_over >= 1 && prev_streak_under >= 2) {
                 this.addLog(`Trigger: OVER Strong (${percentages.over.toFixed(1)}%) & ${prev_streak_under} consecutive UNDERs ended. Trading OVER ${prediction}.`, 'info');
                 this.executeContract('DIGITOVER', prediction, config);
             }
        }
    };

    private runDiffersLogic = (digit_stats: TDigitStat[]) => {
        const config = this.differs_config;
        
        // Rule: Select 2-7. Not Highest, 2nd, Least. < 10%. Decreasing.
        const sortedStats = [...digit_stats].sort((a,b) => b.count - a.count); // Sort by frequency (count)
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
            // Select best: The one with lowest percentage
            const target = eligible.sort((a,b) => a.percentage - b.percentage)[0];
            
            // Auto Update Prediction
            if (config.prediction !== target.digit) {
                this.updateConfig('differs', 'prediction', target.digit);
            }

            this.addLog(`Differ Trigger: Digit ${target.digit} prob < 10% & decreasing.`, 'info');
            this.executeContract('DIGITDIFF', target.digit, config);
        }
    };

    private runMatchesLogic = (digit_stats: TDigitStat[]) => {
        const config = this.matches_config;
        
        // Rule: Select Highest, 2nd, or Least. Increasing.
        const sortedStats = [...digit_stats].sort((a,b) => b.count - a.count);
        const candidates = [sortedStats[0], sortedStats[1], sortedStats[9]];
        
        const validCandidates = candidates.filter(s => s.is_increasing);
        
        if (validCandidates.length > 0) {
            // Pick strongest (highest count)
            const target = validCandidates.sort((a,b) => b.count - a.count)[0];
            
            // Auto Update Prediction
            if (config.prediction !== target.digit) {
                this.updateConfig('matches', 'prediction', target.digit);
            }

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

    private runSmartAuto24Logic = (percentages: { over: number; under: number }) => {
        // Logic same as previously defined or simplified for brevity as user focused on others
        const config = this.smart_auto_24_config;
        if (config.runs_count >= config.max_runs) {
             this.stopAllBots('MAX RUNS REACHED');
             return;
        }
        const now = Date.now();
        if (now - config.last_trade_time < 3600000) return;

         if (percentages.over > 60) {
             config.last_trade_time = now;
             config.runs_count++;
             this.executeContract('DIGITOVER', 1, config as unknown as TBotConfig);
         } else if (percentages.under > 60) {
             config.last_trade_time = now;
             config.runs_count++;
             this.executeContract('DIGITUNDER', 8, config as unknown as TBotConfig);
         }
    };

    private executeManualTrade = (bot_type: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall') => {
        const configKey = `${bot_type}_config` as keyof SmartAutoStore;
        const config = this[configKey] as unknown as TBotConfig;
        let contract_type = '';
        const prediction = config.prediction ?? 4;

        switch (bot_type) {
            case 'even_odd':
                contract_type = 'DIGITEVEN';
                break;
            case 'over_under':
                contract_type = prediction >= 5 ? 'DIGITUNDER' : 'DIGITOVER';
                break;
            case 'smart_auto_24':
                contract_type = 'DIGITOVER';
                break;
            case 'differs':
                contract_type = 'DIGITDIFF';
                break;
            case 'matches':
                contract_type = 'DIGITMATCH';
                break;
            case 'rise_fall':
                contract_type = 'CALL';
                break;
        }

        this.executeContract(contract_type, prediction, config);
        setTimeout(() => runInAction(() => { 
            config.is_running = false; 
            this.active_bot = null; 
        }), 1000);
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
                const poc = await apiBaseInstance.api?.send({ proposal_open_contract: 1, contract_id: (res.buy as { contract_id: string }).contract_id }) as { proposal_open_contract?: Record<string, unknown> };
                if (poc.proposal_open_contract) {
                    this.handleResult(poc.proposal_open_contract, config);
                }
                runInAction(() => { this.is_executing = false; });
            }, (config.ticks * 1000) + 2000);

        } catch (error: unknown) {
            console.error('SmartAuto Error:', JSON.stringify(error, null, 2));
            runInAction(() => {
                const err = error as { error?: { message?: string }, message?: string };
                const errorMessage = err?.error?.message || err?.message || 'Unknown error';
                this.bot_status = `ERROR: ${errorMessage}`;
                this.addLog(`Error: ${errorMessage}`, 'error');
                this.is_executing = false;
            });
        }
    };

    private handleResult = (contract: Record<string, unknown>, config: TBotConfig) => {
        const profit = parseFloat(contract.profit as string || '0');
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
                const exit_tick = contract.exit_tick;
                const exit_price = String(exit_tick);
                const exit_digit = exit_price[exit_price.length - 1];
                const prediction_val = config.prediction;
                const contract_type = contract.contract_type;

                let log_detail = '';
                if (contract_type === 'DIGITEVEN') log_detail = `Predicted EVEN, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITODD') log_detail = `Predicted ODD, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITOVER') log_detail = `Predicted OVER ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITUNDER') log_detail = `Predicted UNDER ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITMATCH') log_detail = `Predicted MATCH ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITDIFF') log_detail = `Predicted DIFF ${prediction_val}, Exit Digit: ${exit_digit}`;

                this.addLog(`Trade WON: +$${profit.toFixed(2)} | ${log_detail} [Session: ${this.session_profit.toFixed(2)}]`, 'success');
                
                if (config.take_profit && this.session_profit >= config.take_profit) {
                     this.addLog(`Take Profit Reached ($${config.take_profit}). Stopping bot.`, 'success');
                     this.stopAllBots('TAKE PROFIT HIT');
                }
            } else {
                this.session_profit += profit; // profit is negative on loss
                this.total_profit += profit;
                this.current_streak++;
                const exit_tick = contract.exit_tick;
                const exit_price = String(exit_tick);
                const exit_digit = exit_price[exit_price.length - 1];
                const prediction_val = config.prediction;
                const contract_type = contract.contract_type;
                
                let log_detail = '';
                if (contract_type === 'DIGITEVEN') log_detail = `Predicted EVEN, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITODD') log_detail = `Predicted ODD, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITOVER') log_detail = `Predicted OVER ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITUNDER') log_detail = `Predicted UNDER ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITMATCH') log_detail = `Predicted MATCH ${prediction_val}, Exit Digit: ${exit_digit}`;
                else if (contract_type === 'DIGITDIFF') log_detail = `Predicted DIFF ${prediction_val}, Exit Digit: ${exit_digit}`;

                this.addLog(`Trade LOST: -$${Math.abs(profit).toFixed(2)} | ${log_detail} [Streak: ${this.current_streak}]`, 'error');

                if (config.use_max_loss && Math.abs(this.session_profit) >= config.max_loss) {
                    this.addLog(`Max Loss Limit Reached ($${config.max_loss}). Stopping bot.`, 'error');
                    this.stopAllBots('MAX LOSS HIT');
                    if (config.switch_condition) {
                        this.switchMarket(config === (this.smart_auto_24_config as unknown as TBotConfig));
                    }
                }
            }
        });
    };

    private stopAllBots = (reason: string) => {
        const bot_types = ['even_odd', 'over_under', 'differs', 'matches', 'smart_auto_24', 'rise_fall'] as const;
        bot_types.forEach(b => {
            const config = (this as any)[`${b}_config`] as TBotConfig | undefined;
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
        if (config.use_compounding && this.session_profit > 0 && this.last_result === 'WIN') {
            base_stake = config.stake + this.session_profit;
        }

        // Handle Martingale (Compound Loss)
        if (this.last_result === 'LOSS' && config.use_martingale) {
            base_stake = base_stake * Math.pow(config.multiplier, this.current_streak);
        }
        
        // Ensure max 2 decimal places to prevent API errors
        return parseFloat(base_stake.toFixed(2));
    };
}
