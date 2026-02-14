import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import './chart-widgets.scss';

type TDigitStatsProps = {
    ticks: number[];
    selected_digit: number | null;
};

type TStatRowProps = {
    label1: string;
    val1: string | number;
    label2: string;
    val2: string | number;
    color1: string;
    color2: string;
};

const DigitStatsWidget = observer(({ ticks }: TDigitStatsProps) => {
    const stats = useMemo(() => {
        if (!ticks || !Array.isArray(ticks) || ticks.length < 2) return null;

        const total = ticks.length;

        // Even/Odd
        const even = ticks.filter(d => d % 2 === 0).length;
        const odd = ticks.length - even;

        // Over/Under 4.5 (Standard split)
        const over = ticks.filter(d => d > 4).length;
        const under = ticks.length - over;

        // Matches (Highest Frequency Digit) & Differs (Lowest Frequency Digit)
        const counts = Array(10).fill(0);
        ticks.forEach(t => {
            if (t >= 0 && t <= 9) counts[t]++;
        });

        let highestDigit = 0;
        let highestCount = -1;
        let lowestDigit = 0;
        let lowestCount = Infinity;

        counts.forEach((count, i) => {
            if (count > highestCount) {
                highestCount = count;
                highestDigit = i;
            }
            if (count < lowestCount) {
                lowestCount = count;
                lowestDigit = i;
            }
        });

        // Rise/Fall
        let rise = 0;
        let fall = 0;
        for (let i = 1; i < ticks.length; i++) {
            if (ticks[i] > ticks[i - 1]) rise++;
            else if (ticks[i] < ticks[i - 1]) fall++;
        }
        const rfTotal = rise + fall || 1;

        return {
            evenPct: ((even / total) * 100).toFixed(1),
            oddPct: ((odd / total) * 100).toFixed(1),
            overPct: ((over / total) * 100).toFixed(1),
            underPct: ((under / total) * 100).toFixed(1),
            risePct: ((rise / rfTotal) * 100).toFixed(1),
            fallPct: ((fall / rfTotal) * 100).toFixed(1),
            matchesPct: ((highestCount / total) * 100).toFixed(1),
            differsPct: ((lowestCount / total) * 100).toFixed(1),
            highestDigit,
            lowestDigit,
        };
    }, [ticks]); // Removed selected_digit dependency as it's no longer key for calculation

    if (!stats) return null;

    // Colors for gradients
    const gradients = {
        blue: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
        red: 'linear-gradient(90deg, #f43f5e, #e11d48)',
        green: 'linear-gradient(90deg, #10b981, #34d399)',
        orange: 'linear-gradient(90deg, #f59e0b, #d97706)',
        purple: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
        gray: 'linear-gradient(90deg, #64748b, #94a3b8)',
    };

    const shadows = {
        blue: '0 0 10px rgba(59, 130, 246, 0.6)',
        red: '0 0 10px rgba(244, 63, 94, 0.6)',
        green: '0 0 10px rgba(16, 185, 129, 0.6)',
        orange: '0 0 10px rgba(245, 158, 11, 0.6)',
        purple: '0 0 10px rgba(139, 92, 246, 0.6)',
        gray: 'none',
    };

    const StatRow = ({
        label1,
        val1,
        label2,
        val2,
        color1,
        color2,
        shadow1,
        shadow2,
    }: TStatRowProps & { shadow1: string; shadow2: string }) => (
        <div className='stat-row' style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className='stat-labels-container'>
                <span style={{ color: '#fff', textShadow: shadow1 }}>
                    {label1} <span style={{ opacity: 0.8, fontSize: '0.85em' }}>{val1}%</span>
                </span>
                <span style={{ color: '#fff', textShadow: shadow2 }}>
                    <span style={{ opacity: 0.8, fontSize: '0.85em' }}>{val2}%</span> {label2}
                </span>
            </div>
            <div className='stat-progress-container'>
                <div
                    className='progress-bar'
                    style={{
                        width: `${val1}%`,
                        background: color1,
                        boxShadow: shadow1,
                        borderRadius: '6px 0 0 6px',
                        zIndex: 2,
                    }}
                ></div>
                <div
                    className='progress-bar'
                    style={{
                        width: `${val2}%`,
                        background: color2,
                        boxShadow: shadow2,
                        borderRadius: '0 6px 6px 0',
                        zIndex: 1,
                    }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className='digit-stats-widget summary-mode'>
            <StatRow
                label1='Even'
                val1={stats.evenPct}
                label2='Odd'
                val2={stats.oddPct}
                color1={gradients.blue}
                color2={gradients.red}
                shadow1={shadows.blue}
                shadow2={shadows.red}
            />
            <StatRow
                label1='Over'
                val1={stats.overPct}
                label2='Under'
                val2={stats.underPct}
                color1={gradients.green}
                color2={gradients.red}
                shadow1={shadows.green}
                shadow2={shadows.red}
            />
            <StatRow
                label1={`Matches (${stats.highestDigit})`}
                val1={stats.matchesPct}
                label2={`Differs (${stats.lowestDigit})`}
                val2={stats.differsPct}
                color1={gradients.purple}
                color2={gradients.gray}
                shadow1={shadows.purple}
                shadow2={shadows.gray}
            />
            <StatRow
                label1='Rise'
                val1={stats.risePct}
                label2='Fall'
                val2={stats.fallPct}
                color1={gradients.green}
                color2={gradients.orange}
                shadow1={shadows.green}
                shadow2={shadows.orange}
            />
        </div>
    );
});

export default DigitStatsWidget;
