import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const DigitCircles = observer(() => {
    const { analysis } = useStore();
    const { digit_stats, last_digit } = analysis;

    return (
        <div className='digit-circles'>
            {digit_stats.map(stat => {
                const isActive = stat.digit === last_digit;
                const dashArray = 201; // 2 * PI * 32
                const dashOffset = dashArray - (dashArray * stat.percentage) / 100;

                return (
                    <div
                        key={stat.digit}
                        className={`digit-circle-card digit-${stat.digit} ${isActive ? 'active' : ''}`}
                    >
                        {isActive && <div className='active-indicator'>▼</div>}
                        <div className='circle-svg-wrapper'>
                            <svg width='70' height='70' viewBox='0 0 70 70'>
                                <circle className='bg-circle' cx='35' cy='35' r='32' />
                                <circle
                                    className='progress-circle'
                                    cx='35'
                                    cy='35'
                                    r='32'
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                />
                            </svg>
                            <span className='digit-text'>{stat.digit}</span>
                        </div>
                        <div className='percentage-text'>{stat.percentage.toFixed(1)}%</div>
                    </div>
                );
            })}
        </div>
    );
});

export default DigitCircles;
