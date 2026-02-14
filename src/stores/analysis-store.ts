import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { api_base, ApiHelpers } from '@/external/bot-skeleton';
import { DigitStatsEngine } from '@/lib/digit-stats-engine';
import { DigitTradeEngine } from '@/lib/digit-trade-engine';
import subscriptionManager from '@/lib/subscription-manager';
import RootStore from './root-store';

export type TDigitStat = {
    digit: number;
    count: number;
    percentage: number;
    rank: number;
    power: number;
    is_increasing: boolean;
};

export type TAnalysisHistory = {
    type: 'E' | 'O' | 'U' | 'O_U' | 'M' | 'D' | 'R' | 'F';
    value: string | number;
    color: string;
};

type TTick = {
    symbol: string;
    quote: number | string;
    epoch: number;
};

type TDerivResponse = {
    msg_type: string;
    tick?: TTick;
    history?: { prices: (number | string)[] };
    ticks_history?: { prices: (number | string)[] };
    subscription?: { id: string };
    error?: { code: string; message: string };
};

export default class AnalysisStore {
    root_store: RootStore;
    stats_engine: DigitStatsEngine;
    trade_engine: DigitTradeEngine;

    @observable accessor digit_stats: TDigitStat[] = [];
    @observable accessor ticks: number[] = [];
    @observable accessor symbol = 'R_100';
    @observable accessor current_price: string | number = '0.00';
    @observable accessor last_digit: number | null = null;
    @observable accessor total_ticks = 1000;

    @observable accessor is_connected = false;
    @observable accessor is_loading = false;
    @observable accessor error_message: string | null = null;
    @observable accessor is_subscribing = false;

    @observable accessor percentages = {
        even: 50,
        odd: 50,
        over: 50,
        under: 50,
        match: 10,
        differ: 90,
        rise: 50,
        fall: 50,
    };
    @observable accessor current_streaks = {
        even_odd: { count: 0, type: '' },
        over_under: { count: 0, type: '' },
        match_diff: { count: 0, type: '' },
        rise_fall: { count: 0, type: '' },
    };

    // History (Delegated to engine but observable here for UI)
    @observable accessor even_odd_history: TAnalysisHistory[] = [];
    @observable accessor over_under_history: TAnalysisHistory[] = [];
    @observable accessor matches_differs_history: TAnalysisHistory[] = [];
    @observable accessor rise_fall_history: TAnalysisHistory[] = [];

    // Settings
    @observable accessor over_under_threshold = 5;
    @observable accessor match_diff_digit = 6;
    @observable accessor markets: { group: string; items: { value: string; label: string }[] }[] = [];

    @observable accessor subscription_id: string | null = null;

    private unsubscribe_ticks: (() => Promise<void> | void) | null = null;

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;
        this.stats_engine = new DigitStatsEngine();
        this.trade_engine = new DigitTradeEngine();

        // Sync engine configs
        this.updateEngineConfig();

        reaction(
            () => this.root_store.common?.is_socket_opened,
            is_socket_opened => {
                this.is_connected = !!is_socket_opened;
                if (is_socket_opened) {
                    this.fetchMarkets();
                    if (!this.unsubscribe_ticks) {
                        this.subscribeToTicks(); // Auto-subscribe if connected and not already
                    }
                } else {
                    this.unsubscribeFromTicks(); // Clean up on disconnect
                }
            }
        );

