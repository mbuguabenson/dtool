import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import DigitDistributionCircles from '@/pages/chart/digit-distribution-circles';
import MarketSelector from '@/pages/smart-trading/components/market-selector';
import { Localize } from '@deriv-com/translations';
import AdvancedOUAnalyzer from './advanced-ou-analyzer';
import EvenOddPattern from './even-odd-pattern';
import MatchesDiffersAnalyzer from './matches-differs-analyzer';
import OverUnderPattern from './over-under-pattern';
import './easy-tool.scss';

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
    const [history_count, setHistoryCount] = useState<15 | 50>(15);

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

                        // Use safe decimal calculation similar to DigitStats
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
            } catch (error: unknown) {
                // Don't log or clear if it's just AlreadySubscribed (often happens during rapid switching)
                const err = error as { code?: string; message?: string };
                if (err?.code !== 'AlreadySubscribed' && err?.message !== 'AlreadySubscribed') {
                    console.error('EasyTool: Failed to monitor ticks', error);
                    if (is_mounted) {
                        updateDigitStats([], 0);
                    }
                }
            }
        };
        monitorTicks();
        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data, is_socket_opened]);

    // Update selected digit when last_digit changes if none selected
    useEffect(() => {
        if (selected_digit === null && last_digit !== undefined) {
            setSelectedDigit(last_digit);
        }
    }, [last_digit, selected_digit, setSelectedDigit]);

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
                        <span className='v balance'>
                            {balance} {currency}
                        </span>
                    </div>
                    <div className='v-item'>
                        <span className='l'>PING</span>
                        <span className='v'>{latency}ms</span>
                    </div>
                    <div className='v-item'>
                        <span className='l'>STATUS</span>
                        <span className={`v-status ${is_socket_opened ? 'online' : 'offline'}`}>
                            {is_socket_opened ? 'Connected' : 'Disconnected'}
                        </span>
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
                                <option key={val} value={val}>
                                    {val} Ticks
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='control-group'>
                        <MarketSelector />
                    </div>
                </div>
            </div>

            <div className='easy-tool__content'>
                {/* 1. Digit Distribution */}
                <div className='easy-tool__section'>
                    <div className='section-card distribution-v2'>
                        <DigitDistributionCircles onSelect={setSelectedDigit} selected_digit={selected_digit} />
                    </div>
                </div>

                {/* 2. Global Digit Selector */}
                <div className='easy-tool__digit-selector-wrapper'>
                    <div className='selector-label'>
                        <Localize i18n_default_text='Select Target Digit' />
                    </div>
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

                {/* 3. Analysis Grid (OU & MD side by side) */}
                <div className='easy-tool__analysis-grid'>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'>
                            <Localize i18n_default_text='Over/Under Analysis' />
                        </div>
                        {selected_digit !== null && (
                            <AdvancedOUAnalyzer selected_digit={selected_digit} ticks={ticks} />
                        )}
                    </div>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'>
                            <Localize i18n_default_text='Matches/Differs Analysis' />
                        </div>
                        {selected_digit !== null && (
                            <MatchesDiffersAnalyzer selected_digit={selected_digit} ticks={ticks} />
                        )}
                    </div>
                </div>

                {/* 4. Even/Odd Patterns */}
                <div className='easy-tool__section'>
                    <div className='section-card pattern-full'>
                        <EvenOddPattern />
                    </div>
                    <div className='section-card pattern-full'>
                        <OverUnderPattern />
                    </div>
                </div>
            </div>

            {/* 4. Tick Stream - WIDE Bottom */}
            <div className='easy-tool__section'>
                <div className='section-card history-v2-wide'>
                    <div className='section-card__header'>
                        <Localize i18n_default_text='Tick Stream' />
                        <div className='history-toggle'>
                            <button
                                className={history_count === 15 ? 'active' : ''}
                                onClick={() => setHistoryCount(15)}
                            >
                                15
                            </button>
                            <button
                                className={history_count === 50 ? 'active' : ''}
                                onClick={() => setHistoryCount(50)}
                            >
                                50
                            </button>
                        </div>
                    </div>
                    <div className={`history-v2__grid count-${history_count} is-wide`}>
                        {ticks
                            .slice(-history_count)
                            .reverse()
                            .map((digit, index) => (
                                <div
                                    key={index}
                                    className={`h-digit-v2 ${last_digit === digit && index === 0 ? 'is-current' : ''}`}
                                    style={
                                        {
                                            '--digit-color': DIGIT_COLORS[digit],
                                        } as React.CSSProperties
                                    }
                                >
                                    {digit}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EasyTool;
