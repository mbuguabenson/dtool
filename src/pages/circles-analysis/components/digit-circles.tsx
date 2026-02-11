import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const DigitCircles = observer(() => {
    const { analysis } = useStore();
    const { digit_stats, last_digit } = analysis;

    const group1 = digit_stats.slice(0, 5);
    const group2 = digit_stats.slice(5, 10);

    const renderDigitGroup = (digits: typeof digit_stats) => {
        return digits.map(stat => {
            const isCurrent = stat.digit === last_digit;
            const dashArray = 140; // Match DigitCracker
            const dashOffset = dashArray - (dashArray * stat.percentage) / 100;
            
            let strokeColor = '#6b7280';
            if (stat.rank === 1) strokeColor = '#00ff41';
            else if (stat.rank === 2) strokeColor = '#ffd700';
            else if (stat.rank === 10) strokeColor = '#ff073a';
            
            const finalColor = isCurrent ? '#ff9f00' : strokeColor;

            return (
                <div key={stat.digit} className={`digit-circle-card digit-${stat.digit} ${isCurrent ? 'active' : ''}`} data-rank={stat.rank}>
                    {isCurrent && <div className='live-indicator'>LIVE</div>}
                    <div className='circle-svg-wrapper' style={{ borderColor: finalColor, boxShadow: `0 0 12px ${finalColor}40` }}>
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
                        <span className='digit-text' style={{ color: finalColor, textShadow: `0 0 12px ${finalColor}` }}>{stat.digit}</span>
                    </div>
                    <div className='digit-info'>
                        <div className='percentage-text'>{stat.percentage.toFixed(1)}%</div>
                        <div className='power-bar-wrapper'>
                            <div 
                                className={`power-bar ${stat.is_increasing ? 'increasing' : 'decreasing'}`} 
                                style={{ width: `${stat.power}%`, backgroundColor: finalColor, boxShadow: `0 0 6px ${finalColor}` }} 
                            />
                        </div>
                        <div className='rank-text'>#{stat.rank}</div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className='digit-circles-wrapper'>
            <div className='digit-circles-row'>
                {renderDigitGroup(group1)}
            </div>
            <div className='digit-circles-row'>
                {renderDigitGroup(group2)}
            </div>
        </div>
    );
});

export default DigitCircles;
