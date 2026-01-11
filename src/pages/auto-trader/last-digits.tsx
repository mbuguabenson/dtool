import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';
import classNames from 'classnames';

const LastDigits = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, last_digit } = smart_trading;
    const [showAll, setShowAll] = useState(false);

    // Get last 50 or last 20 based on toggle
    const displayDigits = showAll ? ticks.slice(-50) : ticks.slice(-20);
    const digitCount = showAll ? 50 : 20;

    return (
        <div className='last-digits-panel'>
            <div className='panel-title'>
                <Localize i18n_default_text={`Last ${digitCount} Digits`} />
                {ticks.length > 20 && (
                    <button className='toggle-btn' onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show 20 Digits' : 'Show 50 Digits'}
                    </button>
                )}
            </div>
            <div className={classNames('digits-row', { expanded: showAll })}>
                {displayDigits.map((digit, index) => (
                    <div
                        key={index}
                        className={classNames('digit-box', {
                            even: digit % 2 === 0,
                            odd: digit % 2 !== 0,
                            pulse: index === displayDigits.length - 1, // Highlight latest
                        })}
                    >
                        {digit}
                    </div>
                ))}
            </div>
            <div className='current-digit-display'>
                <Localize i18n_default_text='Last Digit: ' />
                <span className='large-digit'>{last_digit !== null ? last_digit : '-'}</span>
            </div>
        </div>
    );
});

export default LastDigits;
