import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { ApiHelpers, api_base } from '@/external/bot-skeleton';
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

export default class AnalysisStore {
    root_store: RootStore;

    @observable accessor digit_stats: TDigitStat[] = Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
        rank: i + 1,
        power: 50,
        is_increasing: false,
    }));

    @observable accessor ticks: number[] = [];
    @observable accessor symbol = 'R_100';
    @observable accessor current_price: string | number = '0.00';
    @observable accessor last_digit: number | null = null;
    @observable accessor total_ticks = 1000;
    @observable accessor is_connected = false;

    @observable accessor even_odd_history: TAnalysisHistory[] = [];
    @observable accessor over_under_history: TAnalysisHistory[] = [];
    @observable accessor matches_differs_history: TAnalysisHistory[] = [];
    @observable accessor rise_fall_history: TAnalysisHistory[] = [];

    @observable accessor over_under_threshold = 5;
    @observable accessor match_diff_digit = 6;
    @observable accessor markets: { group: string; items: { value: string; label: string }[] }[] = [];
    
    @observable accessor subscription_id: string | null = null;
    private msg_subscription: any = null;

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;

        reaction(
            () => this.root_store.common?.is_socket_opened,
            is_socket_opened => {
                this.is_connected = !!is_socket_opened;
                if (is_socket_opened) {
                    this.fetchMarkets();
                    this.subscribeToTicks(); // Auto-subscribe if connected
                } else {
                    this.unsubscribeFromTicks(); // Clean up on disconnect
                }
            }
        );

        if (this.root_store.common?.is_socket_opened) {
            this.fetchMarkets();
        }
    }

    @action
    init = async () => {
        if (this.is_connected) {
            this.subscribeToTicks();
        }
    };

    @action
    handleTick = (tick: any) => {
        if (tick.symbol !== this.symbol) return;
        
        const price = tick.quote;
        const price_str = String(price);
        const last_char = price_str[price_str.length - 1];
        const new_digit = parseInt(last_char);

        if (!isNaN(new_digit)) {
            const current_ticks = [...this.ticks];
            current_ticks.push(new_digit);
            if (current_ticks.length > 1000) current_ticks.shift();
            
            this.updateDigitStats(current_ticks, price);
        }
    };

    @observable accessor is_subscribing = false;

    @action
    subscribeToTicks = async () => {
        if (!this.is_connected || !this.symbol) return;
        if (this.is_subscribing) return;
        
        this.is_subscribing = true;
        this.unsubscribeFromTicks();

        try {
            // Setup listener
            this.msg_subscription = api_base.api.onMessage().subscribe((response: any) => {
                if (response.msg_type === 'tick' && response.tick) {
                    this.handleTick(response.tick);
                }
            });

            // Get history
            const history = await api_base.api.send({
                ticks_history: this.symbol,
                adjust_start_time: 1,
                count: 100,
                end: 'latest',
                style: 'ticks',
            });

            if (history.ticks_history) {
                const prices = history.ticks_history.prices || [];
                const last_digits = prices.map((p: any) => {
                     const s = String(p);
                     return parseInt(s[s.length-1]);
                }).filter((d: any) => !isNaN(d));
                
                runInAction(() => {
                    this.ticks = last_digits;
                    this.current_price = prices[prices.length - 1];
                    this.updateStats();
                });
            }

            // Subscribe
            const sub = await api_base.api.send({
                ticks: this.symbol,
                subscribe: 1
            });
            
            if (sub.subscription) {
                runInAction(() => {
                    this.subscription_id = sub.subscription.id;
                });
            }

        } catch (e: any) {
            const errorCode = e?.error?.code || e?.code;
            if (errorCode === 'AlreadySubscribed') {
                 console.log(`[AnalysisStore] Already subscribed to ${this.symbol}, using existing stream.`);
            } else {
                 console.error('[AnalysisStore] Subscribe error:', e);
            }
        } finally {
            runInAction(() => {
                this.is_subscribing = false;
            });
        }
    };

    @action
    unsubscribeFromTicks = () => {
        if (this.subscription_id) {
            api_base.api.send({ forget: this.subscription_id }).catch(() => {});
            runInAction(() => {
                this.subscription_id = null;
            });
        }
        if (this.msg_subscription) {
            this.msg_subscription.unsubscribe();
            this.msg_subscription = null;
        }
    };

    @action
    updateDigitStats = (last_digits: number[], price: string | number) => {
        runInAction(() => {
            this.current_price = price;
            const price_str = String(price);
            const last_char = price_str[price_str.length - 1];
            const current_digit = parseInt(last_char);

            if (!isNaN(current_digit)) {
                this.last_digit = current_digit;
            }

            this.ticks = last_digits;
            this.updateStats();
            this.updateHistory(this.last_digit || 0, Number(price));
            this.root_store.smart_auto.processTick();
        });
    };

    @action
    updateStats = () => {
        const counts = Array(10).fill(0);
        this.ticks.forEach(d => counts[d]++);

        const total = this.ticks.length || 1;
        
        // Calculate powers/trend for each digit
        const last_50_ticks = this.ticks.slice(-50);
        const last_10_ticks = this.ticks.slice(-10);
        
        // Rank digits by frequency
        const sorted_indices = counts
            .map((c, i) => ({ count: c, index: i }))
            .sort((a, b) => b.count - a.count);

        this.digit_stats = counts.map((count, digit) => {
            const percentage = (count / total) * 100;
            
            // Calculate rank (1=most, 10=least)
            const rank = sorted_indices.findIndex(s => s.index === digit) + 1;
            
            // Calculate power movement (trend)
            const recent_count = last_10_ticks.filter(d => d === digit).length;
            const mid_count = last_50_ticks.filter(d => d === digit).length / 5;
            const is_increasing = recent_count > mid_count;
            const power = 50 + (recent_count - mid_count) * 10;

            return {
                digit,
                count,
                percentage,
                rank,
                power: Math.min(100, Math.max(0, power)),
                is_increasing,
            };
        });
    };

    @action
    updateHistory = (digit: number, price: number) => {
        // Even/Odd
        const is_even = digit % 2 === 0;
        this.even_odd_history.unshift({
            type: is_even ? 'E' : 'O',
            value: is_even ? 'Even' : 'Odd',
            color: is_even ? '#10b981' : '#ef4444',
        });
        if (this.even_odd_history.length > 50) this.even_odd_history.pop();

        // Over/Under
        const is_over = digit > this.over_under_threshold;
        this.over_under_history.unshift({
            type: is_over ? 'O' : 'U',
            value: is_over ? 'Over' : 'Under',
            color: is_over ? '#10b981' : '#ef4444',
        });
        if (this.over_under_history.length > 50) this.over_under_history.pop();

        // Matches/Differs
        const is_match = digit === this.match_diff_digit;
        this.matches_differs_history.unshift({
            type: is_match ? 'M' : 'D',
            value: is_match ? 'Match' : 'Differ',
            color: is_match ? '#3b82f6' : '#f59e0b',
        });
        if (this.matches_differs_history.length > 50) this.matches_differs_history.pop();

        // Rise/Fall (simplified, based on previous tick)
        const prev_price = this.current_price;
        const is_rise = price > Number(prev_price);
        this.rise_fall_history.unshift({
            type: is_rise ? 'R' : 'F',
            value: is_rise ? 'Rise' : 'Fall',
            color: is_rise ? '#10b981' : '#ef4444',
        });
        if (this.rise_fall_history.length > 50) this.rise_fall_history.pop();
    };

    @action
    setSymbol = (symbol: string) => {
        if (this.symbol === symbol) return;

        this.symbol = symbol;
        this.ticks = [];
        this.even_odd_history = [];
        this.over_under_history = [];
        this.matches_differs_history = [];
        this.rise_fall_history = [];
        
        this.subscribeToTicks(); // Resubscribe to new symbol
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
            const symbols = await (ApiHelpers.instance as any).active_symbols.retrieveActiveSymbols();
            runInAction(() => {
                if (symbols && Array.isArray(symbols)) {
                    const groups: Record<string, any> = {};
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
    };

    @action
    setMatchDiffDigit = (digit: number) => {
        this.match_diff_digit = digit;
        this.updateStats(); // Refresh percentages for new digit
    };

    @action
    setOverUnderThreshold = (threshold: number) => {
        this.over_under_threshold = threshold;
        this.updateStats();
    };

    get current_streaks() {
        return {
            even_odd: this.calculateStreak(this.even_odd_history),
            over_under: this.calculateStreak(this.over_under_history),
            match_diff: this.calculateStreak(this.matches_differs_history),
            rise_fall: this.calculateStreak(this.rise_fall_history),
        };
    }

    calculateStreak(history: TAnalysisHistory[]) {
        if (history.length === 0) return { count: 0, type: '' };
        const first = history[0];
        let count = 0;
        for (const item of history) {
            if (item.type === first.type) count++;
            else break;
        }
        return { count, type: String(first.value) };
    }

    get percentages() {
        const total = this.ticks.length || 1;
        const evens = this.ticks.filter(d => d % 2 === 0).length;
        const overs = this.ticks.filter(d => d > this.over_under_threshold).length;
        const matches = this.ticks.filter(d => d === this.match_diff_digit).length;
        const rises = this.rise_fall_history.filter(h => h.type === 'R').length;

        return {
            even: (evens / total) * 100,
            odd: ((total - evens) / total) * 100,
            over: (overs / total) * 100,
            under: ((total - overs) / total) * 100,
            match: (matches / total) * 100,
            differ: ((total - matches) / total) * 100,
            rise: (rises / (this.rise_fall_history.length || 1)) * 100,
            fall: 100 - (rises / (this.rise_fall_history.length || 1)) * 100,
        };
    }
}
