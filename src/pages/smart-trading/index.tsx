import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import { useStore } from '@/hooks/useStore';
import Chart from '../chart/chart';
import AdvancedOverUnderTab from './components/advanced-over-under-tab';
import BotSettingsDialog from './components/bot-settings-dialog';
import BulkTradingView from './components/bulk-trading-view';
import DiffersTab from './components/differs-tab';
import EvenOddTab from './components/even-odd-tab';
import MarketOverview from './components/market-overview';
import MatchesTab from './components/matches-tab';
import OverUnderTab from './components/over-under-tab';
import SmartAuto24Tab from './components/smart-auto24-tab';
import VSenseTurboTab from './components/vsense-turbo-tab';
import MoneyMakerUltraTab from './money-maker-ultra-tab';
import './smart-trading.scss';

const SmartTrading = observer(() => {
    const { smart_trading } = useStore();
    const {
        calculateProbabilities,
        dominance,
        consecutive_even,
        consecutive_odd,
        first_digit_stats,
        is_speedbot_running,
        speedbot_contract_type,
        speedbot_prediction,
        speedbot_stake,
        toggleSpeedbot,
        alternate_even_odd,
        alternate_on_loss,
        recovery_mode,
        ticks_processed,
        wins,
        losses,
        session_pl,
        current_streak,
        current_stake,
        last_digit,
        resetStats,
        active_subtab,
    } = smart_trading;

    const [is_settings_visible, setIsSettingsVisible] = useState(false);

    const probs = calculateProbabilities();

    const contract_types = [
        { value: 'DIGITEVEN', label: 'Even' },
        { value: 'DIGITODD', label: 'Odd' },
        { value: 'DIGITOVER', label: 'Over' },
        { value: 'DIGITUNDER', label: 'Under' },
        { value: 'DIGITMATCH', label: 'Match' },
        { value: 'DIGITDIFF', label: 'Diff' },
    ];

    return (
        <div className='smart-trading'>
            <MarketOverview />

            <div className='smart-trading__sub-tabs'>
                <button
                    className={`sub-tab ${active_subtab === 'speed' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('speed')}
                >
                    🚀 Speed Bot
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'vsense_turbo' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('vsense_turbo')}
                >
                    💎 V-SENSE™ Turbo
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'even_odd' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('even_odd')}
                >
                    ⚖️ Even/Odd
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'over_under' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('over_under')}
                >
                    📈 Over/Under
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'advanced_ou' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('advanced_ou')}
                >
                    ⚡ Adv. O/U
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'differs' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('differs')}
                >
                    ❌ Differs
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'matches' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('matches')}
                >
                    🎯 Matches
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'bulk' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('bulk')}
                >
                    📦 Bulk Trading
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'automated' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('automated')}
                >
                    🤖 Smart Auto 24
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'charts' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('charts')}
                >
                    📈 Charts
                </button>
                <button
                    className={`sub-tab ${active_subtab === 'money_maker_ultra' ? 'active' : ''}`}
                    onClick={() => smart_trading.setActiveSubtab('money_maker_ultra')}
                >
                    💎 ULTRA
                </button>
            </div>

            {active_subtab === 'bulk' && <BulkTradingView />}
            {active_subtab === 'automated' && <SmartAuto24Tab />}

            {active_subtab === 'even_odd' && <EvenOddTab />}
            {active_subtab === 'over_under' && <OverUnderTab />}
            {active_subtab === 'advanced_ou' && <AdvancedOverUnderTab />}
            {active_subtab === 'differs' && <DiffersTab />}
            {active_subtab === 'matches' && <MatchesTab />}
            {active_subtab === 'vsense_turbo' && <VSenseTurboTab />}
            {active_subtab === 'money_maker_ultra' && <MoneyMakerUltraTab />}
            {active_subtab === 'charts' && (
                <div style={{ height: '70vh' }}>
                    <Chart show_digits_stats={false} />
                </div>
            )}

            {/^(speed|vsense_turbo|even_odd|over_under|advanced_ou|differs|matches)$/.test(active_subtab) && (
                <>
                    <div className='smart-trading__analytics'>
                        <div className='analytics-card dominance-card'>
                            <h3>Market Dominance</h3>
                            <div className={`dominance-indicator ${dominance.toLowerCase()}`}>
                                <span className='dominance-text'>{dominance} DOMINANT</span>
                                <div className='glow-effect'></div>
                            </div>
                            <div className='streaks'>
                                <div className='streak-item'>
                                    <span>Even Streak:</span>
                                    <span className='value'>{consecutive_even}</span>
                                </div>
                                <div className='streak-item'>
                                    <span>Odd Streak:</span>
                                    <span className='value'>{consecutive_odd}</span>
                                </div>
                            </div>
                        </div>

                        <div className='analytics-card probability-card'>
                            <h3>Probability Analysis</h3>
                            <div className='prob-wrapper'>
                                <div className='prob-item'>
                                    <div className='label-row'>
                                        <span>EVEN / ODD</span>
                                        <span>
                                            {probs.even.toFixed(1)}% / {probs.odd.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className='dual-bar'>
                                        <div className='bar even' style={{ width: `${probs.even}%` }}></div>
                                        <div className='bar odd' style={{ width: `${probs.odd}%` }}></div>
                                    </div>
                                </div>

                                <div className='prob-item'>
                                    <div className='label-row'>
                                        <span>UNDER (0-3) / OVER (6-9)</span>
                                        <span>
                                            {probs.under.toFixed(1)}% / {probs.over.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className='dual-bar'>
                                        <div className='bar under' style={{ width: `${probs.under}%` }}></div>
                                        <div className='bar over' style={{ width: `${probs.over}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='analytics-card distribution-card'>
                            <h3>First Digit Distribution</h3>
                            <div className='dist-grid'>
                                {first_digit_stats
                                    .filter(s => s.digit > 0)
                                    .map(stat => (
                                        <div key={stat.digit} className='dist-item'>
                                            <span className='digit'>{stat.digit}</span>
                                            <div className='dist-bar-wrapper'>
                                                <div
                                                    className='dist-bar'
                                                    style={{ height: `${Math.max(5, stat.percentage)}%` }}
                                                ></div>
                                            </div>
                                            <span className='percent'>{stat.percentage.toFixed(0)}%</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__logic-toggles'>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>Alternate Even and Odd</label>
                                <ToggleSwitch
                                    id='alternate_even_odd'
                                    is_enabled={alternate_even_odd}
                                    handleToggle={() => (smart_trading.alternate_even_odd = !alternate_even_odd)}
                                />
                            </div>
                        </div>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>Alternate on Loss</label>
                                <ToggleSwitch
                                    id='alternate_on_loss'
                                    is_enabled={alternate_on_loss}
                                    handleToggle={() => (smart_trading.alternate_on_loss = !alternate_on_loss)}
                                />
                            </div>
                        </div>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>
                                    <span className='icon'>🔄</span> Recovery Mode
                                </label>
                                <ToggleSwitch
                                    id='recovery_mode'
                                    is_enabled={recovery_mode}
                                    handleToggle={() => (smart_trading.recovery_mode = !recovery_mode)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__stats-bar'>
                        <div className='stat-item'>Ticks Processed: {ticks_processed}</div>
                        <div className='stat-item'>Last Digit: {last_digit ?? '-'}</div>
                        <div className='stat-item'>
                            Session P/L:
                            <span className={session_pl >= 0 ? 'profit' : 'loss'}>
                                {session_pl >= 0 ? '+' : ''}
                                {session_pl.toFixed(2)}
                            </span>
                        </div>
                        <div className='stat-item'>
                            Wins: <span className='profit'>{wins}</span> | Losses:{' '}
                            <span className='loss'>{losses}</span>
                        </div>
                        <div className='stat-item'>Win Rate: {((wins / (wins + losses || 1)) * 100).toFixed(1)}%</div>
                        <div className='stat-item'>Streak: {current_streak}</div>
                        <div className='stat-item'>Current Stake: {current_stake.toFixed(2)}</div>
                        <button className='btn-reset-stats' onClick={resetStats}>
                            <span className='icon'>🔄</span> Reset Stats
                        </button>
                    </div>

                    <div className='smart-trading__settings'>
                        <div className='settings-card'>
                            <div className='setting-item'>
                                <label>Contract Type</label>
                                <select
                                    value={speedbot_contract_type}
                                    onChange={e => (smart_trading.speedbot_contract_type = e.target.value)}
                                >
                                    {contract_types.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className='setting-item'>
                                <button className='btn-bot-settings' onClick={() => setIsSettingsVisible(true)}>
                                    ⚙️ Bot Settings
                                </button>
                            </div>

                            {['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(
                                speedbot_contract_type
                            ) && (
                                <div className='setting-item'>
                                    <label>Prediction (0-9)</label>
                                    <input
                                        type='number'
                                        min='0'
                                        max='9'
                                        value={speedbot_prediction}
                                        onChange={e => (smart_trading.speedbot_prediction = parseInt(e.target.value))}
                                    />
                                </div>
                            )}

                            <div className='setting-item'>
                                <label>Stake</label>
                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.1'
                                    value={speedbot_stake}
                                    onChange={e => (smart_trading.speedbot_stake = parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__controls'>
                        <button
                            className={`btn-speed-trade ${is_speedbot_running ? 'running' : ''}`}
                            onClick={toggleSpeedbot}
                        >
                            {is_speedbot_running ? 'STOP SMART TRADING' : 'START TRADING'}
                        </button>
                    </div>
                </>
            )}

            <BotSettingsDialog is_visible={is_settings_visible} onClose={() => setIsSettingsVisible(false)} />
        </div>
    );
});

export default SmartTrading;
