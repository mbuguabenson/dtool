import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './even-odd-tab.scss';

const EvenOddTab = observer(() => {
    const { smart_trading, app } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets, updateDigitStats, active_symbols_data } =
        smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    const [signalTime, setSignalTime] = useState(0);
    const [lastAction, setLastAction] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setSignalTime(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!ticks_service || !symbol) return;

        let is_mounted = true;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            try {
                const callback = (ticks_data: { quote: string | number }[]) => {
                    if (is_mounted && ticks_data && ticks_data.length > 0) {
                        const latest = ticks_data[ticks_data.length - 1];
                        const symbol_info = active_symbols_data[symbol];

                        // Use safe decimal calculation
                        const decimals = symbol_info?.pip ? String(symbol_info.pip).split('.')[1]?.length || 2 : 2;

                        const last_digits = ticks_data.slice(-200).map(t => {
                            let quote_str = String(t.quote || '0');
                            if (typeof t.quote === 'number') {
                                quote_str = t.quote.toFixed(decimals);
                            }
                            const digit = parseInt(quote_str[quote_str.length - 1]);
                            return isNaN(digit) ? 0 : digit;
                        });
                        updateDigitStats(last_digits, latest.quote);
                    }
                };

                listenerKey = await ticks_service.monitor({ symbol, callback });
            } catch (error: any) {
                if (error?.code !== 'AlreadySubscribed' && error?.message !== 'AlreadySubscribed') {
                    console.error('EvenOdd: Failed to monitor ticks', JSON.stringify(error, null, 2));
                }
            }
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    const analyzeEvenOdd = (digits: number[], window: number) => {
        const slice = digits.slice(-window);
        if (slice.length === 0) return { evenPercent: 50, oddPercent: 50, evenCount: 0, oddCount: 0, total: window };
        const evenCount = slice.filter(d => d % 2 === 0).length;
        const oddCount = slice.length - evenCount;
        const total = slice.length;

        return {
            evenPercent: (evenCount / total) * 100,
            oddPercent: (oddCount / total) * 100,
            evenCount,
            oddCount,
            total,
        };
    };

    const analysis = useMemo(
        () => ({
            last10: analyzeEvenOdd(ticks, 10),
            last25: analyzeEvenOdd(ticks, 25),
            last50: analyzeEvenOdd(ticks, 50),
            last100: analyzeEvenOdd(ticks, 100),
        }),
        [ticks]
    );

    const power = useMemo(() => {
        const evenPower = analysis.last100.evenPercent;
        const oddPower = analysis.last100.oddPercent;
        return {
            dominant: evenPower > oddPower ? 'EVEN' : 'ODD',
            dominantPercent: Math.max(evenPower, oddPower),
            weakness: Math.min(evenPower, oddPower),
        };
    }, [analysis]);

    const volatility = useMemo(() => {
        if (ticks.length < 50) return { score: 0, level: 'LOW' };
        const windows = [10, 25, 50];
        const percentages = windows.map(w => analyzeEvenOdd(ticks, w).evenPercent);
        const mean = percentages.reduce((a, b) => a + b) / percentages.length;
        const variance = percentages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / percentages.length;
        const stdDev = Math.sqrt(variance);

        let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (stdDev > 10) level = 'HIGH';
        else if (stdDev > 5) level = 'MEDIUM';

        return { score: stdDev * 4, level }; // Scalar for display
    }, [ticks]);

    const trend = useMemo(() => {
        const currentActive = analysis.last10.evenPercent;
        const prevActive = analysis.last50.evenPercent;
        if (currentActive > prevActive + 2) return 'INCREASING';
        if (currentActive < prevActive - 2) return 'DECREASING';
        return 'STABLE';
    }, [analysis]);

    const signal = useMemo(() => {
        const maxPower = power.dominantPercent;
        const isIncreasing =
            trend === 'INCREASING' ||
            (power.dominant === 'EVEN' ? analysis.last10.evenPercent > 55 : analysis.last10.oddPercent > 55);

        let action = 'NEUTRAL';
        if (maxPower >= 56 && isIncreasing) action = 'TRADE NOW';
        else if (maxPower >= 52) action = 'WAIT';

        if (action !== lastAction) {
            setLastAction(action);
            setSignalTime(0);
        }

        if (action === 'TRADE NOW') {
            return {
                action,
                confidence: 'HIGH',
                recommendation: `${power.dominant} at ${maxPower.toFixed(1)}% - POWERFUL SIGNAL`,
            };
        }
        if (action === 'WAIT') {
            return {
                action,
                confidence: 'MEDIUM',
                recommendation: 'Market momentum is building. Wait for confirmation.',
            };
        }
        return {
            action: 'NEUTRAL',
            confidence: 'LOW',
            recommendation: 'Market is balanced. Waiting for dominance.',
        };
    }, [power, trend, analysis, lastAction]);

    return (
        <div className='even-odd-tab'>
            <div className='premium-market-header'>
                <div className='market-select-glass'>
                    <label>MARKET</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {markets.map(group => (
                            <optgroup key={group.group} label={group.group}>
                                {group.items.map(item => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div className='price-display-glass'>
                    <span className='lbl'>LIVE PRICE</span>
                    <span className='val'>{current_price}</span>
                </div>

                <div className='digit-display-glass'>
                    <span className='lbl'>CURRENT DIGIT</span>
                    <div
                        className={classNames('digit-box', {
                            even: last_digit !== null && last_digit % 2 === 0,
                            odd: last_digit !== null && last_digit % 2 !== 0,
                        })}
                    >
                        {last_digit !== null ? last_digit : '-'}
                    </div>
                </div>
            </div>

            <QuickSettings />

            <div className='analysis-header'>
                <h2>Even vs Odd Analysis</h2>
                <div className={classNames('signal-badge', signal.action.toLowerCase().replace(' ', '-'))}>
                    {signal.action} ({signalTime}s)
                </div>
            </div>

            <div className='signal-recommendation-card'>
                <div className='card-header'>Signal Recommendation</div>
                <div className='rec-content'>
                    <div className='rec-title'>{signal.recommendation}</div>
                    <p>
                        {power.dominant} power is at {power.dominantPercent.toFixed(1)}% and {trend.toLowerCase()}.
                        Market momentum is {volatility.level.toLowerCase()}!
                    </p>
                </div>
            </div>

            <div className='power-cards-grid'>
                <div className={classNames('power-card even', { active: power.dominant === 'EVEN' })}>
                    <div className='top-row'>
                        <span className='pct'>{analysis.last100.evenPercent.toFixed(1)}%</span>
                        <div className='mini-chart-icon'>
                            <div className='trend-up'></div>
                        </div>
                    </div>
                    <div className='label'>EVEN (Current Power)</div>
                    <div className='stat-bars'>
                        <div className='stat-row'>
                            <span>Last 10 ticks</span>
                            <div className='bar-wrapper'>
                                <div className='bar-fill' style={{ width: `${analysis.last10.evenPercent}%` }}></div>
                            </div>
                        </div>
                        <div className='stat-row'>
                            <span>Last 50 ticks</span>
                            <div className='bar-wrapper'>
                                <div className='bar-fill' style={{ width: `${analysis.last50.evenPercent}%` }}></div>
                            </div>
                        </div>
                        <div className='stat-row'>
                            <span>Last hour (100 ticks)</span>
                            <div className='bar-wrapper shadow'>
                                <div className='bar-fill' style={{ width: `${analysis.last100.evenPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={classNames('power-card odd', { active: power.dominant === 'ODD' })}>
                    <div className='top-row'>
                        <span className='pct'>{analysis.last100.oddPercent.toFixed(1)}%</span>
                        <div className='mini-chart-icon'>
                            <div className='trend-up'></div>
                        </div>
                    </div>
                    <div className='label'>ODD (Current Power)</div>
                    <div className='stat-bars'>
                        <div className='stat-row'>
                            <span>Last 10 ticks</span>
                            <div className='bar-wrapper'>
                                <div className='bar-fill' style={{ width: `${analysis.last10.oddPercent}%` }}></div>
                            </div>
                        </div>
                        <div className='stat-row'>
                            <span>Last 50 ticks</span>
                            <div className='bar-wrapper'>
                                <div className='bar-fill' style={{ width: `${analysis.last50.oddPercent}%` }}></div>
                            </div>
                        </div>
                        <div className='stat-row'>
                            <span>Last hour (100 ticks)</span>
                            <div className='bar-wrapper shadow'>
                                <div className='bar-fill' style={{ width: `${analysis.last100.oddPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='metrics-grid'>
                <div className='metric-box volatility'>
                    <span className='lbl'>Market Volatility</span>
                    <span className='val'>{volatility.score.toFixed(1)}%</span>
                    <span className='status'>{volatility.level}</span>
                </div>
                <div className='metric-box trend'>
                    <span className='lbl'>Power Trend</span>
                    <div className='trend-indicator'>
                        <div className={classNames('icon', trend.toLowerCase())}></div>
                        <span className='val'>{trend}</span>
                    </div>
                </div>
                <div className='metric-box change-1h'>
                    <span className='lbl'>1H Change</span>
                    <span className='val'>0.0%</span>
                    <span className='sub'>Last 100 ticks</span>
                </div>
                <div className='metric-box change-recent'>
                    <span className='lbl'>Recent Change</span>
                    <span className='val'>
                        {Math.abs(analysis.last10.evenPercent - analysis.last25.evenPercent).toFixed(1)}%
                    </span>
                    <span className='sub'>Last 10 ticks</span>
                </div>
            </div>

            <div
                className={classNames('big-action-button', power.dominant.toLowerCase(), {
                    executing: smart_trading.is_executing,
                })}
                onClick={() => smart_trading.manualTrade(power.dominant === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD')}
            >
                {smart_trading.is_executing
                    ? 'EXECUTING...'
                    : `TRADE ${power.dominant} NOW - ${power.dominantPercent.toFixed(1)}%`}
            </div>

            <div className='last-digits-tape'>
                <div className='tape-label'>Last 40 Digits</div>
                <div className='digits-row'>
                    {ticks.slice(-40).map((digit, i) => (
                        <div key={i} className={classNames('digit-circle', digit % 2 === 0 ? 'even' : 'odd')}>
                            {digit % 2 === 0 ? 'E' : 'O'}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default EvenOddTab;
