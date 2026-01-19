import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './over-under-tab.scss';

// Analysis Interfaces
interface OverUnderAnalysis {
    selectedDigit: number;
    underDigits: number[];
    overDigits: number[];
    currentDigits: number[];
    underPercent: number;
    overPercent: number;
    currentPercent: number;
    underCount: number;
    overCount: number;
    currentCount: number;
    total: number;
}

interface DigitPower {
    frequency: number;
    momentum: number;
    gap: number;
    powerScore: number;
    strength: 'VERY STRONG' | 'STRONG' | 'MODERATE' | 'WEAK';
}

interface Confidence {
    level: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
    percent: number;
    difference: number;
}

interface Prediction {
    prediction: 'UNDER' | 'OVER' | 'CURRENT' | 'WAIT';
    confidence: string;
    reasoning: string;
}

// Analysis Functions
const analyzeOverUnder = (digits: number[], threshold: number): OverUnderAnalysis => {
    const underDigits = digits.filter(d => d < threshold);
    const overDigits = digits.filter(d => d > threshold);
    const currentDigits = digits.filter(d => d === threshold);
    const total = digits.length || 1;

    return {
        selectedDigit: threshold,
        underDigits,
        overDigits,
        currentDigits,
        underPercent: (underDigits.length / total) * 100,
        overPercent: (overDigits.length / total) * 100,
        currentPercent: (currentDigits.length / total) * 100,
        underCount: underDigits.length,
        overCount: overDigits.length,
        currentCount: currentDigits.length,
        total,
    };
};

const calculateDigitPower = (digit: number, recentDigits: number[]): DigitPower => {
    if (recentDigits.length === 0) {
        return { frequency: 0, momentum: 0, gap: 0, powerScore: 0, strength: 'WEAK' };
    }

    // Frequency in overall sample
    const frequency = recentDigits.filter(d => d === digit).length;
    const frequencyPercent = (frequency / recentDigits.length) * 100;

    // Momentum in recent 25 ticks
    const recent = recentDigits.slice(-25);
    const recentCount = recent.filter(d => d === digit).length;
    const momentum = recent.length > 0 ? (recentCount / recent.length) * 100 : 0;

    // Gap since last appearance
    const lastIndex = recentDigits.lastIndexOf(digit);
    const gap = lastIndex >= 0 ? recentDigits.length - lastIndex - 1 : recentDigits.length;

    // Combined score (weighted)
    const powerScore = frequencyPercent * 0.5 + momentum * 0.4 - gap * 0.1;

    const strength: DigitPower['strength'] =
        powerScore >= 15 ? 'VERY STRONG' : powerScore >= 10 ? 'STRONG' : powerScore >= 5 ? 'MODERATE' : 'WEAK';

    return {
        frequency: frequencyPercent,
        momentum,
        gap,
        powerScore,
        strength,
    };
};

const calculateConfidence = (analysis: OverUnderAnalysis): Confidence => {
    const maxPercent = Math.max(analysis.underPercent, analysis.overPercent);
    const difference = Math.abs(analysis.underPercent - analysis.overPercent);

    const level: Confidence['level'] =
        maxPercent >= 65
            ? 'VERY HIGH'
            : maxPercent >= 60
              ? 'HIGH'
              : maxPercent >= 55 || difference >= 20
                ? 'MEDIUM'
                : 'LOW';

    return {
        level,
        percent: maxPercent,
        difference,
    };
};

