import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useStore } from '@/hooks/useStore';
import { 
    LabelPairedPlayMdFillIcon, 
    LabelPairedSquareMdFillIcon, 
    LabelPairedArrowsRotateMdRegularIcon 
} from '@deriv/quill-icons/LabelPaired';
import './trading-engine.scss';

const TradingEngine = observer(() => {
    const { smart_auto, analysis } = useStore();
    const [activeTab, setActiveTab] = useState<'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall'>('even_odd');
    
    // Auto-scroll logs
    const { even_odd_history, over_under_history, rise_fall_history, percentages, digit_stats } = analysis;
    const { bot_status, is_executing, session_profit, total_profit, logs } = smart_auto;
    const logRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs.length]);

    const renderBotControls = (botType: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall') => {
        const config = (smart_auto as any)[`${botType}_config` || 'over_under_config'];
        
        return (
            <div className='bot-controls-wrapper'>
                <div className='controls-grid'>
                    <div className='input-group'>
                        <label>Stake ($)</label>
                         <input 
                            type='number' 
                            value={config.stake} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'stake', parseFloat(e.target.value))} 
                        />
                    </div>
                    <div className='input-group'>
                        <label>Take Profit ($)</label>
                         <input 
                            type='number' 
                            value={config.take_profit || 10} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'take_profit', parseFloat(e.target.value))} 
                        />
                    </div>
                    <div className='input-group'>
                        <label>Stop Loss ($)</label>
                         <input 
                            type='number' 
                            value={config.max_loss} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'max_loss', parseFloat(e.target.value))} 
                        />
                    </div>
                    <div className='input-group'>
                        <label>Martingale Multiplier</label>
                        <input 
                            type='number' 
                            value={config.multiplier} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'multiplier', parseFloat(e.target.value))} 
                        />
                    </div>
                    <div className='input-group'>
                        <label>Max Runs</label>
                        <input 
                            type='number' 
                            value={config.max_runs || 12} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'max_runs' as any, parseInt(e.target.value))} 
                        />
                    </div>
                    <div className='input-group'>
                        <label>Ticks Duration</label>
                        <input 
                            type='number' 
                            value={config.ticks} 
                            onChange={(e) => smart_auto.updateConfig(botType, 'ticks', parseInt(e.target.value))} 
                        />
                    </div>
                    {(botType === 'over_under' || botType === 'differs' || botType === 'matches') && (
                        <div className='input-group'>
                            <label>Prediction</label>
                            <input 
                                type='number' 
                                value={config.prediction} 
                                onChange={(e) => smart_auto.updateConfig(botType, 'prediction', parseInt(e.target.value))} 
                            />
                        </div>
                    )}
                </div>

                <div className='toggles-grid'>
                    <div className='toggle-item'>
                        <label>Martingale</label>
                        <button 
                            className={`toggle-btn ${config.use_martingale ? 'on' : 'off'}`}
                            onClick={() => smart_auto.updateConfig(botType, 'use_martingale', !config.use_martingale)}
                        >
                            {config.use_martingale ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div className='toggle-item'>
                        <label>Max Loss Limit</label>
                         <button 
                            className={`toggle-btn ${config.use_max_loss ? 'on' : 'off'}`}
                            onClick={() => smart_auto.updateConfig(botType, 'use_max_loss', !config.use_max_loss)}
                        >
                            {config.use_max_loss ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div className='toggle-item'>
                        <label>Compounding</label>
                        <button 
                            className={`toggle-btn ${config.use_compounding ? 'on' : 'off'}`}
                            onClick={() => smart_auto.updateConfig(botType, 'use_compounding', !config.use_compounding)}
                        >
                            {config.use_compounding ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <div className='action-buttons'>
                    <button 
                        className={`action-btn run-once ${config.is_running && !config.is_auto ? 'active' : ''}`}
                        onClick={() => smart_auto.toggleBot(botType, 'manual')}
                        disabled={config.is_running && config.is_auto}
                    >
                        <LabelPairedPlayMdFillIcon />
                        TRADE ONCE
                    </button>
                    <button 
                        className={`action-btn auto-run ${config.is_running && config.is_auto ? 'active' : ''}`}
                        onClick={() => smart_auto.toggleBot(botType, 'auto')}
                    >
                        {config.is_running && config.is_auto ? <LabelPairedSquareMdFillIcon /> : <LabelPairedArrowsRotateMdRegularIcon />}
                        {config.is_running && config.is_auto ? 'STOP AUTO' : 'START AUTO'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className='trading-engine-container'>
            <div className='engine-tabs'>
                <button className={activeTab === 'even_odd' ? 'active' : ''} onClick={() => setActiveTab('even_odd')}>EVEN/ODD</button>
                <button className={activeTab === 'differs' ? 'active' : ''} onClick={() => setActiveTab('differs')}>DIFFERS</button>
                <button className={activeTab === 'matches' ? 'active' : ''} onClick={() => setActiveTab('matches')}>MATCHES</button>
                <button className={activeTab === 'over_under' ? 'active' : ''} onClick={() => setActiveTab('over_under')}>OVER/UNDER</button>
                <button className={activeTab === 'rise_fall' ? 'active' : ''} onClick={() => setActiveTab('rise_fall')}>RISE/FALL</button>
                <button className={activeTab === 'smart_auto_24' ? 'active' : ''} onClick={() => setActiveTab('smart_auto_24')}>SMART 24H</button>
            </div>

            <div className='engine-content'>
                <div className='stats-panel'>
                    {activeTab === 'even_odd' && (
                        <div className='bot-stat-section'>
                            <div className='stat-header'>
                                <span>EVEN vs ODD Analysis (Last 15)</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span className={`power-indicator ${percentages.even > 50 ? 'rising' : ''}`}>EVEN: {percentages.even.toFixed(1)}%</span>
                                    <span className={`power-indicator ${percentages.odd > 50 ? 'rising' : ''}`}>ODD: {percentages.odd.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className='history-boxes'>
                                {even_odd_history.slice(0, 30).map((h, i) => (
                                    <div key={i} className={`history-box ${h.type}`}>
                                        {h.type === 'EVEN' ? 'E' : 'O'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'over_under' && (
                        <div className='bot-stat-section'>
                            <div className='stat-header'>
                                <span>UNDER (0-4) vs OVER (5-9)</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span className={`power-indicator ${percentages.over > 50 ? 'rising' : ''}`}>OVER: {percentages.over.toFixed(1)}%</span>
                                    <span className={`power-indicator ${percentages.under > 50 ? 'rising' : ''}`}>UNDER: {percentages.under.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className='history-boxes'>
                                {over_under_history.slice(0, 30).map((h, i) => (
                                    <div key={i} className={`history-box ${h.type}`}>
                                        {h.type === 'OVER' ? 'O' : 'U'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(activeTab === 'differs' || activeTab === 'matches') && (
                        <div className='bot-stat-section'>
                            <div className='stat-header'>
                                <span>Digit Power Rankings (Top 3)</span>
                            </div>
                            <div className='rankings-list'>
                                {digit_stats.slice().sort((a, b) => b.power - a.power).slice(0, 3).map(s => (
                                    <div key={s.digit} className='rank-item'>
                                        <span className='digit'>Digit {s.digit}</span>
                                        <div className='power-track'><div className='fill' style={{ width: `${s.power}%` }}></div></div>
                                        <span className='value'>{s.power}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'rise_fall' && (
                        <div className='bot-stat-section'>
                            <div className='stat-header'>
                                <span>RISE vs FALL Trend</span>
                                <span className='power-indicator'>RISE: {percentages.rise.toFixed(1)}%</span>
                            </div>
                            <div className='history-boxes'>
                                {rise_fall_history.slice(0, 30).map((h, i) => (
                                    <div key={i} className={`history-box ${h.type}`}>
                                        {h.type === 'RISE' ? 'R' : 'F'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className='activity-log-wrapper'>
                    <div className='log-header'>Live Trade Log</div>
                    <div className='log-content' ref={logRef}>
                        {logs.length === 0 ? (
                            <div className='empty'>Waiting for bot activity...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={`log-entry ${log.type}`}>
                                    <span className='time'>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                    <span className='message'>{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {renderBotControls(activeTab)}
            </div>

            <div className='engine-footer'>
                <div className='status-badge'>
                    <span className={`indicator ${is_executing ? 'executing' : ''}`} />
                    STATUS: {bot_status} {is_executing ? '(EXECUTING)' : ''}
                </div>
                <div className='profit-stats'>
                    <div className='stat'>SESSION: <span className={session_profit >= 0 ? 'won' : 'lost'}>{session_profit >= 0 ? '+' : '-'}${Math.abs(session_profit).toFixed(2)}</span></div>
                    <div className='stat'>TOTAL: <span className={total_profit >= 0 ? 'won' : 'lost'}>{total_profit >= 0 ? '+' : '-'}${Math.abs(total_profit).toFixed(2)}</span></div>
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
                    RESET
                </button>
            </div>
        </div>
    );
});

export default TradingEngine;
