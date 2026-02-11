import { TDigitStat, TAnalysisHistory } from '../stores/analysis-store';

export class DigitStatsEngine {
    ticks: number[] = [];
    current_price: number = 0;
    
    // Configuration
    over_under_threshold = 5;
    match_diff_digit = 6;
    total_samples = 1000;

    // History
    even_odd_history: TAnalysisHistory[] = [];
    over_under_history: TAnalysisHistory[] = [];
    matches_differs_history: TAnalysisHistory[] = [];
    rise_fall_history: TAnalysisHistory[] = [];

    // Cached Stats
    digit_stats: TDigitStat[] = [];

    constructor() {
        this.reset();
    }

    reset() {
        this.ticks = [];
        this.current_price = 0;
        this.even_odd_history = [];
        this.over_under_history = [];
        this.matches_differs_history = [];
        this.rise_fall_history = [];
        this.initDigitStats();
    }

    private initDigitStats() {
        this.digit_stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
            rank: i + 1,
            power: 50,
            is_increasing: false,
        }));
    }

    update(new_ticks: number[], price: number) {
        this.ticks = new_ticks;
        this.current_price = price;
        this.updateStats();
        
        const last_digit = new_ticks.length > 0 ? new_ticks[new_ticks.length - 1] : null;
        if (last_digit !== null) {
            this.updateHistory(last_digit, price);
        }
    }

    setConfig(config: { over_under_threshold?: number; match_diff_digit?: number; total_samples?: number }) {
        if (config.over_under_threshold !== undefined) this.over_under_threshold = config.over_under_threshold;
        if (config.match_diff_digit !== undefined) this.match_diff_digit = config.match_diff_digit;
        if (config.total_samples !== undefined) this.total_samples = config.total_samples;
        
        // Re-calculate stats with new config if needed
        this.updateStats();
    }

    private updateStats() {
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
    }

    private updateHistory(digit: number, price: number) {
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

        // Rise/Fall
        // We need previous price, which is tricky since we only store current. 
        // Logic in store used `this.current_price` BEFORE updating it with new price.
        // For now, let's assume price change logic is handled externally or we store prev_price
        // Simplified: Rise/Fall history needs context of previous tick, which we lose if we just pass `price`.
        // However, `update` is called with new price. The `current_price` member holds the OLD price *before* we update it in `update` method?
        // Wait, `update` sets `this.current_price = price`. So we need to capture prev before setting.
    }
    
    // Override update to handle price history correctly
    updateWithHistory(new_ticks: number[], new_price: number) {
        const prev_price = this.current_price;
        this.ticks = new_ticks;
        this.current_price = new_price;
        this.updateStats();

        const last_digit = new_ticks.length > 0 ? new_ticks[new_ticks.length - 1] : null;
        if (last_digit !== null) {
            // Rise/Fall
            const is_rise = new_price > prev_price;
            this.rise_fall_history.unshift({
                type: is_rise ? 'R' : 'F',
                value: is_rise ? 'Rise' : 'Fall',
                color: is_rise ? '#10b981' : '#ef4444',
            });
            if (this.rise_fall_history.length > 50) this.rise_fall_history.pop();

            this.updateHistory(last_digit, new_price);
        }
    }

    getPercentages() {
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
