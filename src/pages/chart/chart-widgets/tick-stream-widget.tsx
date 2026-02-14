import { useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import './chart-widgets.scss';

const DIGIT_COLORS: Record<number, string> = {
    0: '#f43f5e', // Rose
    1: '#3b82f6', // Blue
    2: '#06b6d4', // Cyan
    3: '#d946ef', // Fuchsia
    4: '#10b981', // Emerald
    5: '#2563eb', // Indigo Blue
    6: '#e11d48', // Crimson
    7: '#9333ea', // Purple
    8: '#f59e0b', // Amber
    9: '#7c3aed', // Violet
};

type TTickStreamProps = {
    ticks: number[];
};

const TickStreamWidget = observer(({ ticks }: TTickStreamProps) => {
    const [selectedDigits, setSelectedDigits] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    if (!ticks || !Array.isArray(ticks)) return null;

    const toggleDigit = (digit: number) => {
        setSelectedDigits(prev => (prev.includes(digit) ? prev.filter(d => d !== digit) : [...prev, digit]));
    };

    const filteredTicks = ticks.slice(-200).filter(tick => selectedDigits.includes(tick));

    return (
        <div className='tick-stream-widget'>
            <div className='tick-stream-header'>
                <h3>Last 200 Ticks</h3>
                <div className='digit-filters'>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                        <button
                            key={d}
                            className={classNames('filter-btn', { active: selectedDigits.includes(d) })}
                            onClick={() => toggleDigit(d)}
                            style={
                                selectedDigits.includes(d)
                                    ? { backgroundColor: DIGIT_COLORS[d], borderColor: DIGIT_COLORS[d] }
                                    : {}
                            }
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>
            <div className='tick-stream-list'>
                {filteredTicks
                    .slice()
                    .reverse()
                    .map((tick, index) => (
                        <div
                            key={index}
                            className={`tick-item tick-${tick} ${index === 0 ? 'latest-tick' : ''}`}
                            style={{
                                backgroundColor: DIGIT_COLORS[tick],
                                color: '#fff',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                            }}
                        >
                            {tick}
                        </div>
                    ))}
            </div>
        </div>
    );
});

export default TickStreamWidget;
