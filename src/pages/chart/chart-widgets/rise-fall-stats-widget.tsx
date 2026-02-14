import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Localize } from '@deriv-com/translations';
import '../../easy-tool/even-odd-pattern.scss'; // Reuse styles
import './chart-widgets.scss';

type TRiseFallStatsProps = {
    ticks: number[];
};

const RiseFallStatsWidget = observer(({ ticks }: TRiseFallStatsProps) => {
    const stats = useMemo(() => {
        if (!ticks || !Array.isArray(ticks) || ticks.length < 2) return null;

        let rise = 0;
        let fall = 0;
        const history: { type: string; digit: number }[] = [];

        for (let i = 1; i < ticks.length; i++) {
            if (ticks[i] > ticks[i - 1]) {
                rise++;
                history.push({ type: 'R', digit: ticks[i] });
            } else if (ticks[i] < ticks[i - 1]) {
                fall++;
                history.push({ type: 'F', digit: ticks[i] });
            } else {
                history.push({ type: 'E', digit: ticks[i] }); // Equal
            }
        }

        const total = rise + fall || 1;

        return {
            risePct: ((rise / total) * 100).toFixed(1),
            fallPct: ((fall / total) * 100).toFixed(1),
            recentHistory: history.slice(-15).reverse(), // Last 15 events
        };
    }, [ticks]);

    if (!stats) return null;

    return (
        <div className='even-odd-pattern'>
            {' '}
            {/* Reusing class for consistent styling */}
            <div className='pattern-progress-wrapper'>
                <div className='pattern-progress-bar'>
                    <div
                        className='progress-fill even'
                        style={{ width: `${stats.risePct}%`, background: '#10b981' }}
                    ></div>
                    <div
                        className='progress-fill odd'
                        style={{ width: `${stats.fallPct}%`, background: '#ef4444' }}
                    ></div>
                </div>
                <div className='progress-labels'>
                    <span>{stats.risePct}%</span>
                    <span>{stats.fallPct}%</span>
                </div>
            </div>
            <div className='pattern-summary-cards'>
                <div
                    className={`summary-card ${Number(stats.risePct) > 55 ? 'signal-active' : ''}`}
                    style={{ borderColor: Number(stats.risePct) > 55 ? '#10b981' : '' }}
                >
                    <span className='percentage' style={{ color: '#10b981' }}>
                        {stats.risePct}%
                    </span>
                    {Number(stats.risePct) > 55 && (
                        <div
                            className='signal-badge pulse'
                            style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                border: '1px solid #10b981',
                            }}
                        >
                            <Localize i18n_default_text='HIGH SIGNAL' />
                        </div>
                    )}
                </div>
                <div
                    className={`summary-card ${Number(stats.fallPct) > 55 ? 'signal-active' : ''}`}
                    style={{ borderColor: Number(stats.fallPct) > 55 ? '#ef4444' : '' }}
                >
                    <span className='percentage' style={{ color: '#ef4444' }}>
                        {stats.fallPct}%
                    </span>
                    {Number(stats.fallPct) > 55 && (
                        <div
                            className='signal-badge pulse'
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid #ef4444',
                            }}
                        >
                            <Localize i18n_default_text='HIGH SIGNAL' />
                        </div>
                    )}
                </div>
            </div>
            <div className='pattern-history-section'>
                <div
                    style={{
                        display: 'flex',
                        gap: '6px',
                        justifyContent: 'center',
                        marginTop: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    {stats.recentHistory.map((item, idx) => (
                        <div
                            key={idx}
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: item.type === 'R' ? '#10b981' : item.type === 'F' ? '#ef4444' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                boxShadow:
                                    item.type === 'R'
                                        ? '0 0 8px rgba(16, 185, 129, 0.4)'
                                        : item.type === 'F'
                                          ? '0 0 8px rgba(239, 68, 68, 0.4)'
                                          : 'none',
                            }}
                            title={`Tick: ${item.digit}`}
                        >
                            {item.type}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default RiseFallStatsWidget;
