import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import MarketSelector from './market-selector';
import './market-overview.scss';

const MarketOverview = observer(() => {
    const { smart_trading, app } = useStore();
    const { symbol, current_price, last_digit, updateDigitStats, active_symbols_data } = smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    useEffect(() => {
        if (!ticks_service || !symbol) return;
        let is_mounted = true;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            const callback = (ticks_data: { quote: string | number }[]) => {
                if (is_mounted && ticks_data && ticks_data.length > 0) {
                    const latest = ticks_data[ticks_data.length - 1];
                    const symbol_info = active_symbols_data?.[symbol];
                    const last_digits = ticks_data.slice(-1000).map(t => {
                        let quote_str = String(t.quote || '0');
                        if (symbol_info && typeof t.quote === 'number') {
                            const decimals = Math.abs(Math.log10(symbol_info.pip));
                            quote_str = t.quote.toFixed(decimals);
                        }
                        const digit = parseInt(quote_str[quote_str.length - 1]);
                        return isNaN(digit) ? 0 : digit;
                    });
                    updateDigitStats(last_digits, latest.quote);
                }
            };
            listenerKey = await ticks_service.monitor({ symbol, callback });
        };
        monitorTicks();
        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    return (
        <div className='smart-market-overview'>
            <div className='market-overview__header'>
                <div className='market-overview__selector'>
                    <label>Select Market</label>
                    <MarketSelector />
                </div>
                <div className='market-overview__price-card'>
                    <span className='label'>Current Price</span>
                    <span className='price'>{current_price}</span>
                </div>
                <div className='market-overview__digit-card'>
                    <span className='label'>Last Digit</span>
                    <span className={`digit digit--${last_digit}`}>{last_digit}</span>
                </div>
            </div>
        </div>
    );
});

export default MarketOverview;
