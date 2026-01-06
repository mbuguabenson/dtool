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
    is_active: boolean; // For automated triggers
    is_running: boolean; // For Auto24 independent run state
    status: 'idle' | 'waiting' | 'trading' | 'error';
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
    // Risk Management per bot
    take_profit: number;
    stop_loss: number;
    max_consecutive_losses: number;
    enable_tp_sl: boolean;
    is_max_loss_enabled: boolean;
    // Stats per bot
    total_wins: number;
    total_losses: number;
    profit_loss: number;
    consecutive_losses: number;
    // Advanced Logic Fields
    market_message?: string;
    is_unstable?: boolean;
    suggested_prediction?: string | number;
    power_history?: number[][]; // Array of digit percentages history
    // Per-Bot Market Selection and Auto-Trade
    selected_symbol?: string;
    current_price?: string | number;
    last_digit?: number | null;
    auto_trade_enabled?: boolean;
    // Per-Bot Digit Stats
    bot_digit_stats?: TSmartDigitStat[];
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
    @observable accessor active_symbols_data: Record<string, { pip: number; symbol: string; display_name: string }> = {};

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

    // Market Scanning State
    @observable accessor is_scanning = false;
    @observable accessor is_scan_expanded = false; // New state for expanded view
    @observable accessor best_market = '';
    @observable accessor market_fit_score = 0;
    @observable accessor scan_results: { symbol: string; score: number; reason: string }[] = [];

    // Comprehensive Market Scanner Results
    @observable accessor all_markets_stats: Array<{
        symbol: string;
        price: string;
        last_digit: number;
        even_pct: number;
        odd_pct: number;
        over_pct: number;
        under_pct: number;
        top_matches: number[];
        differs_targets: number[];
        timestamp: number;
        score: number;
        reason: string;
    }> = [];

    // Stats Visualization State
    @observable accessor stats_sample_size = 100;

    get last_20_digits() {
        return this.ticks.slice(-20);
    }

    get stats_on_sample() {
        const slice = this.ticks.slice(-this.stats_sample_size);
        const even = slice.filter(d => d % 2 === 0).length;
        const odd = slice.length - even;
        const over = slice.filter(d => d > 4).length; // 5,6,7,8,9
        const under = slice.length - over; // 0,1,2,3,4

        return {
            total: slice.length,
            even, odd, over, under,
            evenProb: slice.length ? (even / slice.length) * 100 : 0,
            oddProb: slice.length ? (odd / slice.length) * 100 : 0,
            overProb: slice.length ? (over / slice.length) * 100 : 0,
            underProb: slice.length ? (under / slice.length) * 100 : 0,
        };
    }

    @action
    setStatsSampleSize = (size: number) => {
        this.stats_sample_size = size;
        // Trigger a re-fetch or re-calculation if needed, 
        // but typically ticks are strictly updated via updateDigitStats
    };

    private analysis_engine = new AnalysisEngine(100);

    // Automated Strategies State
    @observable accessor strategies: Record<string, TStrategy> = {
        EVENODD: {
            id: 'EVENODD',
            name: 'Even/Odd',
            contractTypes: ['DIGITEVEN', 'DIGITODD'],
            defaultMultiplier: 2.1,
            payout: 1.95,
            minConfidence: 55,
            description: 'Trade even vs odd digits',
            is_active: false,
            is_running: false,
            status: 'idle',
            stake: 1.0,
            martingale: 2.1,
            current_stake: 1.0,
            ticks: 1,
            take_profit: 10,
            stop_loss: 10,
            max_consecutive_losses: 5,
            enable_tp_sl: false,
            is_max_loss_enabled: false,
            total_wins: 0,
            total_losses: 0,
            profit_loss: 0,
            consecutive_losses: 0,
            market_message: 'Waiting for signal...',
            is_unstable: false,
            power_history: [],
            selected_symbol: 'R_100',
            auto_trade_enabled: false,
            bot_digit_stats: Array.from({ length: 10 }, (_, i) => ({ digit: i, count: 0, percentage: 0 })),
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
            is_running: false,
            status: 'idle',
            stake: 1.0,
            martingale: 2.6,
            current_stake: 1.0,
            ticks: 1,
            take_profit: 10,
            stop_loss: 10,
            max_consecutive_losses: 5,
            enable_tp_sl: false,
            is_max_loss_enabled: false,
            total_wins: 0,
            total_losses: 0,
            profit_loss: 0,
            consecutive_losses: 0,
            market_message: 'Waiting for signal...',
            is_unstable: false,
            power_history: [],
            selected_symbol: 'R_100',
            auto_trade_enabled: false,
            bot_digit_stats: Array.from({ length: 10 }, (_, i) => ({ digit: i, count: 0, percentage: 0 })),
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
            is_running: false,
            status: 'idle',
            stake: 1.0,
            martingale: 3.5,
            current_stake: 1.0,
            ticks: 1,
            take_profit: 10,
            stop_loss: 10,
            max_consecutive_losses: 5,
            enable_tp_sl: false,
            is_max_loss_enabled: false,
            total_wins: 0,
            total_losses: 0,
            profit_loss: 0,
            consecutive_losses: 0,
            market_message: 'Waiting for signal...',
            is_unstable: false,
            power_history: [],
            selected_symbol: 'R_100',
            auto_trade_enabled: false,
            bot_digit_stats: Array.from({ length: 10 }, (_, i) => ({ digit: i, count: 0, percentage: 0 })),
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
            is_running: false,
            status: 'idle',
            stake: 1.0,
            martingale: 10,
            current_stake: 1.0,
            ticks: 1,
            take_profit: 10,
            stop_loss: 10,
            max_consecutive_losses: 5,
            enable_tp_sl: false,
            is_max_loss_enabled: false,
            total_wins: 0,
            total_losses: 0,
            profit_loss: 0,
            consecutive_losses: 0,
            market_message: 'Waiting for signal...',
            is_unstable: false,
            power_history: [],
            selected_symbol: 'R_100',
            auto_trade_enabled: false,
            bot_digit_stats: Array.from({ length: 10 }, (_, i) => ({ digit: i, count: 0, percentage: 0 })),
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
            is_running: false,
            status: 'idle',
            stake: 1.0,
            martingale: 1.1,
            current_stake: 1.0,
            ticks: 1,
            take_profit: 10,
            stop_loss: 10,
            max_consecutive_losses: 5,
            enable_tp_sl: false,
            is_max_loss_enabled: false,
            total_wins: 0,
            total_losses: 0,
            profit_loss: 0,
            consecutive_losses: 0,
            market_message: 'Waiting for signal...',
            is_unstable: false,
            power_history: [],
            selected_symbol: 'R_100',
            auto_trade_enabled: false,
            bot_digit_stats: Array.from({ length: 10 }, (_, i) => ({ digit: i, count: 0, percentage: 0 })),
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
                    // Use the last digit from the input array which comes from the source of truth
                    // avoiding string parsing issues (e.g. "1.50" -> "1.5" -> 5 instead of 0)
                    const safe_last_digit = last_digits[last_digits.length - 1];
                    this.last_digit = safe_last_digit !== undefined ? safe_last_digit : current_digit;

                    if (this.last_digit % 2 === 0) {
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

        this.updatePowerHistory(stats);
        this.checkStrategyTriggers();
    };

    @action
    updatePowerHistory = (current_stats: TSmartDigitStat[]) => {
        Object.values(this.strategies).forEach(strategy => {
            if (!strategy.is_running) return;

            const percentages = current_stats.map(s => s.percentage);
            const history = [...(strategy.power_history || [])];
            history.push(percentages);
            if (history.length > 5) history.shift();
            strategy.power_history = history;
        });
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
                    const symbolData: Record<string, { pip: number; symbol: string; display_name: string }> = {};

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
        // 1. Run Auto-Trading bots (independent states)
        Object.values(this.strategies).forEach(strategy => {
            if (strategy.is_running) {
                this.runStrategyLoop(strategy.id);
            }
        });

        // 2. Run Automated Trigger bots (only if tab is active)
        if (this.active_subtab === 'automated') {
            Object.values(this.strategies).forEach(strategy => {
                if (!strategy.is_active || strategy.status !== 'waiting' || strategy.is_running) return;

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
        }
    };

    @action
    runStrategyLoop = async (strategy_id: string) => {
        const strategy = this.strategies[strategy_id];
        if (!strategy || strategy.status === 'trading' || !api_base.api || !strategy.is_running) return;

        if (!this.checkRiskLimits(strategy)) {
            runInAction(() => {
                strategy.is_running = false;
                strategy.status = 'idle';
            });
            return;
        }

        const signal = this.analyzeMarket(strategy_id);
        if (signal.action === 'TRADE') {
            await this.executeStrategyTrade(strategy_id, signal.contractType, signal.prediction);
        }
    };

    @action
    toggleBot = (strategy_id: string) => {
        const strategy = this.strategies[strategy_id];
        if (strategy) {
            strategy.is_running = !strategy.is_running;
            if (strategy.is_running) {
                strategy.status = 'waiting';
            } else {
                strategy.status = 'idle';
            }
        }
    };

    @action
    updateStrategySetting = (strategy_id: string, key: keyof TStrategy, value: any) => {
        const strategy = this.strategies[strategy_id];
        if (strategy) {
            (strategy as any)[key] = value;
        }
    };

    @action
    runSmartAuto24Loop = async () => {
        // This is legacy now, but keeping for compatibility if referenced elsewhere
        await this.runStrategyLoop(this.smart_auto24_strategy);
    };

    analyzeMarket = (strategy_id: string) => {
        const digits = this.ticks;
        const strategy = this.strategies[strategy_id];
        if (!strategy || !this.digit_stats) return { action: 'WAIT' };

        const sorted_stats = [...this.digit_stats].sort((a, b) => b.percentage - a.percentage);
        const most_appearing = sorted_stats[0].digit;
        const second_most = sorted_stats[1].digit;
        const least_appearing = sorted_stats[sorted_stats.length - 1].digit;

        const getPowerTrend = (digit: number) => {
            const history = strategy.power_history || [];
            if (history.length < 2) return 'neutral';
            const current = history[history.length - 1][digit];
            const previous = history[history.length - 2][digit];
            if (current > previous) return 'increasing';
            if (current < previous) return 'decreasing';
            return 'neutral';
        };

        switch (strategy_id) {
            case 'EVENODD': {
                const is_even = (d: number) => d % 2 === 0;
                const most_is_even = is_even(most_appearing);
                const second_is_even = is_even(second_most);
                const least_is_even = is_even(least_appearing);

                const even_pct = this.digit_stats.filter(s => is_even(s.digit)).reduce((acc, s) => acc + s.percentage, 0);
                const odd_pct = 100 - even_pct;

                // Check for unstable market (decreasing power)
                const history = strategy.power_history || [];
                if (history.length >= 2) {
                    const current_dominant_pct = Math.max(even_pct, odd_pct);
                    const prev_even = history[history.length - 2].filter((_, i) => is_even(i)).reduce((a, b) => a + b, 0);
                    const prev_odd = 100 - prev_even;
                    const prev_dominant_pct = Math.max(prev_even, prev_odd);

                    if (current_dominant_pct < prev_dominant_pct) {
                        strategy.is_unstable = true;
                        strategy.market_message = 'UNSTABLE MARKET - Power Decreasing';
                        return { action: 'WAIT' };
                    }
                }
                strategy.is_unstable = false;

                if (most_is_even && second_is_even && least_is_even && even_pct >= 55) {
                    strategy.market_message = `Strong EVEN market (${even_pct.toFixed(1)}%) - Waiting for entry...`;

                    // Entry: 2+ consecutive odd numbers, then top even appears and trend is rising
                    const last_two = digits.slice(-2);
                    const last_digit = digits[digits.length - 1];
                    if (last_two.every(d => !is_even(d)) && is_even(last_digit)) {
                        const entry_digit_power = getPowerTrend(last_digit);
                        const most_power = getPowerTrend(most_appearing);
                        const least_power = getPowerTrend(least_appearing);

                        if (entry_digit_power === 'increasing' || most_power === 'increasing' || least_power === 'increasing') {
                            return { action: 'TRADE', contractType: 'DIGITEVEN', confidence: even_pct };
                        }
                    }
                } else if (!most_is_even && !second_is_even && !least_is_even && odd_pct >= 55) {
                    strategy.market_message = `Strong ODD market (${odd_pct.toFixed(1)}%) - Waiting for entry...`;

                    const last_two = digits.slice(-2);
                    const last_digit = digits[digits.length - 1];
                    if (last_two.every(d => is_even(d)) && !is_even(last_digit)) {
                        const entry_digit_power = getPowerTrend(last_digit);
                        const most_power = getPowerTrend(most_appearing);
                        const least_power = getPowerTrend(least_appearing);

                        if (entry_digit_power === 'increasing' || most_power === 'increasing' || least_power === 'increasing') {
                            return { action: 'TRADE', contractType: 'DIGITODD', confidence: odd_pct };
                        }
                    }
                } else {
                    strategy.market_message = 'Neutral Market - Waiting for parity alignment';
                }
                return { action: 'WAIT' };
            }
            case 'OVER3UNDER6':
            case 'OVER2UNDER7': {
                const over_pct = this.digit_stats.filter(s => s.digit > 4).reduce((acc, s) => acc + s.percentage, 0);
                const under_pct = 100 - over_pct;

                const is_over = over_pct >= under_pct;
                const best_bias_pct = Math.max(over_pct, under_pct);

                // Track aggregate power trend
                const history = strategy.power_history || [];
                const prev_pct = history.length >= 2
                    ? (is_over
                        ? history[history.length - 2].slice(5).reduce((a, b) => a + b, 0)
                        : history[history.length - 2].slice(0, 5).reduce((a, b) => a + b, 0))
                    : best_bias_pct;

                const power_increasing = best_bias_pct > prev_pct;
                const power_decreasing = best_bias_pct < prev_pct;

                if (power_decreasing) {
                    strategy.is_unstable = true;
                    strategy.market_message = 'UNSTABLE MARKET - Power Decreasing';
                    return { action: 'WAIT' };
                }

                strategy.is_unstable = false;

                // Suggestions
                if (is_over) {
                    const sorted_over = [5, 6, 7, 8, 9].sort((a, b) => this.digit_stats[b].percentage - this.digit_stats[a].percentage);
                    strategy.suggested_prediction = `OVER ${Math.min(sorted_over[0], sorted_over[1])}`;
                } else {
                    const sorted_under = [0, 1, 2, 3, 4].sort((a, b) => this.digit_stats[b].percentage - this.digit_stats[a].percentage);
                    strategy.suggested_prediction = `UNDER ${Math.max(sorted_under[0], sorted_under[1])}`;
                }

                if (best_bias_pct >= 55 && power_increasing) {
                    // Entry point: use highest power digit in the range
                    const last_digit = digits[digits.length - 1];
                    let should_enter = false;

                    if (is_over) {
                        // Find highest power digit in over range (5-9)
                        const over_digits = this.digit_stats.filter(s => s.digit > 4).sort((a, b) => b.percentage - a.percentage);
                        const highest_over_digit = over_digits[0]?.digit;
                        if (last_digit === highest_over_digit && getPowerTrend(highest_over_digit) === 'increasing') {
                            should_enter = true;
                        }
                    } else {
                        // Find highest power digit in under range (0-4)
                        const under_digits = this.digit_stats.filter(s => s.digit <= 4).sort((a, b) => b.percentage - a.percentage);
                        const highest_under_digit = under_digits[0]?.digit;
                        if (last_digit === highest_under_digit && getPowerTrend(highest_under_digit) === 'increasing') {
                            should_enter = true;
                        }
                    }

                    if (should_enter) {
                        strategy.market_message = `TRADING ${is_over ? 'OVER' : 'UNDER'}...`;
                        return {
                            action: 'TRADE',
                            contractType: is_over ? 'DIGITOVER' : 'DIGITUNDER',
                            prediction: strategy.prediction || (is_over ? 4 : 5),
                            confidence: best_bias_pct
                        };
                    } else {
                        strategy.market_message = `WAIT - Entry signal pending (${best_bias_pct.toFixed(1)}%)`;
                    }
                } else if (best_bias_pct > 52) {
                    strategy.market_message = `WAIT - Market warming up (${best_bias_pct.toFixed(1)}%)`;
                } else {
                    strategy.market_message = 'Analyzing market bias...';
                }

                return { action: 'WAIT' };
            }
            case 'DIFFERS': {
                // Check for unstable market (general power decrease)
                const history = strategy.power_history || [];
                if (history.length >= 2) {
                    const current_total = this.digit_stats.reduce((acc, s) => acc + Math.abs(s.percentage - 10), 0);
                    const prev_total = history[history.length - 2].reduce((acc, p) => acc + Math.abs(p - 10), 0);

                    if (current_total < prev_total) {
                        strategy.is_unstable = true;
                        strategy.market_message = 'UNSTABLE MARKET - Power Decreasing';
                        return { action: 'WAIT' };
                    }
                }
                strategy.is_unstable = false;

                // selected digit should NOT be most, 2nd most, or least. 
                // digit to differ should be below 10% and decreasingly.
                const valid_digits = [2, 3, 4, 5, 6, 7].filter(d =>
                    d !== most_appearing && d !== second_most && d !== least_appearing
                );

                const stats_2_7 = this.digit_stats.filter(s => valid_digits.includes(s.digit));
                const target = stats_2_7.find(s => s.percentage < 10 && getPowerTrend(s.digit) === 'decreasing');

                if (target) {
                    // Entry point: when least or most appearing digit appears
                    const last_digit = digits[digits.length - 1];
                    if (last_digit === most_appearing || last_digit === least_appearing) {
                        strategy.market_message = `TRADING DIFFERS ${target.digit}...`;
                        return { action: 'TRADE', contractType: 'DIGITDIFF', prediction: target.digit, confidence: 90 };
                    }
                    strategy.market_message = `Signal Lock: Digit ${target.digit} - Waiting for entry...`;
                } else {
                    strategy.market_message = 'Scanning for low-power digits (2-7)...';
                }
                return { action: 'WAIT' };
            }
            case 'MATCHES': {
                // MATCHES uses 1s markets ONLY
                if (strategy.ticks !== 1) {
                    strategy.market_message = 'MATCHES requires 1-tick duration';
                    return { action: 'WAIT' };
                }

                // Entry: highest or least or 2nd most digit increases in power
                const targets = [most_appearing, second_most, least_appearing];
                const increasing_target = targets.find(d => getPowerTrend(d) === 'increasing');

                if (increasing_target !== undefined) {
                    strategy.market_message = `TRADING MATCHES ${increasing_target}...`;
                    return { action: 'TRADE', contractType: 'DIGITMATCH', prediction: increasing_target, confidence: 20 };
                }
                strategy.market_message = 'Waiting for power surge...';
                return { action: 'WAIT' };
            }
            default:
                return { action: 'WAIT' };
        }
    };

    checkRiskLimits = (strategy: TStrategy): boolean => {
        // Individual bot loss limit (Stop Loss)
        if (strategy.enable_tp_sl && strategy.profit_loss <= -strategy.stop_loss) return false;

        // Individual bot Take Profit
        if (strategy.enable_tp_sl && strategy.profit_loss >= strategy.take_profit) return false;

        // Individual bot Max Consecutive Losses
        if (strategy.is_max_loss_enabled && strategy.consecutive_losses >= strategy.max_consecutive_losses) return false;

        // Global Max Stake Limit (still useful as a safety)
        if (this.is_max_stake_enabled && strategy.current_stake > this.max_stake_limit) return false;

        // Global Session P/L (Safety fallback)
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

        // Helper for timeouts
        const timeoutPromise = (ms: number, msg: string) =>
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

        try {
            // PROPOSAL Step with Timeout
            const proposal = await Promise.race([
                api_base.api.send({
                    proposal: 1,
                    amount: strategy.current_stake,
                    basis: 'stake',
                    contract_type: trade_type,
                    currency: this.root_store.client.currency || 'USD',
                    duration: strategy.ticks,
                    duration_unit: 't',
                    symbol: this.symbol,
                    ...((['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(trade_type || '')) && prediction !== undefined ? { barrier: String(prediction) } : {}),
                }),
                timeoutPromise(10000, 'Proposal timed out')
            ]);

            if (proposal.error) {
                console.warn('Strategy Proposal Error:', proposal.error.message);
                runInAction(() => { strategy.status = 'waiting'; });
                return;
            }

            // BUY Step with Timeout
            const buy = await Promise.race([
                api_base.api.send({
                    buy: proposal.proposal.id,
                    price: strategy.current_stake,
                }),
                timeoutPromise(10000, 'Buy timed out')
            ]);

            if (buy.error) {
                console.warn('Strategy Buy Error:', buy.error.message);
                runInAction(() => { strategy.status = 'waiting'; });
                return;
            }

            const contract_id = buy.buy.contract_id;

            runInAction(() => {
                this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_RECEIVED);
            });
            globalObserver.emit('contract.status', {
                id: 'contract.purchase_received',
                buy: buy.buy,
            });

            // Subscription doesn't block the next tick loop directly, but let's ensure we catch errors
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

                            // Update global stats
                            if (status === 'won') {
                                this.wins++;
                                this.consecutive_losses = 0;
                            } else {
                                this.losses++;
                                this.consecutive_losses++;
                            }
                            this.session_pl += profit;
                            this.max_drawdown = Math.min(this.max_drawdown, this.session_pl);

                            // Update per-strategy stats
                            if (status === 'won') {
                                strategy.total_wins++;
                                strategy.consecutive_losses = 0;
                                strategy.current_stake = strategy.stake;
                            } else {
                                strategy.total_losses++;
                                strategy.consecutive_losses++;
                                strategy.current_stake *= strategy.martingale;
                            }
                            strategy.profit_loss += profit;
                            strategy.status = 'waiting';
                        });

                        if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
                    }
                }
            );
        } catch (error: any) {
            console.error('ExecuteStrategyTrade Timeout/Error:', error.message);
            runInAction(() => {
                strategy.status = 'waiting';
                // Optionally add a small delay before retry to avoid spamming a bad connection
            });
        }
    };
    @action
    manualTrade = async (contract_type: string, prediction?: number) => {
        if (!this.root_store.common.is_socket_opened || this.is_executing) return;

        if (!this.root_store.client.is_logged_in) {
            this.root_store.run_panel.showLoginDialog();
            return;
        }

        this.is_executing = true;
        this.root_store.run_panel.setIsRunning(true);
        this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_SENT);
        globalObserver.emit('contract.status', { id: 'contract.purchase_sent' });

        const stake = this.current_stake;
        const symbol = this.symbol;

        try {
            if (!api_base.api) {
                this.is_executing = false;
                this.root_store.run_panel.setIsRunning(false);
                return;
            }

            const proposal_request: any = {
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type,
                currency: this.root_store.client.currency || 'USD',
                duration: 1,
                duration_unit: 't',
                symbol,
            };

            if (prediction !== undefined) {
                proposal_request.barrier = String(prediction);
            }

            const proposal_response = await api_base.api.send(proposal_request);

            if (proposal_response.error) {
                console.error('SmartTrading Manual Proposal Error:', proposal_response.error);
                this.is_executing = false;
                this.root_store.run_panel.setIsRunning(false);
                return;
            }

            const proposal_id = proposal_response.proposal?.id;
            const buy_response = await api_base.api.send({
                buy: proposal_id,
                price: stake,
            });

            if (buy_response.error) {
                console.error('SmartTrading Manual Buy Error:', buy_response.error);
                this.is_executing = false;
                this.root_store.run_panel.setIsRunning(false);
                return;
            }

            const contract_id = buy_response.buy?.contract_id;
            if (contract_id) {
                this.root_store.run_panel.setContractStage(contract_stages.PURCHASE_RECEIVED);
                globalObserver.emit('contract.status', {
                    id: 'contract.purchase_received',
                    buy: buy_response.buy,
                });

                const unsubscribe = api_base.api.subscribe(
                    { proposal_open_contract: 1, contract_id },
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
                                    this.current_stake = this.speedbot_stake;
                                    this.current_streak = this.current_streak < 0 ? 1 : this.current_streak + 1;
                                } else {
                                    this.losses++;
                                    this.consecutive_losses++;
                                    this.current_streak = this.current_streak > 0 ? -1 : this.current_streak - 1;

                                    if (this.use_martingale) {
                                        this.current_stake = this.current_stake * this.martingale_multiplier;
                                        if (this.is_max_stake_enabled && this.current_stake > this.max_stake_limit) {
                                            this.current_stake = this.max_stake_limit;
                                        }
                                    }
                                }
                                this.session_pl += profit;
                                this.is_executing = false;
                            });

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
                this.root_store.run_panel.setIsRunning(false);
            }
        } catch (error) {
            console.error('SmartTrading Manual execution error:', error);
            this.is_executing = false;
            this.root_store.run_panel.setIsRunning(false);
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
    scanBestMarkets = async () => {
        if (!this.root_store.common.is_socket_opened || this.is_scanning || !api_base.api) return;

        this.is_scanning = true;
        this.scan_results = [];
        this.all_markets_stats = [];

        try {
            // Get all synthetic indices symbols
            const symbols = Object.values(this.active_symbols_data)
                .filter(s => s.symbol.startsWith('1HZ') || s.symbol.startsWith('R_') || s.symbol.startsWith('JD'))
                .map(s => s.symbol);

            const analysis_promises = symbols.map(async symbol => {
                try {
                    const response = await api_base.api.send({
                        ticks_history: symbol,
                        adjust_start_time: 1,
                        count: 100,
                        end: 'latest',
                        style: 'ticks',
                    });

                    if (response.error || !response.history?.prices) return null;

                    const prices = response.history.prices;
                    const current_price = prices[prices.length - 1];
                    const digits = prices.map((p: number | string) => {
                        const s = String(p);
                        return parseInt(s[s.length - 1]);
                    });

                    const last_digit = digits[digits.length - 1];

                    // Calculate digit frequency
                    const digit_counts = Array(10).fill(0);
                    digits.forEach((d: number) => digit_counts[d]++);
                    const digit_percentages = digit_counts.map(c => (c / digits.length) * 100);

                    // Even/Odd statistics
                    const evens = digits.filter((d: number) => d % 2 === 0).length;
                    const even_pct = (evens / digits.length) * 100;
                    const odd_pct = 100 - even_pct;

                    // Over/Under statistics
                    const over = digits.filter((d: number) => d > 4).length;
                    const over_pct = (over / digits.length) * 100;
                    const under_pct = 100 - over_pct;

                    // Top 3 digits for Matches
                    const sorted_indices = digit_counts
                        .map((count, digit) => ({ digit, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map(item => item.digit);

                    // Valid Differs targets (2-7, <10%, excluding extremes)
                    const sorted_by_freq = digit_counts
                        .map((count, digit) => ({ digit, percentage: (count / digits.length) * 100 }))
                        .sort((a, b) => b.percentage - a.percentage);

                    const most_frequent = sorted_by_freq[0].digit;
                    const second_most = sorted_by_freq[1].digit;
                    const least_frequent = sorted_by_freq[sorted_by_freq.length - 1].digit;

                    const differs_targets = [2, 3, 4, 5, 6, 7].filter(d =>
                        d !== most_frequent &&
                        d !== second_most &&
                        d !== least_frequent &&
                        digit_percentages[d] < 10
                    );

                    // Calculate overall market score
                    const ev_skew = Math.abs(even_pct - odd_pct);
                    const ou_skew = Math.abs(over_pct - under_pct);
                    const score = Math.max(ev_skew, ou_skew);
                    const reason = ev_skew > ou_skew
                        ? `Strong ${even_pct > odd_pct ? 'Even' : 'Odd'} bias (${score.toFixed(1)}%)`
                        : `Strong ${over_pct > under_pct ? 'Over' : 'Under'} bias (${score.toFixed(1)}%)`;

                    return {
                        symbol,
                        price: String(current_price),
                        last_digit,
                        even_pct,
                        odd_pct,
                        over_pct,
                        under_pct,
                        top_matches: sorted_indices,
                        differs_targets,
                        timestamp: Date.now(),
                        score,
                        reason,
                    };
                } catch (e) {
                    return null;
                }
            });

            const results = (await Promise.all(analysis_promises)).filter(r => r !== null);
            results.sort((a, b) => (b?.score || 0) - (a?.score || 0));

            runInAction(() => {
                this.all_markets_stats = results as any[];
                this.scan_results = results.map(r => ({ symbol: r.symbol, score: r.score, reason: r.reason }));

                if (results.length > 0) {
                    this.best_market = results[0].symbol;
                    this.market_fit_score = Math.round(results[0].score);

                    // Automatically switch to the best market
                    this.setSymbol(results[0].symbol);
                }
                this.is_scanning = false;
            });
        } catch (error) {
            runInAction(() => {
                this.is_scanning = false;
            });
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