const generatePrediction = (analysis: OverUnderAnalysis, power: DigitPower, confidence: Confidence): Prediction => {
    // Determine dominant side
    const dominant =
        analysis.underPercent > analysis.overPercent
            ? 'UNDER'
            : analysis.overPercent > analysis.underPercent
              ? 'OVER'
              : 'BALANCED';

    // Check if current digit is hot
    const isCurrentHot = power.strength === 'VERY STRONG' || power.strength === 'STRONG';

    // Generate prediction
    if (isCurrentHot && power.powerScore >= 12) {
        return {
            prediction: 'CURRENT',
            confidence: 'HIGH',
            reasoning: `Digit ${analysis.selectedDigit} is ${power.strength.toLowerCase()} (${power.powerScore.toFixed(1)}% power)`,
        };
    }

    if (dominant !== 'BALANCED' && confidence.level !== 'LOW') {
        return {
            prediction: dominant as 'UNDER' | 'OVER',
            confidence: confidence.level,
            reasoning: `${dominant} has ${confidence.percent.toFixed(1)}% dominance with ${confidence.difference.toFixed(1)}% lead`,
        };
    }

    return {
        prediction: 'WAIT',
        confidence: 'LOW',
        reasoning: `Market building trend at ${confidence.percent.toFixed(1)}%`,
    };
};

