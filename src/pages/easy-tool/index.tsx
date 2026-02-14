import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';
import MarketSelector from '@/pages/smart-trading/components/market-selector';
import AdvancedOUAnalyzer from './advanced-ou-analyzer';
import DigitStatsWidget from '../chart/chart-widgets/digit-stats-widget';
import LastDigitsLineChart from '../chart/chart-widgets/last-digits-chart';

import TickStreamWidget from '../chart/chart-widgets/tick-stream-widget';

import DigitDistributionCircles from '../chart/digit-distribution-circles';
import EvenOddPattern from './even-odd-pattern';
import MatchesDiffersAnalyzer from './matches-differs-analyzer';
import OverUnderPattern from './over-under-pattern';
import './easy-tool.scss';
import './easy-tool.scss';

const EasyTool = observer(() => {
    const { smart_trading, common, app, client, ui } = useStore();
    const {
        symbol,
        current_price,
        last_digit,
        ticks,
        updateDigitStats,
        active_symbols_data,
        stats_sample_size,
        setStatsSampleSize,
    } = smart_trading;
    const { balance, currency } = client;
    const { latency, is_socket_opened } = common;
    const { is_dark_mode_on } = ui;
    const ticks_service = app.api_helpers_store?.ticks_service;

    const [selected_digit, setSelectedDigit] = useState<number | null>(null);



    // Derived last digits
    const lastDigits = ticks && Array.isArray(ticks) ? ticks.slice(-200) : [];

    useEffect(() => {
        if (!ticks_service || !symbol || !is_socket_opened) return;
        let is_mounted = true;
        let listenerKey: string | null = null;
        const monitorTicks = async () => {
             try {
                const callback = (ticks_data: { quote: string | number }[]) => {
                    if (is_mounted && ticks_data && ticks_data.length > 0) {
                         const latest = ticks_data[ticks_data.length - 1];
                         const symbol_info = active_symbols_data[symbol];
                         const decimals = symbol_info?.pip ? String(symbol_info.pip).split('.')[1]?.length || 2 : 2;

                        const last_digits = ticks_data.slice(-1000).map(t => {
                            let quote_str = String(t.quote || '0');
                            if (typeof t.quote === 'number') {
                                quote_str = t.quote.toFixed(decimals);
                            }
                            const digit = parseInt(quote_str[quote_str.length - 1]);
                            return isNaN(digit) ? 0 : digit;
                        });
                        
                        updateDigitStats(last_digits, latest.quote);
                    }
                };
                listenerKey = await ticks_service.monitor({ symbol, callback });
             } catch (error) {
                 // handle error
             }
        };
        monitorTicks();
        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data, is_socket_opened]);

    useEffect(() => {
        if (selected_digit === null && last_digit !== undefined) {
            setSelectedDigit(last_digit);
        }
    }, [last_digit, selected_digit]);

    return (
        <div className={`easy-tool ${is_dark_mode_on ? 'easy-tool--dark' : 'easy-tool--light'}`}>
            <div className='easy-tool__header'>
                <div className='easy-tool__title-group'>
                    <div className='easy-tool__title'>
                        <Localize i18n_default_text='Easy Tool' />
                    </div>
                </div>

                <div className='easy-tool__vitals-row'>
                    <div className='v-item'>
                        <span className='l'>PRICE</span>
                        <span className='v'>{current_price}</span>
                    </div>
                    <div className='v-item'>
                        <span className='l'>DIGIT</span>
                        <span className='v digit'>{last_digit ?? '-'}</span>
                    </div>
                    <div className='v-item'>
                        <span className='l'>BALANCE</span>
                        <span className='v balance'>{balance} {currency}</span>
                    </div>
                     <div className='v-item'>
                        <span className='l'>PING</span>
                        <span className='v'>{latency}ms</span>
                    </div>
                </div>

                <div className='easy-tool__controls'>
                    <div className='control-group'>
                        <select
                            className='ticks-select'
                            value={stats_sample_size}
                            onChange={e => setStatsSampleSize(Number(e.target.value))}
                        >
                            {[25, 50, 100, 500, 1000].map(val => (
                                <option key={val} value={val}>{val} Ticks</option>
                            ))}
                        </select>
                    </div>
                    <div className='control-group'>
                    
                </div>
            </div>
            </div>

            <div className='easy-tool__content'>
                {/* 1. Market & Ticks Selection */}
                <div className='easy-tool__header'>
                     <MarketSelector />
                     <div className='tick-selector'>
                         {[25, 50, 100, 200, 500, 1000].map(count => (
                             <button
                                 key={count}
                                 className={`tick-btn ${stats_sample_size === count ? 'active' : ''}`}
                                 onClick={() => setStatsSampleSize(count)}
                             >
                                 {count}
                             </button>
                         ))}
                     </div>
                </div>

                {/* 2. Main Stats Grid */}
                <div className='easy-tool__section' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className='section-card' style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <h3 className='section-title'>
                             <Localize i18n_default_text='Digit Distribution' />
                             <span className='subtitle-badge'>{stats_sample_size} Ticks</span>
                         </h3>
                         <DigitDistributionCircles onSelect={setSelectedDigit} selected_digit={selected_digit} />
                    </div>
                </div>

                {/* 2. Signals & Pattern Analysis (New Additions) */}
                <div className='easy-tool__section' style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {/* Integrated Digit Stats Summary */}
                    <div className='section-card'>
                         <h3 className='section-title'>Digit Statistics</h3>
                         <DigitStatsWidget ticks={ticks || []} selected_digit={selected_digit} />
                    </div>
                </div>

                {/* 3. Global Digit Selector */}
                <div className='easy-tool__digit-selector-wrapper'>
                    <div className='selector-label'><Localize i18n_default_text='Target Digit' /></div>
                    <div className='digit-bar-v2 large'>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                            <button
                                key={d}
                                className={`digit-btn-v2 ${selected_digit === d ? 'active' : ''} ${last_digit === d ? 'current' : ''}`}
                                onClick={() => setSelectedDigit(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Analysis Grid */}
                <div className='easy-tool__analysis-grid'>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'><Localize i18n_default_text='Over/Under Analysis' /></div>
                        {selected_digit !== null && <AdvancedOUAnalyzer selected_digit={selected_digit} ticks={ticks} />}
                    </div>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'><Localize i18n_default_text='Matches/Differs Analysis' /></div>
                        {selected_digit !== null && <MatchesDiffersAnalyzer selected_digit={selected_digit} ticks={ticks} />}
                    </div>
                </div>

                {/* 5. Patterns */}
                {/* 5. Patterns */}
                <div className='easy-tool__section' style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div className='section-card pattern-full'>
                        <EvenOddPattern />
                    </div>
                    <div className='section-card pattern-full'>
                        <OverUnderPattern />
                    </div>
                </div>
                


                {/* 6. Tick Stream & Chart */}
                <div className='easy-tool__section'>
                    <div className='section-card'>
                        <TickStreamWidget ticks={lastDigits} />
                        <LastDigitsLineChart digits={lastDigits} />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EasyTool;
