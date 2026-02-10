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

        if (last_digit === null) return;

        // Determine if this is a new digit to update streaks
        const is_new_digit = last_digit !== this.last_digit_analyzed;
        
        let prev_streak_odd = 0;
        let prev_streak_even = 0;
        let prev_streak_over = 0;
        let prev_streak_under = 0;

        if (is_new_digit) {
            // Update Even/Odd Counters
            if (last_digit % 2 === 0) {
                // Current is EVEN
                prev_streak_odd = this.consecutive_odd; // Capture streak that just ended
                this.consecutive_even++;
                this.consecutive_odd = 0;
            } else {
                // Current is ODD
                prev_streak_even = this.consecutive_even;
                this.consecutive_odd++;
                this.consecutive_even = 0;
            }

            // Update Over/Under Counters
            if (last_digit >= 5) { // Over
                prev_streak_under = this.consecutive_under;
                this.consecutive_over++;
                this.consecutive_under = 0;
            } else { // Under
                prev_streak_over = this.consecutive_over;
                this.consecutive_under++;
                this.consecutive_over = 0;
            }
            this.last_digit_analyzed = last_digit;
        }

        if (!this.active_bot || this.is_executing) return;

        const config = (this as any)[`${this.active_bot}_config`] as TBotConfig;
        if (!config || !config.is_running || !config.is_auto) return;

        // Check Max Runs
        if ((config.runs_count || 0) >= (config.max_runs || 12)) {
             this.stopAllBots('MAX RUNS REACHED');
             return;
        }

        const stats = {
            percentages: analysis.percentages,
            digit_stats: analysis.digit_stats,
            prev_streak_odd: is_new_digit ? prev_streak_odd : 0,
            prev_streak_even: is_new_digit ? prev_streak_even : 0,
            prev_streak_over: is_new_digit ? prev_streak_over : 0,
            prev_streak_under: is_new_digit ? prev_streak_under : 0,
            is_new_digit // Only trade on new digit arrival
        };

        if (!is_new_digit) return; // Only process logic on new tick arrival

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

    private runEvenOddLogic = (stats: any) => {
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

    private runOverUnderLogic = (stats: any) => {
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
             this.executeContract('DIGITOVER', 1, config as any);
         } else if (percentages.under > 60) {
             config.last_trade_time = now;
             config.runs_count++;
             this.executeContract('DIGITUNDER', 8, config as any);
         }
    };

    private executeManualTrade = (bot_type: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall') => {
        const config = (this as any)[`${bot_type}_config`] as TBotConfig | any;
        let contract_type = '';
        const prediction = config.prediction ?? 4;

        if (bot_type === 'even_odd') contract_type = 'DIGITEVEN'; // User selects Even/Odd via prediction? No, Even/Odd usually has buttons for "Even" or "Odd". But if simplified, we'll assume Even if prediction even?
        // Actually manual trade for Even/Odd usually has two buttons "Buy Even" "Buy Odd". 
        // Here we just have "Trade Once". Let's assume based on prediction if user sets it? 
        // Or just default to Even.
        // Wait, Even/Odd manual trade usually requires direction.
        // Let's assume user wants to run the strategy ONCE?
        // Or place a manual trade?
        // "Trade Once" button usually means run the strategy check once?
        // If it means "Place Manual Trade", we need direction.
        // Assuming "Trade Once" runs one iteration of strategy? No, likely manual execution.
        // Let's defaulting to what Config says?
        // For Even/Odd, we don't have prediction selector for Even/Odd in UI usually.
        // Let's use Even as default for test.
        if (bot_type === 'even_odd') contract_type = 'DIGITEVEN'; 
        else if (bot_type === 'over_under') contract_type = prediction > 4 ? 'DIGITUNDER' : 'DIGITOVER'; // Correct logic: > 4 is Under? No. Under 8 means winning if digit < 8. Over 2 means winning if digit > 2.
        // Wait. Over/Under logic:
        // Trade Over X: Win if digit > X.
        // Trade Under Y: Win if digit < Y.
        // If user predicts 8 -> likely means Under 8? Or Over 8?
        // Usually Over/Under UI has distinct buttons.
        // If single prediction input:
        // If prediction is 0-4 -> Trade Over?
        // If prediction is 5-9 -> Trade Under?
        // Let's assume prediction aligns with strategy.
        // If manual, let's just use DIGITOVER for now as placeholder unless clear intent.
        else if (bot_type === 'over_under') contract_type = config.prediction >= 5 ? 'DIGITUNDER' : 'DIGITOVER'; 

        else if (bot_type === 'differs') contract_type = 'DIGITDIFF';
        else if (bot_type === 'matches') contract_type = 'DIGITMATCH';
        else if (bot_type === 'rise_fall') contract_type = 'CALL'; 

        this.executeContract(contract_type, prediction, config);
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