        if (this.root_store.common?.is_socket_opened) {
            this.is_connected = true;
            this.fetchMarkets();
            this.subscribeToTicks();
        }
    }

    @action
    updateEngineConfig = () => {
        this.stats_engine.setConfig({
            over_under_threshold: this.over_under_threshold,
            match_diff_digit: this.match_diff_digit,
            total_samples: this.total_ticks,
        });
        this.refreshStats(); // Update observables from engine
    };

    @action
    init = async () => {
        if (this.is_connected) {
            this.subscribeToTicks();
        }
    };

    @action
    handleTick = (tick: TTick) => {
        if (tick.symbol !== this.symbol) return;

        const price = Number(tick.quote);
        const price_str = String(tick.quote);
        const last_char = price_str[price_str.length - 1];
        const new_digit = parseInt(last_char);

        if (!isNaN(new_digit)) {
            const current_ticks = [...this.ticks, new_digit];
            if (current_ticks.length > this.total_ticks) current_ticks.shift();

            this.ticks = current_ticks;
            this.last_digit = new_digit;
            this.current_price = price;

            // Push to engine
            this.stats_engine.updateWithHistory(this.ticks, price);
            this.refreshStats();

            // Push to trade engine
            this.trade_engine.processTick(
                new_digit,
                { percentages: this.stats_engine.getPercentages(), digit_stats: this.stats_engine.digit_stats },
                this.symbol,
                this.root_store.client.currency || 'USD'
            );
        }
    };

    @action
    updateDigitStats = (digits: number[], quote: string | number) => {
        this.ticks = digits;
        this.current_price = Number(quote);
        const last = digits[digits.length - 1];
        if (last !== undefined) this.last_digit = last;

        this.stats_engine.update(digits, Number(quote));
        this.refreshStats();
    };

    @action
    subscribeToTicks = async (retry_count = 0) => {
        if (!this.is_connected || !this.symbol) {
            return;
        }

        // Prevent duplicate subscription attempts
        if (this.is_subscribing || this.unsubscribe_ticks) {
            return;
        }

        this.is_subscribing = true;
        this.is_loading = true;
        this.error_message = null;

        try {
            // Unsubscribe existing if any (safety check)
            const unsubscribe = this.unsubscribe_ticks;
            if (unsubscribe && typeof unsubscribe === 'function') {
                (unsubscribe as () => void)();
                this.unsubscribe_ticks = null;
            }
            if (api_base.api) {
                subscriptionManager.setApi(api_base.api);
            }

            console.log(`[AnalysisStore] Subscribing to ${this.symbol} (attempt ${retry_count + 1})`);

            this.unsubscribe_ticks = await subscriptionManager.subscribeToTicks(
                this.symbol,
                action((data: unknown) => {
                    const response = data as TDerivResponse;
                    if (response.msg_type === 'tick' && response.tick) {
                        if (response.tick.symbol === this.symbol) {
                            this.handleTick(response.tick);
                            runInAction(() => {
                                this.is_loading = false;
                                this.error_message = null;
                            });
                        }
                    } else if (response.msg_type === 'history' && response.history) {
                        const prices = response.history.prices;
                        if (prices && prices.length > 0) {
                            runInAction(() => {
                                const last_digits = prices.map((p: number | string) => {
                                    const s = String(p);
                                    const digit = parseInt(s[s.length - 1]);
                                    return isNaN(digit) ? 0 : digit;
                                });

                                const last_price = Number(prices[prices.length - 1]);
                                this.current_price = last_price;
                                this.ticks = last_digits;

                                // Hydrate engine
                                this.stats_engine.update(last_digits, last_price);
                                this.refreshStats();
                                this.is_loading = false;
                                this.error_message = null;
                            });
                        }
                    }
                })
            );

            console.log('[AnalysisStore] Subscription successful');
        } catch (e: unknown) {
            console.error('[AnalysisStore] Subscribe error:', e);
            const message = (e as Error)?.message || 'Failed to subscribe';

            runInAction(() => {
                this.error_message = message;
                this.is_loading = false;
                this.unsubscribe_ticks = null;
            });

            // Auto-retry logic: Max 3 retries with 2s delay
            if (retry_count < 3) {
                console.log(`[AnalysisStore] Retrying subscription in 2s... (${retry_count + 1}/3)`);
                setTimeout(() => {
                    runInAction(() => {
                        this.is_subscribing = false; // Reset so retry can proceed
                        this.subscribeToTicks(retry_count + 1);
                    });
                }, 2000);
            }
        } finally {
            runInAction(() => {
                this.is_subscribing = false;
            });
        }
    };

    @action
    unsubscribeFromTicks = () => {
        if (this.unsubscribe_ticks) {
            this.unsubscribe_ticks();
            this.unsubscribe_ticks = null;
        }

        runInAction(() => {
            this.subscription_id = null;
            this.is_loading = false;
            this.error_message = null;
            this.stats_engine.reset();
            this.refreshStats();
            this.ticks = [];
        });
    };

    @action
    refreshStats = () => {
        // Sync observables from engine state
        this.digit_stats = this.stats_engine.digit_stats;
        this.even_odd_history = this.stats_engine.even_odd_history;
        this.over_under_history = this.stats_engine.over_under_history;
        this.matches_differs_history = this.stats_engine.matches_differs_history;
        this.rise_fall_history = this.stats_engine.rise_fall_history;

        this.percentages = this.stats_engine.getPercentages();

        const getStreak = (history: TAnalysisHistory[]) => {
            if (history.length === 0) return { count: 0, type: '' };
            const type = history[0].type;
            let count = 0;
            for (const h of history) {
                if (h.type === type) count++;
                else break;
            }
            return { count, type };
        };

        this.current_streaks = {
            even_odd: getStreak(this.even_odd_history),
            over_under: getStreak(this.over_under_history),
            match_diff: getStreak(this.matches_differs_history),
            rise_fall: getStreak(this.rise_fall_history),
        };
    };

    @action
    setSymbol = (symbol: string) => {
        if (this.symbol === symbol) return;

        this.unsubscribeFromTicks();
        this.symbol = symbol;
        this.subscribeToTicks();
    };

    @action
    fetchMarkets = async () => {
        if (!ApiHelpers.instance) {
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
            const symbols = await (
                ApiHelpers.instance as unknown as {
                    active_symbols: {
                        retrieveActiveSymbols: () => Promise<
                            Array<{
                                is_trading_suspended: number | boolean;
                                market_display_name?: string;
                                market: string;
                                symbol: string;
                                display_name: string;
                                pip: number;
                            }>
                        >;
                    };
                }
            ).active_symbols.retrieveActiveSymbols();

            runInAction(() => {
                if (symbols && Array.isArray(symbols)) {
                    const groups: Record<string, { group: string; items: { value: string; label: string }[] }> = {};
                    symbols.forEach(s => {
                        if (s.is_trading_suspended) return;
                        const market_name = s.market_display_name || s.market;
                        if (!groups[market_name]) groups[market_name] = { group: market_name, items: [] };
                        groups[market_name].items.push({ value: s.symbol, label: s.display_name });
                    });
                    this.markets = Object.values(groups).sort((a, b) => a.group.localeCompare(b.group));
                }
            });
        } catch (error) {
            console.error('Error fetching markets in AnalysisStore:', error);
        }
    };

    @action
    setTotalTicks = (count: number) => {
        this.total_ticks = count;
        this.updateEngineConfig();
    };

    @action
    setMatchDiffDigit = (digit: number) => {
        this.match_diff_digit = digit;
        this.updateEngineConfig();
    };

    @action
    setOverUnderThreshold = (threshold: number) => {
        this.over_under_threshold = threshold;
        this.updateEngineConfig();
    };
}
