import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useStore } from '@/hooks/useStore';
import { TStrategy } from '@/stores/smart-trading-store';
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
import './smart-auto24-tab.scss';

const BotCard = observer(({ strategy }: { strategy: TStrategy }) => {
    const { smart_trading } = useStore();
    const [is_settings_open, setIsSettingsOpen] = useState(false);

    const toggleBot = () => smart_trading.toggleBot(strategy.id);
    const updateSetting = (key: keyof TStrategy, value: any) =>
        smart_trading.updateStrategySetting(strategy.id, key, value);

    const winRate =
        strategy.total_wins + strategy.total_losses > 0
            ? ((strategy.total_wins / (strategy.total_wins + strategy.total_losses)) * 100).toFixed(0)
            : '0';

    return (
        <div className={classNames('glass-card bot-card', { running: strategy.is_running })}>
            <div className='bot-header'>
                <div className='identity'>
                    <div className='icon-box'>
                        <StandaloneGearRegularIcon />
                    </div>
                    <div className='info'>
                        <h3>{strategy.name}</h3>
                        <span className={classNames('status', { on: strategy.is_running })}>
                            {strategy.is_running ? '● ACTIVE' : '○ READY'}
                        </span>
                    </div>
                </div>
                <div className='actions'>
                    <button className='settings-btn' onClick={() => setIsSettingsOpen(!is_settings_open)}>
                        <StandaloneGearRegularIcon />
                    </button>
                    <button className={classNames('play-btn', { stop: strategy.is_running })} onClick={toggleBot}>
                        {strategy.is_running ? <StandaloneSquareFillIcon /> : <StandalonePlayFillIcon />}
                    </button>
                </div>
            </div>

            <div className='bot-metrics'>
                <div className='metric profit'>
                    <span className='lbl'>NET PROFIT</span>
                    <span
                        className={classNames('val', { pos: strategy.profit_loss >= 0, neg: strategy.profit_loss < 0 })}
                    >
                        ${strategy.profit_loss.toFixed(2)}
                    </span>
                </div>
                <div className='metric'>
                    <span className='lbl'>WIN RATE</span>
                    <span className='val'>{winRate}%</span>
                </div>
            </div>

            <div className='bot-controls'>
                <div className='control-row'>
                    <span className='icon'>M</span>
                    <select
                        value={strategy.selected_symbol || 'R_100'}
                        onChange={e => updateSetting('selected_symbol', e.target.value)}
                        disabled={strategy.is_running}
                    >
                        {Object.values(smart_trading.active_symbols_data)
                            .filter(
                                s =>
                                    s.symbol.startsWith('R_') || s.symbol.startsWith('1HZ') || s.symbol.startsWith('JD')
                            )
                            .map(s => (
                                <option key={s.symbol} value={s.symbol}>
                                    {s.display_name}
                                </option>
                            ))}
                    </select>
                </div>
                <div
                    className='insight-box'
                    style={{
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ color: '#8b9bb4' }}>{strategy.market_message || 'Awaiting Analysis...'}</span>
                    {strategy.suggested_prediction !== undefined && (
                        <strong style={{ color: '#00d4ff' }}>Target: {strategy.suggested_prediction}</strong>
                    )}
                </div>
            </div>

            <div className='bot-footer'>
                <span className='wins'>{strategy.total_wins} WINS</span>
                <span className='losses'>{strategy.total_losses} LOSSES</span>
            </div>

            {is_settings_open && (
                <div className='settings-drawer'>
                    <div className='setting-row'>
                        <label>Stake ($)</label>
                        <input
                            type='number'
                            value={strategy.stake}
                            onChange={e => updateSetting('stake', parseFloat(e.target.value))}
                            disabled={strategy.is_running}
                        />
                    </div>
                    <div className='setting-row'>
                        <label>Martingale Factor</label>
                        <input
                            type='number'
                            value={strategy.martingale}
                            onChange={e => updateSetting('martingale', parseFloat(e.target.value))}
                            disabled={strategy.is_running}
                        />
                    </div>
                    <div className='risk-header'>Risk Controls</div>
                    <div className='setting-row'>
                        <label>Take Profit ($)</label>
                        <div className='input-with-check'>
                            <input
                                type='checkbox'
                                checked={strategy.enable_tp_sl}
                                onChange={e => updateSetting('enable_tp_sl', e.target.checked)}
                                disabled={strategy.is_running}
                            />
                            <input
                                type='number'
                                value={strategy.take_profit}
                                disabled={!strategy.enable_tp_sl || strategy.is_running}
                                onChange={e => updateSetting('take_profit', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className='setting-row'>
                        <label>Stop Loss ($)</label>
                        <div className='input-with-check'>
                            <input
                                type='checkbox'
                                checked={strategy.enable_tp_sl}
                                onChange={e => updateSetting('enable_tp_sl', e.target.checked)}
                                disabled={strategy.is_running}
                            />
                            <input
                                type='number'
                                value={strategy.stop_loss}
                                disabled={!strategy.enable_tp_sl || strategy.is_running}
                                onChange={e => updateSetting('stop_loss', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

const SmartAuto24Tab = observer(() => {
    const { smart_trading } = useStore();
    const { strategies, is_connected } = smart_trading;

    return (
        <div className='smart-auto24-tab'>
            {/* Premium Header - Smart Analysis Style */}
            <div className='premium-market-header'>
                <div className='market-select-glass'>
                    <span className='lbl'>
                        MARKET
                        <span
                            className={`connection-badge ${is_connected ? 'online' : 'offline'}`}
                            style={{ fontSize: '0.6rem', color: is_connected ? '#10b981' : '#f43f5e' }}
                        >
                            {is_connected ? '● LIVE' : '○ OFF'}
                        </span>
                    </span>
                    <select
                        value={smart_trading.symbol}
                        onChange={e => smart_trading.setSymbol(e.target.value)}
                        disabled={smart_trading.is_scanning}
                    >
                        {Object.values(smart_trading.active_symbols_data)
                            .filter(
                                s =>
                                    s.symbol.startsWith('R_') || s.symbol.startsWith('1HZ') || s.symbol.startsWith('JD')
                            )
                            .sort((a, b) => a.display_name.localeCompare(b.display_name))
                            .map(s => (
                                <option key={s.symbol} value={s.symbol}>
                                    {s.display_name}
                                </option>
                            ))}
                    </select>
                </div>

                <div className='price-display-glass'>
                    <span className='lbl'>LIVE PRICE</span>
                    <span className='val'>{smart_trading.current_price}</span>
                </div>

                <div className='digit-display-glass'>
                    <span className='lbl'>LAST DIGIT</span>
                    <div className={classNames('digit-box', `d-${smart_trading.last_digit}`)}>
                        {smart_trading.last_digit ?? '-'}
                    </div>
                </div>

                {/* Scan Action Card */}
                <div
                    className={classNames('scan-action-card', {
                        scanning: smart_trading.is_scanning,
                    })}
                    style={{ minWidth: '200px', display: 'flex', flexDirection: 'column' }}
                    onClick={() => {
                        if (!smart_trading.is_scan_expanded && !smart_trading.is_scanning) {
                            smart_trading.scanBestMarkets();
                            runInAction(() => (smart_trading.is_scan_expanded = true));
                        } else {
                            runInAction(() => (smart_trading.is_scan_expanded = !smart_trading.is_scan_expanded));
                        }
                    }}
                >
                    <div className='icon'>
                        {smart_trading.is_scanning ? (
                            <div
                                className='loader-small'
                                style={{
                                    border: '2px solid white',
                                    borderRadius: '50%',
                                    borderTopColor: 'transparent',
                                    width: '24px',
                                    height: '24px',
                                    animation: 'spin 1s linear infinite',
                                }}
                            />
                        ) : (
                            <StandaloneChartAreaRegularIcon />
                        )}
                    </div>
                    <span className='label'>
                        {smart_trading.is_scanning
                            ? 'Scanning...'
                            : smart_trading.is_scan_expanded
                              ? 'Hide Analysis'
                              : 'Scan Markets'}
                    </span>
                </div>
            </div>

            {/* Expanded Scan Results Overlay */}
            {smart_trading.is_scan_expanded && (
                <div className='scan-results-overlay'>
                    <h3>
                        Market Analysis Results
                        <button onClick={() => runInAction(() => (smart_trading.is_scan_expanded = false))}>
                            Close
                        </button>
                    </h3>
                    <div className='results-grid'>
                        {smart_trading.all_markets_stats.map(stat => (
                            <div
                                key={stat.symbol}
                                className={classNames('result-item', {
                                    best: stat.symbol === smart_trading.best_market,
                                })}
                                onClick={() => {
                                    smart_trading.setSymbol(stat.symbol);
                                    runInAction(() => (smart_trading.is_scan_expanded = false));
                                }}
                            >
                                <div className='res-header'>
                                    <span>
                                        {smart_trading.active_symbols_data[stat.symbol]?.display_name || stat.symbol}
                                    </span>
                                    <span className='score'>{stat.score.toFixed(0)}%</span>
                                </div>
                                <div className='res-reason'>{stat.reason}</div>
                                <div className='res-stats'>
                                    <span>
                                        LD: <strong>{stat.last_digit}</strong>
                                    </span>
                                    <span>
                                        E: <strong>{stat.even_pct.toFixed(0)}%</strong>
                                    </span>
                                    <span>
                                        O: <strong>{stat.over_pct.toFixed(0)}%</strong>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Dashboard */}
            <div className='stats-dashboard' style={{ marginBottom: '2rem' }}>
                <div className='stats-row top'>
                    <DigitStats />
                </div>
                <div
                    className='stats-row middle'
                    style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
                >
                    <LastDigits />
                    <ComprehensiveStats />
                </div>
            </div>

            {/* Bots Grid */}
            <div className='bots-grid'>
                {Object.values(strategies).map(bot => (
                    <BotCard key={bot.id} strategy={bot} />
                ))}
            </div>
        </div>
    );
});

export default SmartAuto24Tab;
