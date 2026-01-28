import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const DigitCircles = observer(() => {
    const { analysis } = useStore();
    const { digit_stats, last_digit } = analysis;

    return (
        <div className='digit-circles'>
            {digit_stats.map(stat => {
                const isCurrent = stat.digit === last_digit;
                const dashArray = 201; // 2 * PI * 32
                const dashOffset = dashArray - (dashArray * stat.percentage) / 100;
                
                // Color logic: 1st=Green, 2nd=Yellow, Least(10th)=Red, Others=Gray/Theme
                let circleColor = 'var(--text-general)';
                if (stat.rank === 1) circleColor = '#10b981'; // Green
                else if (stat.rank === 2) circleColor = '#f59e0b'; // Yellow (actually amber/yellow-ish)
                else if (stat.rank === 10) circleColor = '#ef4444'; // Red

                return (
                    <div
                        key={stat.digit}
                        className={`digit-circle-card digit-${stat.digit} ${isCurrent ? 'active' : ''}`}
                        data-rank={stat.rank}
                    >
                        {isCurrent && (
                            <div className='active-indicator' style={{ color: '#a855f7' }}>
                                <div className='cursor-pointer'>▼</div>
                            </div>
                        )}
                        <div className='circle-svg-wrapper' style={{ borderColor: isCurrent ? '#a855f7' : 'transparent' }}>
                            <svg width='70' height='70' viewBox='0 0 70 70'>
                                <circle className='bg-circle' cx='35' cy='35' r='32' />
                                <circle
                                    className='progress-circle'
                                    cx='35'
                                    cy='35'
                                    r='32'
                                    style={{ stroke: isCurrent ? '#a855f7' : circleColor }}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                />
                            </svg>
                            <span className='digit-text' style={{ color: isCurrent ? '#a855f7' : 'inherit' }}>{stat.digit}</span>
                        </div>
                        <div className='percentage-text'>{stat.percentage.toFixed(1)}%</div>
                        <div className='power-bar-wrapper'>
                            <div 
                                className={`power-bar ${stat.is_increasing ? 'increasing' : 'decreasing'}`} 
                                style={{ width: `${stat.power}%` }} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default DigitCircles;
