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
                
                // Color Logic as per requirements
                // Highest (1): Green, 2nd (2): Yellow, Least (10): Red
                // Current: Orange + Glow
                
                let circleColor = 'var(--text-general)';
                let glowClass = '';

                if (stat.rank === 1) {
                    circleColor = '#00ff41'; // Bright Neon Green
                    glowClass = 'glow-green';
                } else if (stat.rank === 2) {
                    circleColor = '#ffd700'; // Gold/Yellow
                    glowClass = 'glow-yellow';
                } else if (stat.rank === 10) {
                    circleColor = '#ff073a'; // Neon Red
                    glowClass = 'glow-red';
                }

                // Current digit overrides for stroke color (Orange) but keeps rank glow if applicable?
                // Request: "Current live digit Orange stroke + glowing cursor"
                // Let's prioritize Current for Stroke Color.
                
                const finalStroke = isCurrent ? '#ff9f00' : circleColor; // Bright Orange for current

                return (
                    <div
                        key={stat.digit}
                        className={`digit-circle-card digit-${stat.digit} ${isCurrent ? 'active glow-orange' : glowClass}`}
                        data-rank={stat.rank}
                    >
                        {isCurrent && (
                            <div className='active-indicator' style={{ color: '#ff9f00' }}>
                                <div className='cursor-pointer'>▼</div>
                            </div>
                        )}
                        <div className='circle-svg-wrapper' style={{ borderColor: isCurrent ? '#ff9f00' : 'transparent', boxShadow: isCurrent ? '0 0 15px #ff9f00' : 'none' }}>
                            <svg width='70' height='70' viewBox='0 0 70 70'>
                                <circle className='bg-circle' cx='35' cy='35' r='32' />
                                <circle
                                    className='progress-circle'
                                    cx='35'
                                    cy='35'
                                    r='32'
                                    style={{ stroke: finalStroke, filter: isCurrent ? 'drop-shadow(0 0 5px #ff9f00)' : (glowClass ? `drop-shadow(0 0 3px ${circleColor})` : 'none') }}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                />
                            </svg>
                            <span className='digit-text' style={{ color: isCurrent ? '#ff9f00' : 'inherit', textShadow: isCurrent ? '0 0 10px #ff9f00' : 'none' }}>{stat.digit}</span>
                        </div>
                        <div className='percentage-text'>{stat.percentage.toFixed(1)}%</div>
                        <div className='power-bar-wrapper'>
                            <div 
                                className={`power-bar ${stat.is_increasing ? 'increasing' : 'decreasing'}`} 
                                style={{ width: `${stat.power}%`, backgroundColor: finalStroke, boxShadow: `0 0 5px ${finalStroke}` }} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default DigitCircles;