const OverUnderTab = observer(() => {
    const { smart_trading, app } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets, updateDigitStats, active_symbols_data } =
        smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    const [selectedDigit, setSelectedDigit] = useState(4);

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
                    console.error('OverUnder: Failed to monitor ticks', error);
                }
            }
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    // Analysis calculations
    const analysis = useMemo(() => analyzeOverUnder(ticks, selectedDigit), [ticks, selectedDigit]);

    const power = useMemo(() => calculateDigitPower(selectedDigit, ticks), [selectedDigit, ticks]);

    const confidence = useMemo(() => calculateConfidence(analysis), [analysis]);

    const prediction = useMemo(() => generatePrediction(analysis, power, confidence), [analysis, power, confidence]);

    // Calculate digit power for selector rings
    const digitPowerMap = useMemo(() => {
        const map: Record<number, DigitPower> = {};
        for (let i = 0; i <= 9; i++) {
            map[i] = calculateDigitPower(i, ticks);
        }
        return map;
    }, [ticks]);

    // Calculate metrics
    const metrics = useMemo(() => {
        if (ticks.length < 10) return { volatility: 0, changeRate: 0, marketPower: 50 };

        // Volatility - standard deviation of percentages
        const windows = [10, 25, 50];
        const percentages = windows
            .filter(w => ticks.length >= w)
            .map(w => analyzeOverUnder(ticks.slice(-w), selectedDigit).overPercent);

        const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        const variance = percentages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / percentages.length;
        const volatility = Math.sqrt(variance);

        // Change rate - difference between last 10 and last 50
        const recent10 = analyzeOverUnder(ticks.slice(-10), selectedDigit);
        const recent50 = analyzeOverUnder(ticks.slice(-50), selectedDigit);
        const changeRate = Math.abs(recent10.overPercent - recent50.overPercent);

        // Market power - dominant side percentage
        const marketPower = Math.max(analysis.underPercent, analysis.overPercent);

        return { volatility, changeRate, marketPower };
    }, [ticks, selectedDigit, analysis]);

    // Get under/over digit ranges
    const underRange =
        selectedDigit === 0
            ? 'None'
            : `0, ${Array.from({ length: selectedDigit }, (_, i) => i)
                  .slice(1)
                  .join(', ')}`;
    const overRange =
        selectedDigit === 9
            ? 'None'
            : Array.from({ length: 9 - selectedDigit }, (_, i) => selectedDigit + 1 + i).join(', ');

    return (
        <div className='over-under-tab'>
            {/* Header with Market Selection, Price, and Last Digit */}
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
                    <span className='lbl'>LAST DIGIT</span>
                    <div
                        className={classNames('digit-box', {
                            over: last_digit !== null && last_digit > selectedDigit,
                            under: last_digit !== null && last_digit < selectedDigit,
                            current: last_digit !== null && last_digit === selectedDigit,
                        })}
                    >
                        {last_digit !== null ? last_digit : '-'}
                    </div>
                </div>
            </div>

            <QuickSettings />

            {/* Title */}
            <div className='analysis-header'>
                <h2>
                    Under (0-{selectedDigit}) / Over ({selectedDigit + 1}-9) Analysis (Last {ticks.length} Ticks)
                </h2>
            </div>

            {/* Prediction Badge */}
            <div className={classNames('prediction-badge-large', prediction.prediction.toLowerCase())}>
                <div className='badge-content'>
                    <div className='prediction-text'>{prediction.prediction}</div>
                    <div className='reasoning-text'>{prediction.reasoning}</div>
                </div>
            </div>

            {/* Under/Over Cards Row */}
            <div className='under-over-cards-row'>
                <div
                    className={classNames('uo-card under-card', {
                        dominant: analysis.underPercent > analysis.overPercent,
                    })}
                >
                    <div className='uo-card-header'>
                        <span className='label'>Under ({underRange || 'None'})</span>
                        <span className='percentage'>{analysis.underPercent.toFixed(1)}%</span>
                    </div>
                    <div className='progress-bar'>
                        <div className='progress-fill under-fill' style={{ width: `${analysis.underPercent}%` }} />
                    </div>
                    <div className='card-footer'>
                        Highest: Sept {ticks.length > 0 ? Math.max(...ticks.filter(d => d < selectedDigit)) : 0} (
                        {ticks.filter(d => d < selectedDigit).length}x)
                    </div>
                </div>

                <div
                    className={classNames('uo-card over-card', {
                        dominant: analysis.overPercent > analysis.underPercent,
                    })}
                >
                    <div className='uo-card-header'>
                        <span className='label'>Over ({overRange || 'None'})</span>
                        <span className='percentage'>{analysis.overPercent.toFixed(1)}%</span>
                    </div>
                    <div className='progress-bar'>
                        <div className='progress-fill over-fill' style={{ width: `${analysis.overPercent}%` }} />
                    </div>
                    <div className='card-footer'>
                        Highest: Sept {ticks.length > 0 ? Math.max(...ticks.filter(d => d > selectedDigit)) || 0 : 0} (
                        {ticks.filter(d => d > selectedDigit).length}x)
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div className='metrics-row'>
                <div className='metric-box volatility-box'>
                    <div className='metric-label'>Market Volatility</div>
                    <div className='metric-value'>{metrics.volatility.toFixed(2)}</div>
                </div>
                <div className='metric-box change-box'>
                    <div className='metric-label'>Change Rate</div>
                    <div className='metric-value'>{metrics.changeRate.toFixed(1)}%</div>
                </div>
                <div className='metric-box power-box'>
                    <div className='metric-label'>Market Power</div>
                    <div className='metric-value'>{metrics.marketPower.toFixed(1)}%</div>
                </div>
            </div>

            {/* Action Button */}
            <button
                className={classNames('action-button', prediction.prediction.toLowerCase(), {
                    executing: smart_trading.is_executing,
                })}
                onClick={() =>
                    smart_trading.manualTrade(
                        prediction.prediction === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER',
                        selectedDigit
                    )
                }
            >
                {smart_trading.is_executing ? 'EXECUTING...' : prediction.prediction}
            </button>

            {/* Large Under/Over Display */}
            <div className='large-uo-display'>
                <div className='large-title'>
                    Under (0-{selectedDigit}) / Over ({selectedDigit + 1}-9) Analysis
                </div>
                <div className='large-cards-row'>
                    <div className='large-card under-large'>
                        <div className='large-label'>Under (0-{selectedDigit})</div>
                        <div className='large-percentage'>{analysis.underPercent.toFixed(1)}%</div>
                        <div className='large-footer'>Highest: Sept 3 (6x)</div>
                    </div>
                    <div className='large-card over-large'>
                        <div className='large-label'>Over ({selectedDigit + 1}-9)</div>
                        <div className='large-percentage'>{analysis.overPercent.toFixed(1)}%</div>
                        <div className='large-footer'>Highest: Sept 9 (6x)</div>
                    </div>
                </div>
            </div>

            {/* Digit Selector */}
            <div className='digit-selector-section'>
                <div className='selector-title'>Select Digit for Over/Under Analysis</div>
                <div className='digit-selector-grid'>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                        const digitPow = digitPowerMap[digit];
                        const isSelected = digit === selectedDigit;

                        return (
                            <button
                                key={digit}
                                onClick={() => setSelectedDigit(digit)}
                                className={classNames('digit-btn', {
                                    selected: isSelected,
                                    'very-strong': digitPow.strength === 'VERY STRONG',
                                    strong: digitPow.strength === 'STRONG',
                                })}
                            >
                                {digit}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Current Digit Power Card */}
            <div className='digit-power-card'>
                <div className='power-card-header'>
                    <span className='power-title'>Digit {selectedDigit} Prediction Power</span>
                    <span className={classNames('strength-badge', power.strength.toLowerCase().replace(' ', '-'))}>
                        {power.strength}
                    </span>
                </div>
                <div className='power-metrics-grid'>
                    <div className='power-metric'>
                        <div className='power-metric-label'>Frequency (Last 50)</div>
                        <div className='power-metric-value'>{power.frequency.toFixed(1)}%</div>
                        <div className='power-metric-sub'>{Math.round((power.frequency / 100) * 50)} ticks</div>
                    </div>
                    <div className='power-metric'>
                        <div className='power-metric-label'>Momentum (Last 25)</div>
                        <div className='power-metric-value'>{power.momentum.toFixed(1)}%</div>
                        <div className='power-metric-sub'>{Math.round((power.momentum / 100) * 25)} ticks</div>
                    </div>
                    <div className='power-metric'>
                        <div className='power-metric-label'>Prediction Confidence</div>
                        <div className='confidence-bar-wrapper'>
                            <div className='confidence-bar'>
                                <div
                                    className='confidence-fill'
                                    style={{ width: `${Math.min(power.powerScore * 5, 100)}%` }}
                                />
                            </div>
                            <span className='confidence-badge'>{confidence.level}</span>
                        </div>
                        <div className='power-metric-value confidence-percent'>
                            {Math.min(power.powerScore * 5, 100).toFixed(1)}% Confidence
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bars for Over/Under */}
            <div className='side-progress-bars'>
                <div className='side-bar-row'>
                    <span className='side-label'>Over ({selectedDigit + 1}-9)</span>
                    <div className='side-bar over-bar'>
                        <div className='side-bar-fill over-fill' style={{ width: `${analysis.overPercent}%` }} />
                    </div>
                    <span className='side-percentage'>{analysis.overPercent.toFixed(1)}%</span>
                </div>
                <div className='side-bar-row'>
                    <span className='side-label'>Under (0-{selectedDigit})</span>
                    <div className='side-bar under-bar'>
                        <div className='side-bar-fill under-fill' style={{ width: `${analysis.underPercent}%` }} />
                    </div>
                    <span className='side-percentage'>{analysis.underPercent.toFixed(1)}%</span>
                </div>
            </div>

            {/* Digit Appearance Text */}
            <div className='digit-appearance-text'>
                Digit {selectedDigit} appeared {analysis.currentCount} times ({analysis.currentPercent.toFixed(1)}%)
            </div>

            {/* Visual Timeline - Last 40 Digits */}
            <div className='visual-timeline'>
                <div className='timeline-title'>
                    Last 40 Digits (U = Under, O = Over, C = Current Digit {selectedDigit})
                </div>
                <div className='timeline-grid'>
                    {ticks.slice(-40).map((digit, idx) => {
                        const status = digit < selectedDigit ? 'U' : digit > selectedDigit ? 'O' : 'C';
                        const isLatest = idx === ticks.slice(-40).length - 1;

                        return (
                            <div
                                key={idx}
                                className={classNames('timeline-box', status.toLowerCase(), {
                                    latest: isLatest,
                                })}
                                title={`Digit: ${digit}`}
                            >
                                {status}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default OverUnderTab;
