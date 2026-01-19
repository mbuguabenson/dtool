import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import classNames from 'classnames';
import {
    StandalonePlayFillIcon,
    StandaloneSquareFillIcon,
    StandaloneGearRegularIcon,
    StandaloneChartAreaRegularIcon,
} from '@deriv/quill-icons';
import DigitStats from '../../auto-trader/digit-stats';
import LastDigits from '../../auto-trader/last-digits';
import ComprehensiveStats from '../../auto-trader/comprehensive-stats';
import './scp-tab.scss';

const SCPTab = observer(() => {
    const { smart_trading, client } = useStore();
    const [selected_market, setSelectedMarket] = useState('R_100');
    const [selected_strategy, setSelectedStrategy] = useState('EVENODD');
    const [stake, setStake] = useState(0.35);
    const [target_profit, setTargetProfit] = useState(1);
    const [analysis_minutes, setAnalysisMinutes] = useState(1);
    const [stop_loss_pct, setStopLossPct] = useState(50);
    const log_end_ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selected_market) {
            smart_trading.setSymbol(selected_market);
        }
    }, [selected_market, smart_trading]);

    useEffect(() => {
        if (log_end_ref.current) {
            log_end_ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [smart_trading.scp_analysis_log.length]);

    const handleStart = () => {
        if (!client.is_logged_in) {
            smart_trading.addScpLog('Please log in to start the bot', 'error');
            return;
        }

        if (smart_trading.scp_status === 'idle') {
            smart_trading.runScpBot({
                market: selected_market,
                strategyId: selected_strategy,
                stake: stake,
                targetProfit: target_profit,
                stopLossPct: stop_loss_pct,
                analysisMinutes: analysis_minutes,
            });
        } else {
            smart_trading.setScpStatus('idle');
            smart_trading.addScpLog('Bot stopped by user', 'info');
        }
    };

    return (
        <div className='scp-tab'>
            {/* 1. Configuration Panel */}
            <div className='scp-grid'>
                <div className='glass-card config-panel command-center-border'>
                    <div className='card-header cyan-glow'>
                        <StandaloneGearRegularIcon className='header-icon' />
                        <h3>BOT COMMAND CENTER</h3>
                    </div>

                    <div className='field-row'>
                        <div className='field-group'>
                            <label>TRADING MARKET</label>
                            <select value={selected_market} onChange={e => setSelectedMarket(e.target.value)}>
                                {Object.values(smart_trading.active_symbols_data)
                                    .filter(
                                        s =>
                                            s.symbol.startsWith('R_') ||
                                            s.symbol.startsWith('1HZ') ||
                                            s.symbol.startsWith('JD')
                                    )
                                    .map(s => (
                                        <option key={s.symbol} value={s.symbol}>
                                            {s.display_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className='field-group'>
                            <label>MASTER STRATEGY</label>
                            <select value={selected_strategy} onChange={e => setSelectedStrategy(e.target.value)}>
                                <option value='EVENODD'>Even/Odd (55%+)</option>
                                <option value='OU36'>Over 3 / Under 6</option>
                                <option value='OU27'>Over 2 / Under 7</option>
                                <option value='DIFFERS'>Differs Logic (Rare)</option>
                            </select>
                        </div>
                    </div>

                    <div className='field-row'>
                        <div className='field-group'>
                            <label>STAKE ($)</label>
                            <input
                                type='number'
                                value={stake}
                                onChange={e => setStake(parseFloat(e.target.value))}
                                step='0.1'
                            />
                        </div>
                        <div className='field-group'>
                            <label>TARGET PROFIT ($)</label>
                            <input
                                type='number'
                                value={target_profit}
                                onChange={e => setTargetProfit(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='field-row'>
                        <div className='field-group'>
                            <label>ANALYSIS TIME (MIN)</label>
                            <input
                                type='number'
                                value={analysis_minutes}
                                onChange={e => setAnalysisMinutes(parseInt(e.target.value))}
                            />
                        </div>
                        <div className='field-group'>
                            <label>STOP LOSS (%)</label>
                            <input
                                type='number'
                                value={stop_loss_pct}
                                onChange={e => setStopLossPct(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <button
                        className={classNames('action-btn', { running: smart_trading.scp_status !== 'idle' })}
                        onClick={handleStart}
                    >
                        {smart_trading.scp_status === 'idle' ? (
                            <StandalonePlayFillIcon />
                        ) : (
                            <StandaloneSquareFillIcon />
                        )}
                        <span>{smart_trading.scp_status === 'idle' ? 'START ANALYSIS' : 'STOP BOT'}</span>
                    </button>
                </div>

                {/* 2. Analysis & Status Panel */}
                <div className='analysis-panel'>
                    <div className='glass-card balance-section'>
                        <span className='balance-label'>TOTAL BALANCE</span>
                        <div className='balance-value'>
                            <span className='currency'>$</span>
                            {client.balance || '0.00'}
                        </div>
                    </div>

                    <div className='stats-summary'>
                        <div className='stat-item'>
                            <span className='lbl'>SESSION P/L</span>
                            <span
                                className={classNames('val', {
                                    pos: smart_trading.session_pl > 0,
                                    neg: smart_trading.session_pl < 0,
                                })}
                            >
                                {smart_trading.session_pl >= 0 ? '+' : ''}
                                {smart_trading.session_pl.toFixed(2)}
                            </span>
                        </div>
                        <div className='stat-item'>
                            <span className='lbl'>BOT STATUS</span>
                            <span className={classNames('status-badge', smart_trading.scp_status)}>
                                {smart_trading.scp_status.toUpperCase()}
                            </span>
                        </div>
                        <div className='stat-item'>
                            <span className='lbl'>CONNECTED</span>
                            <span className='val status-pulse'>ONLINE</span>
                        </div>
                    </div>

                    <div className='progress-card'>
                        <div className='progress-info'>
                            <span>Analysis Phase</span>
                            <span className='percentage'>{smart_trading.scp_analysis_progress}%</span>
                        </div>
                        <div className='progress-bar-container'>
                            <div
                                className='progress-bar-fill'
                                style={{ width: `${smart_trading.scp_analysis_progress}%` }}
                            />
                        </div>
                    </div>

                    <div className='log-card'>
                        <div className='log-header'>
                            <StandaloneChartAreaRegularIcon style={{ width: '16px', height: '16px' }} />
                            <span>ANALYSIS ACTIVITY</span>
                        </div>
                        <div className='log-content'>
                            {smart_trading.scp_analysis_log.map((log, i) => (
                                <div key={i} className={classNames('log-entry', log.type)}>
                                    <span className='time'>
                                        {new Date(log.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                    </span>
                                    <span className='msg'>{log.message}</span>
                                </div>
                            ))}
                            <div ref={log_end_ref} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Real-Time Market Visuals */}
            <div className='market-visuals'>
                <div className='glass-card visuals-grid'>
                    <DigitStats />
                    <LastDigits />
                    <ComprehensiveStats />
                </div>
            </div>

            {/* 4. Trading Journal */}
            <div className='glass-card journal-card'>
                <div className='card-header red-glow'>
                    <h3>MISSION JOURNAL</h3>
                </div>
                <div className='journal-table-container'>
                    <table>
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>MARKET</th>
                                <th>STRATEGY</th>
                                <th>STAKE</th>
                                <th>DIGIT</th>
                                <th>RESULT</th>
                                <th>PROFIT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {smart_trading.scp_trading_journal.map((entry, i) => (
                                <tr key={i} className={entry.result.toLowerCase()}>
                                    <td>{new Date(entry.timestamp).toLocaleTimeString()}</td>
                                    <td>{entry.market}</td>
                                    <td>{entry.strategy}</td>
                                    <td>${entry.stake}</td>
                                    <td>{entry.digit}</td>
                                    <td>
                                        <span className='result-pill'>{entry.result}</span>
                                    </td>
                                    <td>${entry.profit.toFixed(2)}</td>
                                </tr>
                            ))}
                            {smart_trading.scp_trading_journal.length === 0 && (
                                <tr>
                                    <td colSpan={7} className='empty'>
                                        No trades recorded for this session.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default SCPTab;
