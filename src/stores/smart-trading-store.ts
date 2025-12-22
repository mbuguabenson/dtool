import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { DBOT_TABS } from '@/constants/bot-contents';
import { contract_stages } from '@/constants/contract-stage';
import { ApiHelpers, api_base, observer as globalObserver } from '@/external/bot-skeleton';
import AnalysisEngine from '@/lib/analysis-engine';
import {
    HotColdData,
    PredictionResult,
    RiskMetrics,
    SmartPredictor,
    TradingSignal,
} from '@/lib/analysis/smart-predictions';
import { VSenseEngine, VSenseSignal } from '@/lib/analysis/v-sense-engine';
import RootStore from './root-store';

type TDerivResponse = {
    proposal_open_contract?: {
        is_sold?: boolean;
        status?: string;
        profit?: string;
        contract_id?: number | string;
    };
    subscription?: { id: string };
    error?: { message: string; code: string };
    buy?: { contract_id: string | number };
    proposal?: { id: string };
};

export type TSmartSubtab = 'speed' | 'bulk' | 'automated' | 'analysis' | 'even_odd' | 'over_under' | 'advanced_ou' | 'differs' | 'matches' | 'charts' | 'turbo' | 'vsense_turbo';

export type TSmartDigitStat = {
    digit: number;
    count: number;
    percentage: number;
};

export interface TStrategy {
    id: string;
    name: string;
    contractTypes: string[];
    defaultMultiplier?: number;
    payout: number;
    minConfidence: number;
    description: string;
    is_active: boolean;
    status: string;
    stake: number;
    martingale: number;
    current_stake: number;
    ticks: number;
    barrier?: { over: number; under: number } | number;
    check_last_x?: number;
    target_pattern?: string;
    target_side?: string;
    threshold_pct?: number;
    condition?: string;
    threshold_val?: number;
    target_type?: string;
    target_digit?: number;
    trade_type?: string;
    prediction?: number;
}

export type TTradeHistory = {
    timestamp: number;
    contractType: string;
    stake: number;
    result: 'WON' | 'LOST';
    profitLoss: number;
};

export default class SmartTradingStore {
    root_store: RootStore;

    @observable accessor is_speedbot_running = false;
    @observable accessor speedbot_contract_type: string = 'DIGITEVEN';
    @observable accessor speedbot_prediction: number = 0;
    @observable accessor speedbot_stake: number = 0.5;

    // Martingale Settings
    @observable accessor use_martingale = false;
    @observable accessor martingale_multiplier = 2.0;
    @observable accessor max_stake_limit = 100;
    @observable accessor is_max_stake_enabled = false;

    // TP/SL Settings
    @observable accessor enable_tp_sl = false;
    @observable accessor take_profit = 10;
    @observable accessor stop_loss = 10;
    @observable accessor max_consecutive_losses = 5;
    @observable accessor is_max_loss_enabled = false;

    // Notifications
    @observable accessor sound_notifications = true;

    // Bot Logic (Toggles)
    @observable accessor alternate_even_odd = false;
    @observable accessor alternate_on_loss = false;
    @observable accessor recovery_mode = false;

    // Session Stats
    @observable accessor ticks_processed = 0;
    @observable accessor wins = 0;
    @observable accessor losses = 0;
    @observable accessor session_pl = 0;
    @observable accessor current_streak = 0;
    @observable accessor current_stake = 0.5;
    @observable accessor consecutive_losses = 0;
    @observable accessor max_drawdown = 0;
    @observable accessor trade_history: TTradeHistory[] = [];
    @observable accessor is_smart_auto24_running = false;
    @observable accessor smart_auto24_strategy: string = 'EVENODD';

