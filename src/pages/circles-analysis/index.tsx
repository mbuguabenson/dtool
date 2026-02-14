import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { AnalysisSection, DigitCircles, TradingEngine } from './components';
import './circles-analysis.scss';

const CirclesAnalysis = observer(() => {
    const { analysis } = useStore();
    const {
        current_price,
        symbol,
        total_ticks,
        even_odd_history,
        over_under_history,
        matches_differs_history,
        rise_fall_history,
        percentages = { even: 50, odd: 50, over: 50, under: 50, match: 0, differ: 0, rise: 0, fall: 0 },
        current_streaks = {
            even_odd: { count: 0, type: '' },
            over_under: { count: 0, type: '' },
            match_diff: { count: 0, type: '' },
            rise_fall: { count: 0, type: '' },
        },
        setSymbol,
        setTotalTicks,
        last_digit,
        markets,
        over_under_threshold,
        match_diff_digit,
    } = analysis;

    // Unified market data is now managed by AnalysisStore's internal subscription
    // Components just reactively observe 'analysis' or 'digit_cracker' state.

    return (
        <div className='circles-analysis-container'>
            <div className='hero-bg-blobs'>
                <div className='blob blob-1' />
                <div className='blob blob-2' />
                <div className='blob blob-3' />
            </div>
            <header className='analysis-header'>
                <div className='header-left'>
                    <div className='market-selector-wrapper'>
                        <label>Select Market</label>
                        <select value={symbol} onChange={e => setSymbol(e.target.value)} className='premium-select'>
                            {markets.map(group => (
                                <optgroup key={group.group} label={group.group}>
                                    {group.items.map(item => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className='ticks-input-wrapper'>
                        <label>Last Ticks</label>
                        <input
                            type='number'
                            value={total_ticks}
                            onChange={e => setTotalTicks(parseInt(e.target.value))}
                            className='premium-input'
                        />
                    </div>
                </div>

                <div className='header-right'>
                    <div className='price-display-card'>
                        <span className='label'>LIVE PRICE</span>
                        <span className='price-value'>{current_price}</span>
                    </div>
                    <div
                        className={`digit-display-card ${last_digit !== null ? (last_digit % 2 === 0 ? 'digit--even' : 'digit--odd') : ''}`}
                    >
                        <span className='label'>LAST DIGIT</span>
                        <span className='digit-value'>{last_digit ?? '-'}</span>
                    </div>
                </div>
            </header>

            <DigitCircles />

            <div className='circles-analysis__content'>
                <TradingEngine />

                <div className='analysis-sections-grid'>
                    <AnalysisSection
                        title='Matches/Differs'
                        streak={current_streaks.match_diff}
                        history={matches_differs_history}
                        left_label={`MATCHES ${match_diff_digit}`}
                        left_pct={percentages.match}
                        right_label={`DIFFERS ${match_diff_digit}`}
                        right_pct={percentages.differ}
                        type='M_D'
                    />
                    <AnalysisSection
                        title='Over/Under'
                        streak={current_streaks.over_under}
                        history={over_under_history}
                        left_label={`OVER ${over_under_threshold}`}
                        left_pct={percentages.over}
                        right_label={`UNDER ${over_under_threshold}`}
                        right_pct={percentages.under}
                        type='U_O'
                    />
                    <AnalysisSection
                        title='Even/Odd'
                        streak={current_streaks.even_odd}
                        history={even_odd_history}
                        left_label='EVEN'
                        left_pct={percentages.even}
                        right_label='ODD'
                        right_pct={percentages.odd}
                        type='E_O'
                    />
                    <AnalysisSection
                        title='Rise/Fall'
                        streak={current_streaks.rise_fall}
                        history={rise_fall_history}
                        left_label='RISE'
                        left_pct={percentages.rise}
                        right_label='FALL'
                        right_pct={percentages.fall}
                        type='R_F'
                    />
                </div>
            </div>
        </div>
    );
});

export default CirclesAnalysis;
