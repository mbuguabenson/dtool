import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction, autorun } from 'mobx';
import { useStore } from '@/hooks/useStore';
import { api_base } from '@/external/bot-skeleton';
import { 
    LabelPairedPlayMdFillIcon, 
    LabelPairedSquareMdFillIcon, 
    LabelPairedArrowsRotateMdRegularIcon 
} from '@deriv/quill-icons/LabelPaired';
import './digit-cracker.scss';

const DigitCracker = observer(() => {
    const { smart_auto, analysis, client } = useStore();
    const [activeStrategy, setActiveStrategy] = useState<'even_odd' | 'differs' | 'matches' | 'over_under'>('even_odd');
    const [activeLogTab, setActiveLogTab] = useState<'summary' | 'transactions' | 'journal'>('summary');
    const logRef = useRef<HTMLDivElement>(null);
    const subscriptionRef = useRef<any>(null);

    const { digit_stats, last_digit, percentages, even_odd_history, over_under_history, symbol, markets } = analysis;
    const { bot_status, is_executing, session_profit, total_profit, logs } = smart_auto;

    // Initialize markets and WebSocket feed
    useEffect(() => {
        const initializeFeed = async () => {
            try {
                // Fetch markets if not already loaded
                if (markets.length === 0 && analysis.is_connected) {
                    await analysis.fetchMarkets();
                }

                // Start tick subscription
                if (api_base.api && symbol) {
                    // Unsubscribe from previous
                    if (subscriptionRef.current) {
                        api_base.api.send({ forget: subscriptionRef.current }).catch(() => {});
                    }

                    // Subscribe to ticks
                    const response = await api_base.api.send({
                        ticks_history: symbol,
                        adjust_start_time: 1,
                        count: 60,
                        end: 'latest',
                        start: 1,
                        style: 'ticks',
                    });

                    if (response.ticks_history) {
                        const prices = response.ticks_history.prices || [];
                        const last_digits = prices.map((p: number) => {
                            const price_str = String(p);
                            return parseInt(price_str[price_str.length - 1]);
                        }).filter((d: number) => !isNaN(d));
                        
                        const lastPrice = prices[prices.length - 1];
                        analysis.updateDigitStats(last_digits, lastPrice);
                    }

                    // Subscribe to live ticks
                    const tick_response = await api_base.api.send({
                        ticks: symbol,
                        subscribe: 1,
                    });

                    if (tick_response.subscription) {
                        subscriptionRef.current = tick_response.subscription.id;
                    }
                }
            } catch (error) {
                // Silently handle errors to keep console clean
            }
        };

        initializeFeed();

        return () => {
            // Cleanup subscription on unmount
            if (subscriptionRef.current && api_base.api) {
                api_base.api.send({ forget: subscriptionRef.current }).catch(() => {});
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, analysis.is_connected]);

    // Listen for tick updates
    useEffect(() => {
        if (!api_base.api || !analysis.is_connected) {
            console.log('DigitCracker: waiting for connection...');
            return;
        }

        console.log('DigitCracker: Subscribing to tick updates');

        const tickHandler = (response: any) => {
            if (response.tick && response.tick.quote) {
                const price = response.tick.quote;
                const price_str = String(price);
                const last_char = price_str[price_str.length - 1];
                const new_digit = parseInt(last_char);

                if (!isNaN(new_digit)) {
                    const current_ticks = [...analysis.ticks];
                    current_ticks.push(new_digit);
                    if (current_ticks.length > 1000) current_ticks.shift();
                    console.log('Live digit updated:', new_digit, 'Total ticks:', current_ticks.length);
                    analysis.updateDigitStats(current_ticks, price);
                }
            }
        };

        const subscription = api_base.api.onMessage().subscribe(tickHandler);

        return () => {
            subscription.unsubscribe();
        };
    }, [analysis, analysis.is_connected]);

    // Auto-scroll logs
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs.length]);

    // Autorun for processing ticks
    useEffect(() => {
        const disposer = autorun(() => {
            // This will run automatically whenever observable dependencies change
            if (analysis.ticks.length > 0) {
                smart_auto.processTick();
            }
        });

        return () => disposer();
    }, [smart_auto]);

    const handleMarketChange = (newSymbol: string) => {
        analysis.setSymbol(newSymbol);
    };

    const renderDigitCircles = () => {
        // Split digits into two groups: 0-4 and 5-9
        const group1 = digit_stats.filter((s: any) => s.digit >= 0 && s.digit <= 4);
        const group2 = digit_stats.filter((s: any) => s.digit >= 5 && s.digit <= 9);
        
        const renderDigitGroup = (digits: any[]) => {
            return digits.map((stat: any) => {
                const isCurrent = stat.digit === last_digit;
                const dashArray = 140;
                const dashOffset = dashArray - (dashArray * stat.percentage) / 100;
                
                // Stroke colors: Green for 1st, Yellow for 2nd, Red for least, Orange for current
                let strokeColor = '#6b7280';
                if (stat.rank === 1) strokeColor = '#00ff41';
                else if (stat.rank === 2) strokeColor = '#ffd700';
                else if (stat.rank === 10) strokeColor = '#ff073a';
                
                const finalColor = isCurrent ? '#ff9f00' : strokeColor;
                
                return (
                    <div key={stat.digit} className={`digit-card ${isCurrent ? 'current' : ''}`} data-rank={stat.rank}>
                        {isCurrent && <div className='live-indicator'>LIVE</div>}
                        <div className='digit-circle' style={{ borderColor: finalColor, boxShadow: `0 0 12px ${finalColor}40` }}>
                            <svg width='50' height='50' viewBox='0 0 50 50'>
                                <circle className='bg-circle' cx='25' cy='25' r='22' />
                                <circle
                                    className='progress-circle'
                                    cx='25'
                                    cy='25'
                                    r='22'
                                    style={{ stroke: finalColor }}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                />
                            </svg>
                            <span className='digit-number' style={{ color: finalColor, textShadow: `0 0 12px ${finalColor}` }}>{stat.digit}</span>
                        </div>
                        <div className='digit-info'>
                            <div className='percentage'>{stat.percentage.toFixed(1)}%</div>
                            <div className='power-bar' style={{ width: `${stat.power}%`, backgroundColor: finalColor, boxShadow: `0 0 6px ${finalColor}` }} />
                            <div className='rank'>#{stat.rank}</div>
                        </div>
                    </div>
                );
            });
        };
        
        return (
            <div className='digit-grid-wrapper'>
                <div className='digit-row'>
                    {renderDigitGroup(group1)}
                </div>
                <div className='digit-row'>
                    {renderDigitGroup(group2)}
                </div>
            </div>
        );
    };

    const renderStrategyControls = () => {
        const config = (smart_auto as any)[`${activeStrategy}_config`];
        
        return (
            <div className='strategy-controls'>
                <div className='controls-header'>
                    <h3>Strategy Configuration</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div className='active-badge'>{activeStrategy.toUpperCase().replace('_', '/')}</div>
                        {config.runs_count !== undefined && config.max_runs && (
                            <div className='run-counter'>
                                Runs: {config.runs_count || 0}/{config.max_runs}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className='settings-grid'>
                    <div className='input-field'>
                        <label>Stake Amount ($)</label>
                        <input type='number' step='0.01' value={config.stake} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'stake', parseFloat(e.target.value))} />
                    </div>
                    <div className='input-field'>
                        <label>Take Profit ($)</label>
                        <input type='number' step='0.01' value={config.take_profit || 10} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'take_profit', parseFloat(e.target.value))} />
                    </div>
                    <div className='input-field'>
                        <label>Stop Loss ($)</label>
                        <input type='number' step='0.01' value={config.max_loss} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'max_loss', parseFloat(e.target.value))} />
                    </div>
                    <div className='input-field'>
                        <label>Martingale Multiplier</label>
                        <input type='number' step='0.1' value={config.multiplier} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'multiplier', parseFloat(e.target.value))} />
                    </div>
                    <div className='input-field'>
                        <label>Maximum Runs</label>
                        <input type='number' value={config.max_runs || 12} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'max_runs' as any, parseInt(e.target.value))} />
                    </div>
                    <div className='input-field'>
                        <label>Tick Duration</label>
                        <input type='number' value={config.ticks} onChange={(e) => smart_auto.updateConfig(activeStrategy, 'ticks', parseInt(e.target.value))} />
                    </div>
                </div>

                <div className='toggles-row'>
                    <button className={`toggle-switch ${config.use_martingale ? 'active' : ''}`} onClick={() => smart_auto.updateConfig(activeStrategy, 'use_martingale', !config.use_martingale)}>
                        <span className='toggle-label'>Martingale</span>
                        <span className='toggle-status'>{config.use_martingale ? 'ON' : 'OFF'}</span>
                    </button>
                    <button className={`toggle-switch ${config.use_max_loss ? 'active' : ''}`} onClick={() => smart_auto.updateConfig(activeStrategy, 'use_max_loss', !config.use_max_loss)}>
                        <span className='toggle-label'>Stop Loss</span>
                        <span className='toggle-status'>{config.use_max_loss ? 'ON' : 'OFF'}</span>
                    </button>
                    <button className={`toggle-switch ${config.use_compounding ? 'active' : ''}`} onClick={() => smart_auto.updateConfig(activeStrategy, 'use_compounding', !config.use_compounding)}>
                        <span className='toggle-label'>Compounding</span>
                        <span className='toggle-status'>{config.use_compounding ? 'ON' : 'OFF'}</span>
                    </button>
                </div>

                <div className='action-row'>
                    <button className='btn-trade-once' onClick={() => smart_auto.toggleBot(activeStrategy, 'manual')} disabled={config.is_running && config.is_auto}>
                        <LabelPairedPlayMdFillIcon />
                        Trade Once
                    </button>
                    <button className={`btn-auto-trade ${config.is_running && config.is_auto ? 'active glowing' : ''}`} onClick={() => smart_auto.toggleBot(activeStrategy, 'auto')}>
                        {config.is_running && config.is_auto ? <LabelPairedSquareMdFillIcon /> : <LabelPairedArrowsRotateMdRegularIcon />}
                        {config.is_running && config.is_auto ? 'Stop Auto Trading' : 'Start Auto Trading'}
                    </button>
                </div>
            </div>
        );
    };

    const renderLogContent = () => {
        switch (activeLogTab) {
            case 'summary':
                const totalTrades = logs.filter(l => l.type === 'trade' || l.type === 'success' || l.type === 'error').length;
                const wins = logs.filter(l => l.type === 'success').length;
                const losses = logs.filter(l => l.type === 'error').length;
                const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
                
                return (
                    <div className='summary-content'>
                        <div className='summary-grid'>
                            <div className='summary-card'>
                                <span className='label'>Total Trades</span>
                                <span className='value'>{totalTrades}</span>
                            </div>
                            <div className='summary-card'>
                                <span className='label'>Wins</span>
                                <span className='value success'>{wins}</span>
                            </div>
                            <div className='summary-card'>
                                <span className='label'>Losses</span>
                                <span className='value error'>{losses}</span>
                            </div>
                            <div className='summary-card'>
                                <span className='label'>Win Rate</span>
                                <span className='value'>{winRate}%</span>
                            </div>
                            <div className='summary-card'>
                                <span className='label'>Session Profit</span>
                                <span className={`value ${session_profit >= 0 ? 'success' : 'error'}`}>
                                    ${session_profit.toFixed(2)}
                                </span>
                            </div>
                            <div className='summary-card'>
                                <span className='label'>Total Profit</span>
                                <span className={`value ${total_profit >= 0 ? 'success' : 'error'}`}>
                                    ${total_profit.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            
            case 'transactions':
                const tradeLogs = logs.filter(l => l.type === 'trade' || l.type === 'success' || l.type === 'error');
                return (
                    <div className='transactions-content'>
                        {tradeLogs.length === 0 ? (
                            <div className='empty-log'>No transactions yet...</div>
                        ) : (
                            <div className='transaction-list'>
                                {tradeLogs.map((log: any, i: number) => (
                                    <div key={i} className={`transaction-item ${log.type}`}>
                                        <span className='timestamp'>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        <span className='message'>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            
            case 'journal':
                return (
                    <div className='journal-content'>
                        {logs.length === 0 ? (
                            <div className='empty-log'>No journal entries...</div>
                        ) : (
                            logs.map((log: any, i: number) => (
                                <div key={i} className={`log-entry ${log.type}`}>
                                    <span className='timestamp'>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className='message'>{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                );
        }
    };

    // Get available markets or use default volatility indices
    const availableMarkets = markets.length > 0 
        ? markets.flatMap(group => group.items)
        : [
            { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
            { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
            { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
            { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
            { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
            { value: 'R_10', label: 'Volatility 10 Index' },
            { value: 'R_25', label: 'Volatility 25 Index' },
            { value: 'R_50', label: 'Volatility 50 Index' },
            { value: 'R_75', label: 'Volatility 75 Index' },
            { value: 'R_100', label: 'Volatility 100 Index' },
        ];

    return (
        <div className='digit-cracker-page'>
            <div className='cracker-header'>
                <div className='header-title'>
                    <h1>⚡ Digit Cracker Strategy</h1>
                    <p className='subtitle'>Automated Probability-Based Trading Engine</p>
                </div>
                <div className='header-controls'>
                    <div className='control-group'>
                        <label>Select Market</label>
                        <select 
                            className='market-selector' 
                            value={symbol} 
                            onChange={(e) => handleMarketChange(e.target.value)}
                        >
                            {availableMarkets.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className='stat-card connection'>
                        <span className='label'>WebSocket</span>
                        <span className={`status ${analysis.is_connected ? 'connected' : 'disconnected'}`}>
                            {analysis.is_connected ? '🟢 Connected' : '🔴 Disconnected'}
                        </span>
                    </div>
                </div>
                <div className='header-stats'>
                    <div className='stat-card balance'>
                        <span className='label'>Balance</span>
                        <span className='value'>${typeof client.balance === 'number' ? client.balance.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className='stat-card market'>
                        <span className='label'>Market</span>
                        <span className='value'>{symbol || 'N/A'}</span>
                    </div>
                    <div className='stat-card live-digit'>
                        <span className='label'>Live Digit</span>
                        <span className='value digit-display'>{last_digit !== null ? last_digit : '-'}</span>
                    </div>
                    <div className='stat-card tick-count'>
                        <span className='label'>Ticks Analyzed</span>
                        <span className='value'>{analysis.ticks.length}/60</span>
                    </div>
                </div>
            </div>

            <div className='analytics-section'>
                <div className='section-title'>
                    <h2>📊 Digits Distribution Analytics</h2>
                    <span className='tick-info'>Last 60 Ticks • Real-Time Analysis</span>
                </div>
                {renderDigitCircles()}
            </div>

            <div className='strategy-section'>
                <div className='strategy-tabs'>
                    <button className={activeStrategy === 'even_odd' ? 'active' : ''} onClick={() => setActiveStrategy('even_odd')}>
                        EVEN/ODD
                    </button>
                    <button className={activeStrategy === 'differs' ? 'active' : ''} onClick={() => setActiveStrategy('differs')}>
                        DIFFERS
                    </button>
                    <button className={activeStrategy === 'matches' ? 'active' : ''} onClick={() => setActiveStrategy('matches')}>
                        MATCHES
                    </button>
                    <button className={activeStrategy === 'over_under' ? 'active' : ''} onClick={() => setActiveStrategy('over_under')}>
                        OVER/UNDER
                    </button>
                </div>

                <div className='strategy-content'>
                    <div className='content-left'>
                        {activeStrategy === 'even_odd' && (
                            <div className='strategy-info'>
                                <h3>Even vs Odd Strategy</h3>
                                <div className='strategy-description'>
                                    <p><strong>Logic:</strong> If any digits have above 55% and increasing. If highest digit is even, wait for 2 or more consecutive odd digits then when even appears start trading. Same applies for odd strategy.</p>
                                    <p><strong>Max Runs:</strong> 12 (unless stopped manually)</p>
                                </div>
                                <div className='power-display'>
                                    <div className='power-item'>
                                        <span className='label'>EVEN Power:</span>
                                        <span className='value green'>{percentages.even.toFixed(1)}%</span>
                                    </div>
                                    <div className='power-item'>
                                        <span className='label'>ODD Power:</span>
                                        <span className='value red'>{percentages.odd.toFixed(1)}%</span>
                                    </div>
                                    <div className='power-item prediction'>
                                        <span className='label'>🎯 Current Signal:</span>
                                        <span className='value' style={{ color: '#a855f7', fontWeight: 'bold' }}>
                                            {percentages.even > 55 ? 'EVEN dominant - Wait for 2+ ODD then EVEN' : 
                                             percentages.odd > 55 ? 'ODD dominant - Wait for 2+ EVEN then ODD' : 
                                             'Waiting for 55%+ threshold...'}
                                        </span>
                                    </div>
                                </div>
                                <div className='history-section'>
                                    <span className='history-label'>Recent Pattern:</span>
                                    <div className='history-boxes'>
                                        {even_odd_history.slice(0, 20).map((h: any, i: number) => (
                                            <div key={i} className={`history-box ${h.type.toLowerCase()}`}>{h.type === 'E' ? 'E' : 'O'}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeStrategy === 'over_under' && (
                            <div className='strategy-info'>
                                <h3>Over/Under Strategy</h3>
                                <div className='strategy-description'>
                                    <p><strong>Logic:</strong> UNDER (0-4) vs OVER (5-9). If UNDER has highest % and increasing, wait for 2+ consecutive OVER digits then when UNDER appears start trading. Same for OVER.</p>
                                    <p><strong>Suggestions:</strong> System recommends best prediction automatically</p>
                                </div>
                                <div className='power-display'>
                                    <div className='power-item'>
                                        <span className='label'>OVER (5-9):</span>
                                        <span className='value blue'>{percentages.over.toFixed(1)}%</span>
                                    </div>
                                    <div className='power-item'>
                                        <span className='label'>UNDER (0-4):</span>
                                        <span className='value orange'>{percentages.under.toFixed(1)}%</span>
                                    </div>
                                    {percentages.under > 55 && (
                                        <div className='power-item suggestion'>
                                            <span className='label'>💡 Best Prediction:</span>
                                            <span className='value' style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                Trade UNDER 6, 7, 8, or 9
                                            </span>
                                        </div>
                                    )}
                                    {percentages.over > 55 && (
                                        <div className='power-item suggestion'>
                                            <span className='label'>💡 Best Prediction:</span>
                                            <span className='value' style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                Trade OVER 0, 1, 2, or 3
                                            </span>
                                        </div>
                                    )}
                                    <div className='power-item prediction'>
                                        <span className='label'>🎯 Current Signal:</span>
                                        <span className='value' style={{ color: '#a855f7', fontWeight: 'bold' }}>
                                            {percentages.under > 55 ? 'UNDER dominant - Wait for 2+ OVER then UNDER' : 
                                             percentages.over > 55 ? 'OVER dominant - Wait for 2+ UNDER then OVER' : 
                                             'Waiting for 55%+ threshold...'}
                                        </span>
                                    </div>
                                </div>
                                <div className='history-section'>
                                    <span className='history-label'>Recent Pattern:</span>
                                    <div className='history-boxes'>
                                        {over_under_history.slice(0, 20).map((h: any, i: number) => (
                                            <div key={i} className={`history-box ${h.type.toLowerCase()}`}>{h.type === 'O' ? 'O' : 'U'}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeStrategy === 'differs' && (
                            <div className='strategy-info'>
                                <h3>Differs Strategy</h3>
                                <div className='strategy-description'>
                                    <p><strong>Logic:</strong> Choose digit 2-7 that is NOT most appearing, 2nd most, or least appearing. Digit must be below 10% and decreasing.</p>
                                    <p><strong>Entry:</strong> Start trading when selected digit drops/decreases in percentage</p>
                                    <p><strong>Dynamic:</strong> Can change prediction automatically</p>
                                </div>
                                <div className='digit-rankings'>
                                    {digit_stats.slice().sort((a: any, b: any) => a.percentage - b.percentage).slice(0, 10).map((s: any) => {
                                        const sortedStats = [...digit_stats].sort((a: any, b: any) => b.power - a.power);
                                        const highest = sortedStats[0].digit;
                                        const second = sortedStats[1].digit;
                                        const least = sortedStats[9].digit;
                                        const isEligible = s.digit >= 2 && s.digit <= 7 && 
                                                          s.digit !== highest && s.digit !== second && s.digit !== least &&
                                                          s.percentage < 10 && !s.is_increasing;
                                        
                                        return (
                                            <div key={s.digit} className={`rank-row ${isEligible ? 'eligible' : ''}`}>
                                                <span className='rank'>#{s.rank}</span>
                                                <span className='digit'>Digit {s.digit}</span>
                                                <div className='power-track'>
                                                    <div className='fill' style={{ width: `${s.power}%`, backgroundColor: isEligible ? '#a855f7' : '#6b7280' }} />
                                                </div>
                                                <span className='power'>{s.percentage.toFixed(1)}%</span>
                                                {isEligible && <span className='badge'>ELIGIBLE</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className='power-item prediction' style={{ marginTop: '1rem' }}>
                                    <span className='label'>🎯 Auto-Selected Target:</span>
                                    <span className='value' style={{ color: '#a855f7', fontWeight: 'bold' }}>
                                        {(() => {
                                            const sortedStats = [...digit_stats].sort((a: any, b: any) => b.power - a.power);
                                            const highest = sortedStats[0].digit;
                                            const second = sortedStats[1].digit;
                                            const least = sortedStats[9].digit;
                                            const eligible = digit_stats.filter((s: any) => 
                                                s.digit >= 2 && s.digit <= 7 && 
                                                s.digit !== highest && s.digit !== second && s.digit !== least &&
                                                s.percentage < 10 && !s.is_increasing
                                            );
                                            return eligible.length > 0 
                                                ? `Digit ${eligible.sort((a: any, b: any) => a.percentage - b.percentage)[0].digit} (${eligible[0].percentage.toFixed(1)}% ↓)`
                                                : 'Waiting for eligible digit...';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {activeStrategy === 'matches' && (
                            <div className='strategy-info'>
                                <h3>Matches Strategy</h3>
                                <div className='strategy-description'>
                                    <p><strong>Logic:</strong> Choose digit 0-9 that is most appearing, 2nd most appearing, or least appearing. Only when increasing.</p>
                                    <p><strong>Entry:</strong> Start trading when selected digit increases in percentage</p>
                                    <p><strong>Dynamic:</strong> Can change prediction automatically</p>
                                </div>
                                <div className='digit-rankings'>
                                    {digit_stats.slice().sort((a: any, b: any) => b.power - a.power).slice(0, 10).map((s: any) => {
                                        const sortedStats = [...digit_stats].sort((a: any, b: any) => b.power - a.power);
                                        const candidates = [sortedStats[0], sortedStats[1], sortedStats[9]];
                                        const isCandidate = candidates.some(c => c.digit === s.digit);
                                        const isEligible = isCandidate && s.is_increasing;
                                        
                                        return (
                                            <div key={s.digit} className={`rank-row ${isEligible ? 'eligible' : ''}`}>
                                                <span className='rank'>#{s.rank}</span>
                                                <span className='digit'>Digit {s.digit}</span>
                                                <div className='power-track'>
                                                    <div className='fill' style={{ width: `${s.power}%`, backgroundColor: isEligible ? '#10b981' : '#6b7280' }} />
                                                </div>
                                                <span className='power'>{s.percentage.toFixed(1)}%</span>
                                                {isEligible && <span className='badge success'>ELIGIBLE</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className='power-item prediction' style={{ marginTop: '1rem' }}>
                                    <span className='label'>🎯 Auto-Selected Target:</span>
                                    <span className='value' style={{ color: '#10b981', fontWeight: 'bold' }}>
                                        {(() => {
                                            const sortedStats = [...digit_stats].sort((a: any, b: any) => b.power - a.power);
                                            const candidates = [sortedStats[0], sortedStats[1], sortedStats[9]];
                                            const validCandidates = candidates.filter(s => s.is_increasing);
                                            return validCandidates.length > 0 
                                                ? `Digit ${validCandidates[0].digit} (${validCandidates[0].percentage.toFixed(1)}% ↑)`
                                                : 'Waiting for increasing trend...';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className='content-right'>
                        {renderStrategyControls()}
                    </div>
                </div>
            </div>

            <div className='trading-log-section'>
                <div className='log-header'>
                    <h3>📑 Trading Activity</h3>
                    <div className='log-tabs'>
                        <button className={activeLogTab === 'summary' ? 'active' : ''} onClick={() => setActiveLogTab('summary')}>
                            Summary
                        </button>
                        <button className={activeLogTab === 'transactions' ? 'active' : ''} onClick={() => setActiveLogTab('transactions')}>
                            Transactions
                        </button>
                        <button className={activeLogTab === 'journal' ? 'active' : ''} onClick={() => setActiveLogTab('journal')}>
                            Journal
                        </button>
                    </div>
                    <button className='clear-log' onClick={() => smart_auto.clearLogs()}>Clear</button>
                </div>
                <div className='log-content' ref={logRef}>
                    {renderLogContent()}
                </div>
            </div>

            <div className='status-footer'>
                <div className='status-left'>
                    <div className={`status-indicator ${is_executing ? 'active' : ''}`} />
                    <span className='status-text'>{bot_status}</span>
                </div>
                <div className='profit-display'>
                    <div className='profit-item session'>
                        <span className='label'>Session:</span>
                        <span className={`value ${session_profit >= 0 ? 'profit' : 'loss'}`}>
                            {session_profit >= 0 ? '+' : ''}{session_profit.toFixed(2)}
                        </span>
                    </div>
                    <div className='profit-item total'>
                        <span className='label'>Total:</span>
                        <span className={`value ${total_profit >= 0 ? 'profit' : 'loss'}`}>
                            {total_profit >= 0 ? '+' : ''}{total_profit.toFixed(2)}
                        </span>
                    </div>
                </div>
                <button className='reset-btn' onClick={() => {
                    runInAction(() => {
                        smart_auto.session_profit = 0;
                        smart_auto.total_profit = 0;
                        smart_auto.last_result = null;
                        smart_auto.current_streak = 0;
                        smart_auto.clearLogs();
                    });
                }}>
                    <LabelPairedArrowsRotateMdRegularIcon />
                    Reset
                </button>
            </div>
        </div>
    );
});

export default DigitCracker;