    @observable accessor digit_stats: TSmartDigitStat[] = Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
    }));

    @observable accessor first_digit_stats: TSmartDigitStat[] = Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
    }));

    @observable accessor ticks: number[] = [];
    @observable accessor tick_count = 1; // Number of ticks to wait before trade
    @observable accessor symbol = 'R_100';
    @observable accessor current_price: string | number = '0.00';
    @observable accessor last_digit: number | null = null;
    @observable accessor is_connected = false;
    @observable accessor markets: { group: string; items: { value: string; label: string }[] }[] = [];
    @observable accessor active_symbols_data: Record<string, { pip: number; symbol: string }> = {};

    // V-SENSE™ TurboExec Bot State
    @observable accessor is_turbo_bot_running: boolean = false;
    @observable accessor turbo_bot_state: 'STOPPED' | 'LISTENING' | 'SETUP' | 'CONFIRMING' | 'EXECUTING' | 'COOLDOWN' = 'STOPPED';
    @observable accessor turbo_settings = {
        max_risk: 0.05,
        is_bulk_enabled: false,
        min_confidence: 60,
    };
    @observable accessor turbo_cooldown_ticks: number = 0;
    @observable accessor turbo_last_signal: string = '';

    @observable accessor active_subtab: TSmartSubtab = 'speed';
    @observable accessor v_sense_signals: VSenseSignal[] = [];
    @observable accessor number_of_contracts = 1;
    @observable accessor is_bulk_trading = false;

    // Smart Analysis State
    @observable accessor smart_analysis_data: {
        predictions: PredictionResult[];
        hotCold: HotColdData;
        risk: RiskMetrics;
        signal: TradingSignal;
    } | null = null;

    private analysis_engine = new AnalysisEngine(100);

    // Automated Strategies State
    @observable accessor strategies: Record<string, TStrategy> = {
        EVENODD: {
            id: 'EVENODD',
            name: 'Even/Odd',
            contractTypes: ['DIGITEVEN', 'DIGITODD'],
            defaultMultiplier: 2.1,
            payout: 1.95,
            minConfidence: 56,
            description: 'Trade even vs odd digits',
            is_active: false,
            status: 'idle',
            stake: 1.0,
            martingale: 2.1,
            current_stake: 1.0,
            ticks: 1,
        },
        OVER3UNDER6: {
            id: 'OVER3UNDER6',
            name: 'Over 3 / Under 6',
            contractTypes: ['DIGITOVER', 'DIGITUNDER'],
            defaultMultiplier: 2.6,
            payout: 2.5,
            minConfidence: 52,
            barrier: { over: 3, under: 6 },
            description: 'Trade digits over 3 or under 6',
            is_active: false,
            status: 'idle',
            stake: 1.0,
            martingale: 2.6,
            current_stake: 1.0,
            ticks: 1,
        },
        OVER2UNDER7: {
            id: 'OVER2UNDER7',
            name: 'Over 2 / Under 7',
            contractTypes: ['DIGITOVER', 'DIGITUNDER'],
            defaultMultiplier: 3.5,
            payout: 3.2,
            minConfidence: 48,
            barrier: { over: 2, under: 7 },
            description: 'Trade digits over 2 or under 7',
            is_active: false,
            status: 'idle',
            stake: 1.0,
            martingale: 3.5,
            current_stake: 1.0,
            ticks: 1,
        },
        MATCHES: {
            id: 'MATCHES',
            name: 'Digit Matches',
            contractTypes: ['DIGITMATCH'],
            defaultMultiplier: 10,
            payout: 9.5,
            minConfidence: 15,
            description: 'Predict exact digit match',
            is_active: false,
            status: 'idle',
            stake: 1.0,
            martingale: 10,
            current_stake: 1.0,
            ticks: 1,
        },
        DIFFERS: {
            id: 'DIFFERS',
            name: 'Digit Differs',
            contractTypes: ['DIGITDIFF'],
            defaultMultiplier: 1.1,
            payout: 1.08,
            minConfidence: 85,
            description: 'Predict digit will NOT match',
            is_active: false,
            status: 'idle',
            stake: 1.0,
            martingale: 1.1,
            current_stake: 1.0,
            ticks: 1,
        },
    };

    // Strategy States
    @observable accessor consecutive_even = 0;
    @observable accessor consecutive_odd = 0;
    @observable accessor dominance: 'EVEN' | 'ODD' | 'NEUTRAL' = 'NEUTRAL';
    @observable accessor is_executing = false;

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;

        reaction(
            () => this.root_store.common?.is_socket_opened,
            is_socket_opened => {
                this.is_connected = !!is_socket_opened;
                if (is_socket_opened) {
                    this.fetchMarkets();
                }
            },
            { fireImmediately: true }
        );

        reaction(
            () => this.root_store.dashboard.active_tab,
            active_tab => {
                if (active_tab === DBOT_TABS.SMART_AUTO24) {
                    this.setActiveSubtab('automated');
                } else if (active_tab === DBOT_TABS.SMART_TRADING && this.active_subtab === 'automated') {
                    this.setActiveSubtab('speed');
                }
            }
        );
    }

    @action
    updateDigitStats = (last_digits: number[], price?: string | number) => {
        if (!last_digits || last_digits.length === 0) return;

        const stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
        }));

        last_digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) stats[digit].count++;
        });

        const total = last_digits.length;
        if (total > 0) {
            stats.forEach(stat => {
                stat.percentage = (stat.count / total) * 100;
            });
        }

        this.digit_stats = stats;
        this.ticks = last_digits;
        this.updateFirstDigitStats(last_digits);

        if (price !== undefined && price !== null) {
            runInAction(() => {
                this.current_price = price;
                const price_str = String(price);
                const last_char = price_str[price_str.length - 1];
                const current_digit = parseInt(last_char);
                if (!isNaN(current_digit)) {
                    this.last_digit = current_digit;

                    if (current_digit % 2 === 0) {
                        this.consecutive_even++;
                        this.consecutive_odd = 0;
                    } else {
                        this.consecutive_odd++;
                        this.consecutive_even = 0;
                    }
                }
            });
        }

        this.calculateDominance();

        if (this.is_speedbot_running) {
            this.executeSpeedTrade();
        }

        // Update Smart Analysis
        const predictor = new SmartPredictor(last_digits);
        runInAction(() => {
            if (price !== undefined) {
                this.analysis_engine.addTick(Number(price));
                this.root_store.analysis.updateDigitStats(last_digits, price);
            }
            
            this.smart_analysis_data = {
                predictions: predictor.predict(),
                hotCold: predictor.getHotCold(),
                risk: predictor.getRiskMetrics(),
                signal: predictor.getTradingSignal(),
            };

            // Update VSense
            const vsense = new VSenseEngine(this.ticks, this.symbol);
            this.v_sense_signals = vsense.analyze();

            if (this.is_turbo_bot_running) {
                this.processTurboBot();
            }
        });

        this.checkStrategyTriggers();
    };

    @action
    updateFirstDigitStats = (last_digits: number[]) => {
        const stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
        }));

        last_digits.forEach(digit => {
            const firstDigit = (digit + 1) % 10;
            if (firstDigit > 0) stats[firstDigit].count++;
        });

        const total = last_digits.filter(d => (d + 1) % 10 > 0).length;
        if (total > 0) {
            stats.forEach(stat => {
                stat.percentage = (stat.count / total) * 100;
            });
        }
        this.first_digit_stats = stats;
    };

    @action
    calculateDominance = () => {
        let evenCount = 0;
        let oddCount = 0;
        this.digit_stats.forEach(s => {
            if (s.digit % 2 === 0) evenCount += s.count;
            else oddCount += s.count;
        });

        if (evenCount > oddCount + 5) this.dominance = 'EVEN';
        else if (oddCount > evenCount + 5) this.dominance = 'ODD';
        else this.dominance = 'NEUTRAL';
    };

    calculateProbabilities = () => {
        let even = 0;
        let odd = 0;
        let over = 0;
        let under = 0;
        let middle = 0;
        let total = 0;

        this.digit_stats.forEach(stat => {
            total += stat.count;
            if (stat.digit % 2 === 0) even += stat.count;
            else odd += stat.count;

            if (stat.digit >= 5) over += stat.count;
            if (stat.digit <= 4) under += stat.count;
            if (stat.digit >= 3 && stat.digit <= 6) middle += stat.count;
        });

        const safeDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

        return {
            even: safeDiv(even, total),
            odd: safeDiv(odd, total),
            over: safeDiv(over, total),
            under: safeDiv(under, total),
            middle: safeDiv(middle, total),
            total,
        };
    };

    @action
    fetchMarkets = async () => {
        if (!ApiHelpers.instance) {
            const { api_base } = await import('@/external/bot-skeleton');
            if (api_base.api) {
                ApiHelpers.setInstance({
                    server_time: this.root_store.common.server_time,
                    ws: api_base.api,
                });
            } else {
                return;
            }
        }
        try {
            const symbols = await (ApiHelpers.instance as unknown as { active_symbols: { retrieveActiveSymbols: () => Promise<Array<{ is_trading_suspended: number; market_display_name?: string; market: string; symbol: string; display_name: string; pip: number }>> } }).active_symbols.retrieveActiveSymbols();
            runInAction(() => {
                if (symbols && Array.isArray(symbols)) {
                    const groups: Record<string, { group: string; items: { value: string; label: string }[] }> = {};
                    const symbolData: Record<string, { pip: number; symbol: string }> = {};

                    symbols.forEach((s: { is_trading_suspended: number | boolean; market_display_name?: string; market: string; symbol: string; display_name: string; pip: number }) => {
                        if (s.is_trading_suspended) return;
                        const market_name = s.market_display_name || s.market;
                        if (!groups[market_name]) groups[market_name] = { group: market_name, items: [] };
                        groups[market_name].items.push({ value: s.symbol, label: s.display_name });
                        symbolData[s.symbol] = s;
                    });
                    this.markets = Object.values(groups).sort((a, b) => a.group.localeCompare(b.group));
                    this.active_symbols_data = symbolData;
                }
            });
        } catch (error) {
            console.error('Error fetching markets in SmartTrading:', error);
        }
    };

    @action
    setSymbol = (symbol: string) => {
        this.symbol = symbol;
        this.resetStats();
        this.root_store.analysis.setSymbol(symbol);
    };

    @action
    setActiveSubtab = (subtab: TSmartSubtab) => {
        this.active_subtab = subtab;
    };

    @action
    resetStats = () => {
        runInAction(() => {
            this.digit_stats.forEach(s => {
                s.count = 0;
                s.percentage = 0;
            });
            this.ticks = [];
            this.last_digit = null;
            this.ticks_processed = 0;
            this.wins = 0;
            this.losses = 0;
            this.session_pl = 0;
            this.current_streak = 0;
            this.consecutive_losses = 0;
            this.current_stake = this.speedbot_stake;

            Object.values(this.strategies).forEach(s => {
                s.current_stake = s.stake;
                s.status = s.is_active ? 'waiting' : 'idle';
            });
        });
    };

    @action
    toggleSpeedbot = () => {
        this.is_speedbot_running = !this.is_speedbot_running;
        if (this.is_speedbot_running) {
            this.resetStats();
            this.root_store.run_panel.setIsRunning(true);
            this.root_store.run_panel.setContractStage(contract_stages.STARTING);
        } else {
            this.root_store.run_panel.setIsRunning(false);
            this.root_store.run_panel.setContractStage(contract_stages.NOT_RUNNING);
        }
    };

    @action
    executeSpeedTrade = async () => {
        if (!this.root_store.common.is_socket_opened || !this.is_speedbot_running || this.is_executing) return;

        if (!this.root_store.client.is_logged_in) {
            this.toggleSpeedbot();
            this.root_store.run_panel.showLoginDialog();
            return;
        }

        // Check TP/SL
        if (this.enable_tp_sl) {
            if (this.session_pl >= this.take_profit || this.session_pl <= -this.stop_loss) {
                this.toggleSpeedbot();
                return;
            }
        }

        // Check Max Consecutive Losses
        if (this.is_max_loss_enabled && this.consecutive_losses >= this.max_consecutive_losses) {
            this.toggleSpeedbot();
            return;
        }

        this.is_executing = true;
        this.ticks_processed++;
        this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_SENT);
        globalObserver.emit('contract.status', { id: 'contract.purchase_sent' });

        const contract_type = this.speedbot_contract_type;
        const stake = this.current_stake;
        const symbol = this.symbol;
        const barrier = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(contract_type)
            ? this.speedbot_prediction
            : undefined;

        try {
            if (!api_base.api) return;

            type TProposalRequest = {
                proposal: number;
                amount: number;
                basis: string;
                contract_type: string;
                currency: string;
                duration: number;
                duration_unit: string;
                symbol: string;
                barrier?: number;
            };

            const proposal_request: TProposalRequest = {
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type,
                currency: this.root_store.client.currency || 'USD',
                duration: 1,
                duration_unit: 't',
                symbol,
            };

            if (barrier !== undefined) {
                proposal_request.barrier = barrier;
            }

            const proposal_response = await api_base.api.send(proposal_request);

            if (proposal_response.error) {
                console.error('SmartTrading Speedbot Proposal Error:', proposal_response.error);
                this.is_executing = false;
                return;
            }

            const proposal_id = proposal_response.proposal?.id;
            if (!proposal_id) {
                this.is_executing = false;
                return;
            }

            const buy_response = await api_base.api.send({
                buy: proposal_id,
                price: stake,
            });

            if (buy_response.error) {
                console.error('SmartTrading Speedbot Buy Error:', buy_response.error);
                this.is_executing = false;
                return;
            }

            const contract_id = buy_response.buy?.contract_id;

            if (contract_id) {
                this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_RECEIVED);
                globalObserver.emit('contract.status', {
                    id: 'contract.purchase_received',
                    buy: buy_response.buy,
                });

                // Track result
                const unsubscribe = api_base.api.subscribe(
                    {
                        proposal_open_contract: 1,
                        contract_id,
                    },
                    (response: TDerivResponse) => {
                        if (response.proposal_open_contract?.is_sold) {
                            const status = response.proposal_open_contract?.status;
                            const profit = parseFloat(response.proposal_open_contract?.profit || '0');

                            globalObserver.emit('bot.contract', response.proposal_open_contract);
                            globalObserver.emit('contract.status', {
                                id: 'contract.sold',
                                contract: response.proposal_open_contract,
                            });

                            runInAction(() => {
                                if (status === 'won') {
                                    this.wins++;
                                    this.consecutive_losses = 0;
                                    this.current_stake = this.speedbot_stake; // Reset stake
                                    if (this.current_streak < 0) this.current_streak = 1;
                                    else this.current_streak++;

                                    // Reset contract type if alternating on loss was enabled
                                    // (Actually, usually we keep alternating or reset based on user preference)
                                } else {
                                    this.losses++;
                                    this.consecutive_losses++;

                                    if (this.current_streak > 0) this.current_streak = -1;
                                    else this.current_streak--;

                                    // Martingale
                                    if (this.use_martingale) {
                                        this.current_stake = this.current_stake * this.martingale_multiplier;
                                        if (this.is_max_stake_enabled && this.current_stake > this.max_stake_limit) {
                                            this.current_stake = this.max_stake_limit;
                                        }
                                    }

                                    // Alternates
                                    if (this.alternate_on_loss || this.alternate_even_odd) {
                                        const alternates: Record<string, string> = {
                                            DIGITEVEN: 'DIGITODD',
                                            DIGITODD: 'DIGITEVEN',
                                            DIGITOVER: 'DIGITUNDER',
                                            DIGITUNDER: 'DIGITOVER',
                                            DIGITMATCH: 'DIGITDIFF',
                                            DIGITDIFF: 'DIGITMATCH',
                                        };

                                        if (alternates[this.speedbot_contract_type]) {
                                            // Specific Even/Odd check for alternate_even_odd toggle
                                            if (
                                                this.alternate_even_odd &&
                                                !['DIGITEVEN', 'DIGITODD'].includes(this.speedbot_contract_type)
                                            ) {
                                                // Do nothing or switch to even?
                                            } else {
                                                this.speedbot_contract_type = alternates[this.speedbot_contract_type];
                                            }
                                        }
                                    }
                                }
                                this.session_pl += profit;
                                this.is_executing = false;
                            });

                            // Close subscription
                            if (unsubscribe && typeof unsubscribe === 'function') {
                                unsubscribe();
                            } else {
                                 api_base.api.send({ forget: response.subscription?.id });
                            }
                        }
                    }
                );
            } else {
                this.is_executing = false;
            }
        } catch (error) {
            console.error('SmartTrading Speedbot execution error:', error);
            this.is_executing = false;
        }
    };

    @action
    executeBulkTrade = async () => {
        if (!this.root_store.common.is_socket_opened || this.is_bulk_trading) return;

        if (!this.root_store.client.is_logged_in) {
            this.root_store.run_panel.showLoginDialog();
            return;
        }

        runInAction(() => {
            this.is_bulk_trading = true;
            this.is_speedbot_running = true; // Visual feedback
        });

        const count = this.number_of_contracts;
        const promises = [];

        for (let i = 0; i < count; i++) {
            // Wait slightly between trades to avoid rate limiting or overlap issues if needed
            // But usually, user wants "speed", so we can fire them off almost simultaneously
            promises.push(this.executeSpeedTrade());
            // Small delay to ensure order in some contexts
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await Promise.all(promises);

        runInAction(() => {
            this.is_bulk_trading = false;
        });
    };

    @action
    toggleStrategy = (id: string) => {
        const strategy = this.strategies[id];
        if (!strategy) return;

        strategy.is_active = !strategy.is_active;
        if (!strategy.is_active) {
            strategy.status = 'idle';
            strategy.current_stake = strategy.stake;
        } else {
            strategy.status = 'waiting';
        }
    };

    @action
    checkStrategyTriggers = () => {
        if (this.active_subtab !== 'automated' && !this.is_smart_auto24_running) return;

        if (this.is_smart_auto24_running) {
            this.runSmartAuto24Loop();
            return;
        }

        Object.values(this.strategies).forEach(strategy => {
            if (!strategy.is_active || strategy.status !== 'waiting') return;

            let triggered = false;
            const probs = this.calculateProbabilities();

            switch (strategy.id) {
                case 'even_odd_digits': {
                    const last_digits = this.ticks.slice(-(strategy.check_last_x || 5));
                    const target = strategy.target_pattern === 'Even' ? 0 : 1;
                    triggered =
                        last_digits.length === (strategy.check_last_x || 5) && last_digits.every(d => d % 2 === target);
                    break;
                }
                case 'even_odd_percentages': {
                    const val = strategy.target_side === 'Even' ? probs.even : probs.odd;
                    triggered = val >= strategy.threshold_pct!;
                    break;
                }
                case 'over_under_digits': {
                    const last_digits = this.ticks.slice(-(strategy.check_last_x || 3));
                    const is_greater = strategy.condition === 'Greater than';
                    triggered =
                        last_digits.length === (strategy.check_last_x || 3) &&
                        last_digits.every(d => (is_greater ? d > strategy.threshold_val! : d < strategy.threshold_val!));
                    break;
                }
                case 'over_under_percentages': {
                    const val = strategy.target_type === 'Over %' ? probs.over : probs.under;
                    triggered = val >= strategy.threshold_pct!;
                    break;
                }
                case 'rise_fall': {
                    const rise_pct =
                        (this.consecutive_even / (this.consecutive_even + this.consecutive_odd || 1)) * 100;
                    const val = strategy.target_side === 'Rise' ? rise_pct : 100 - rise_pct;
                    triggered = val >= strategy.threshold_pct!;
                    break;
                }
                case 'matches_differs': {
                    const digit_stat = this.digit_stats.find(s => s.digit === strategy.target_digit);
                    const val =
                        strategy.target_type === 'Matches %'
                            ? digit_stat?.percentage || 0
                            : 100 - (digit_stat?.percentage || 0);
                    triggered = val >= strategy.threshold_pct!;
                    break;
                }
            }

            if (triggered) {
                this.executeStrategyTrade(strategy.id);
            }
        });
    };

    @action
    runSmartAuto24Loop = async () => {
        const strategy_id = this.smart_auto24_strategy;
        const strategy = this.strategies[strategy_id];
        if (!strategy || strategy.status === 'trading' || !api_base.api) return;

        if (!this.checkRiskLimits()) {
            this.is_smart_auto24_running = false;
            return;
        }

        const signal = this.analyzeMarket(strategy_id);
        if (signal.action === 'TRADE') {
            await this.executeStrategyTrade(strategy_id, signal.contractType, signal.prediction);
        }
    };

    analyzeMarket = (strategy_id: string) => {
        const digits = this.ticks;
        const strategy = this.strategies[strategy_id];

        switch (strategy_id) {
            case 'EVENODD': {
                const recent = digits.slice(-100);
                const evenCount = recent.filter(d => d % 2 === 0).length;
                const evenPercent = (evenCount / 100) * 100;
                const oddPercent = 100 - evenPercent;

                const dominant = evenPercent > oddPercent ? 'EVEN' : 'ODD';
                const confidence = Math.max(evenPercent, oddPercent);

                return {
                    action: confidence >= strategy.minConfidence ? 'TRADE' : 'WAIT',
                    contractType: dominant === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
                    confidence,
                };
            }
            case 'OVER3UNDER6':
            case 'OVER2UNDER7': {
                const recent = digits.slice(-50);
                const barrier = strategy.barrier as { over: number; under: number };
                const overCount = recent.filter(d => d > barrier.over).length;
                const underCount = recent.filter(d => d < barrier.under).length;

                const overPercent = (overCount / 50) * 100;
                const underPercent = (underCount / 50) * 100;

                const dominant = overPercent > underPercent ? 'OVER' : 'UNDER';
                const confidence = Math.max(overPercent, underPercent);

                return {
                    action: confidence >= strategy.minConfidence ? 'TRADE' : 'WAIT',
                    contractType: dominant === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER',
                    prediction: dominant === 'OVER' ? (strategy.barrier as { over: number; under: number }).over : (strategy.barrier as { over: number; under: number }).under,
                    confidence,
                };
            }
            case 'MATCHES':
            case 'DIFFERS': {
                const recent = digits.slice(-50);
                const counts = Array(10).fill(0);
                recent.forEach(d => counts[d]++);

                let targetDigit = 0;
                let targetCount = counts[0];

                if (strategy_id === 'MATCHES') {
                    // Find least frequent for matches? Or most frequent?
                    // Guide says "Predict exact digit match". Usually you trade frequency.
                    targetDigit = counts.indexOf(Math.max(...counts));
                    targetCount = counts[targetDigit];
                } else {
                    targetDigit = counts.indexOf(Math.min(...counts));
                    targetCount = counts[targetDigit];
                }

                const confidence = (targetCount / 50) * 100;

                return {
                    action: confidence >= strategy.minConfidence ? 'TRADE' : 'WAIT',
                    contractType: strategy_id === 'MATCHES' ? 'DIGITMATCH' : 'DIGITDIFF',
                    prediction: targetDigit,
                    confidence,
                };
            }
            default:
                return { action: 'WAIT' };
        }
    };

    checkRiskLimits = (): boolean => {
        // Daily loss limit (Stop Loss)
        if (this.enable_tp_sl && this.session_pl <= -this.stop_loss) return false;

        // Take Profit
        if (this.enable_tp_sl && this.session_pl >= this.take_profit) return false;

        // Max Consecutive Losses
        if (this.is_max_loss_enabled && this.consecutive_losses >= this.max_consecutive_losses) return false;

        // Max Stake Limit
        if (this.is_max_stake_enabled && this.current_stake > this.max_stake_limit) return false;

        // Safety fallback: hardcoded absolute limit if nothing else is set
        if (this.session_pl <= -500) return false;

        return true;
    };

    @action
    executeStrategyTrade = async (id: string, override_type?: string, override_prediction?: number) => {
        const strategy = this.strategies[id];
        if (!strategy || strategy.status === 'trading' || !api_base.api) return;

        strategy.status = 'trading';
        const trade_type = override_type || strategy.trade_type;
        const prediction = override_prediction !== undefined ? override_prediction : strategy.prediction;

        this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_SENT);
        globalObserver.emit('contract.status', { id: 'contract.purchase_sent' });

        try {
            const proposal = await api_base.api.send({
                proposal: 1,
                amount: strategy.current_stake,
                basis: 'stake',
                contract_type: trade_type,
                currency: this.root_store.client.currency || 'USD',
                duration: strategy.ticks,
                duration_unit: 't',
                symbol: this.symbol,
                ...((['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(trade_type || '')) && prediction !== undefined ? { barrier: String(prediction) } : {}),
            });

            if (proposal.error) {
                strategy.status = 'waiting';
                return;
            }

            const buy = await api_base.api.send({
                buy: proposal.proposal.id,
                price: strategy.current_stake,
            });

            if (buy.error) {
                strategy.status = 'waiting';
                return;
            }

            const contract_id = buy.buy.contract_id;

            this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_RECEIVED);
            globalObserver.emit('contract.status', {
                id: 'contract.purchase_received',
                buy: buy.buy,
            });

            const unsubscribe = api_base.api.subscribe(
                {
                    proposal_open_contract: 1,
                    contract_id,
                },
                (response: TDerivResponse) => {
                        if (response.proposal_open_contract?.is_sold) {
                            const status = response.proposal_open_contract?.status || 'lost';
                            const profit = parseFloat(response.proposal_open_contract?.profit || '0');

                        globalObserver.emit('bot.contract', response.proposal_open_contract);
                        globalObserver.emit('contract.status', {
                            id: 'contract.sold',
                            contract: response.proposal_open_contract,
                        });

                        runInAction(() => {
                            const trade_result = {
                                timestamp: Date.now(),
                                contractType: trade_type || 'Unknown',
                                stake: strategy.current_stake,
                                result: status.toUpperCase(),
                                profitLoss: profit,
                            };
                            this.trade_history.push(trade_result as TTradeHistory);

                            if (status === 'won') {
                                strategy.current_stake = strategy.stake;
                                this.wins++;
                                this.consecutive_losses = 0;
                            } else {
                                strategy.current_stake *= strategy.martingale;
                                this.losses++;
                                this.consecutive_losses++;
                            }
                            this.session_pl += profit;
                            this.max_drawdown = Math.min(this.max_drawdown, this.session_pl);
                            strategy.status = 'waiting';
                        });

                        if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
                    }
                }
            );
        } catch (error) {
            runInAction(() => {
                strategy.status = 'waiting';
            });
        }
    };
    @action
    toggleTurboBot = () => {
        this.is_turbo_bot_running = !this.is_turbo_bot_running;
        if (this.is_turbo_bot_running) {
            this.turbo_bot_state = 'LISTENING';
            this.wins = 0;
            this.losses = 0;
            this.session_pl = 0;
        } else {
            this.turbo_bot_state = 'STOPPED';
        }
    };

    @action
    processTurboBot = () => {
        if (!this.is_turbo_bot_running || this.turbo_bot_state === 'STOPPED') return;

        if (this.turbo_bot_state === 'COOLDOWN') {
            this.turbo_cooldown_ticks--;
            if (this.turbo_cooldown_ticks <= 0) {
                this.turbo_bot_state = 'LISTENING';
            }
            return;
        }

        if (this.turbo_bot_state === 'LISTENING') {
            const valid_signals = this.v_sense_signals.filter(s => 
                s.confidence >= this.turbo_settings.min_confidence && 
                s.status === 'SAFE'
            );

            if (valid_signals.length > 0) {
                const best_signal = valid_signals.reduce((prev, current) => 
                    (prev.confidence > current.confidence) ? prev : current
                );

                this.executeTurboTrade(best_signal);
            }
        }
    };

    @action
    executeTurboTrade = async (signal: VSenseSignal) => {
        this.turbo_bot_state = 'SETUP';
        
        const balance = parseFloat(this.root_store.client.balance) || 1000;
        const risk_pct = signal.confidence >= 75 ? 0.05 : 0.02;
        let stake = balance * risk_pct;
        if (stake < 0.35) stake = 0.35;
        stake = Math.round(stake * 100) / 100;

        let bulk_size = 1;
        if (this.turbo_settings.is_bulk_enabled) {
            if (signal.strategy === 'DIFFERS' && signal.confidence >= 85) bulk_size = 3;
            else if (signal.strategy === 'DIFFERS') bulk_size = 2;
            else if (signal.confidence >= 80) bulk_size = 2;
        }

        this.turbo_bot_state = 'EXECUTING';
        this.turbo_last_signal = `${signal.strategy} @ ${signal.confidence}% [${signal.targetDigit || signal.targetSide}]`;

        const type = this.getTurboContractType(signal);
        const duration = signal.strategy === 'DIFFERS' ? 1 : 5;
        const prediction = signal.targetDigit;

        for (let i = 0; i < bulk_size; i++) {
            this.fireTurboContract(type, stake, duration, prediction);
        }

        this.turbo_bot_state = 'COOLDOWN';
        this.turbo_cooldown_ticks = signal.strategy === 'DIFFERS' ? 10 : 15;
    };

    getTurboContractType = (signal: VSenseSignal) => {
        switch (signal.strategy) {
            case 'DIFFERS': return 'DIGITDIFF';
            case 'EVEN_ODD': return signal.targetSide === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
            case 'OVER_UNDER': return signal.targetSide === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
            default: return 'DIGITDIFF';
        }
    };

    @action
    fireTurboContract = async (type: string, stake: number, duration: number, prediction?: number) => {
        if (!api_base.api) return;

        try {
            const proposal = await api_base.api.send({
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type: type,
                currency: this.root_store.client.currency || 'USD',
                duration,
                duration_unit: 't',
                symbol: this.symbol,
                ...((prediction !== undefined) ? { barrier: String(prediction) } : {}),
            });

            if (proposal.error) return;

            const buy = await api_base.api.send({
                buy: proposal.proposal.id,
                price: stake,
            });

            if (buy.error) return;

            const contract_id = buy.buy.contract_id;
            const unsubscribe = api_base.api.subscribe(
                { proposal_open_contract: 1, contract_id },
                (response: TDerivResponse) => {
                    if (response.proposal_open_contract?.is_sold) {
                        const is_win = response.proposal_open_contract.status === 'won';
                        const profit = parseFloat(response.proposal_open_contract.profit || '0');

                        runInAction(() => {
                            if (is_win) this.wins++;
                            else {
                                this.losses++;
                                if (this.is_turbo_bot_running) {
                                    this.is_turbo_bot_running = false;
                                    this.turbo_bot_state = 'STOPPED';
                                }
                            }
                            this.session_pl += profit;

                            this.trade_history.push({
                                timestamp: Date.now(),
                                contractType: type,
                                stake,
                                result: is_win ? 'WON' : 'LOST',
                                profitLoss: profit,
                            } as TTradeHistory);
                        });
                        if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
                    }
                }
            );
        } catch (e) {
            console.error('Turbo Exec Error:', e);
        }
    };
}
