import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useStore } from '@/hooks/useStore';
import {
    TicksStreamRequest,
} from '@deriv/api-types';
import { ChartTitle, SmartChart } from '@deriv/deriv-charts';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import '@deriv/deriv-charts/dist/smartcharts.css';
import TickStreamWidget from './chart-widgets/tick-stream-widget';
import DigitStatsWidget from './chart-widgets/digit-stats-widget';
import RiseFallStatsWidget from './chart-widgets/rise-fall-stats-widget';
import TradeSignalWidget from './chart-widgets/trade-signal-widget';
import LastDigitsChart from './chart-widgets/last-digits-chart';

const Chart = observer(({ show_digits_stats }: { show_digits_stats: boolean }) => {
    const barriers: [] = [];
    const { common, ui } = useStore();
    const { chart_store, run_panel, dashboard } = useStore();
    const [isSafari, setIsSafari] = useState(false);
    const [tickHistory, setTickHistory] = useState<number[]>([]);

    // Derived stats
    const lastDigits = tickHistory.map(t => {
        const quote = t.toString();
        return parseInt(quote.slice(-1));
    });

    const {
        chart_type,
        getMarketsOrder,
        granularity,
        onSymbolChange,
        setChartStatus,
        symbol,
        updateChartType,
        updateGranularity,
        updateSymbol,
        setChartSubscriptionId,
        chart_subscription_id,
    } = chart_store;
    const chartSubscriptionIdRef = useRef(chart_subscription_id);
    const subscriptions = useRef<Record<string, any>>({});
    const { isDesktop, isMobile } = useDevice();
    const { is_drawer_open } = run_panel;
    const { is_chart_modal_visible } = dashboard;
    const settings = {
        assetInformation: true, // ui.is_chart_asset_info_visible,
        countdown: true,
        isHighestLowestMarkerEnabled: true, // TODO: Pending UI,
        language: common.current_language.toLowerCase(),
        position: ui.is_chart_layout_default ? 'bottom' : 'left',
        theme: ui.is_dark_mode_on ? 'dark' : 'light',
    };

    useEffect(() => {
        // Safari browser detection
        const isSafariBrowser = () => {
            const ua = navigator.userAgent.toLowerCase();
            return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1 && ua.indexOf('android') === -1;
        };

        setIsSafari(isSafariBrowser());

        return () => {
            if (chartSubscriptionIdRef.current) {
                chart_api.api.forget(chartSubscriptionIdRef.current).catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        chartSubscriptionIdRef.current = chart_subscription_id;
    }, [chart_subscription_id]);

    useEffect(() => {
        if (!symbol) updateSymbol();
    }, [symbol, updateSymbol]);

    const requestAPI = (req: any) => {
        return chart_api.api.send(req);
    };

    const requestSubscribe = (req: TicksStreamRequest, callback: (data: any) => void) => {
        const subId = chartSubscriptionIdRef.current;
        if (subId && subscriptions.current[subId]) {
            subscriptions.current[subId].unsubscribe();
            delete subscriptions.current[subId];
        }

        chart_api.api
            .send(req)
            .then((history: any) => {
                setChartSubscriptionId(history?.subscription?.id);

                if (history?.history?.prices) {
                    setTickHistory(history.history.prices);
                    callback(history);
                }

                if (req.subscribe === 1 && history?.subscription?.id) {
                    const subscription = chart_api.api.onMessage().subscribe(({ data }: any) => {
                        if (data?.tick?.quote) {
                            setTickHistory(prev => [...prev.slice(-999), data.tick.quote]);
                        }
                        callback(data);
                    });
                    subscriptions.current[history.subscription.id] = subscription;
                }
            })
            .catch((e: any) => {
                // eslint-disable-next-line no-console
                e?.error?.code === 'MarketIsClosed' && callback([]);
                console.log(e?.error?.message);
            });
    };

    if (!symbol) return null;
    const is_connection_opened = !!chart_api?.api;
    return (
        <div
            className={classNames('dashboard__chart-wrapper', {
                'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                'dashboard__chart-wrapper--safari': isSafari,
            })}
            dir='ltr'
        >
            <SmartChart
                id='dbot'
                barriers={barriers}
                showLastDigitStats={show_digits_stats}
                chartControlsWidgets={null}
                enabledChartFooter={false}
                chartStatusListener={(v: boolean) => setChartStatus(!v)}
                toolbarWidget={() => (
                    <ToolbarWidgets
                        updateChartType={updateChartType}
                        updateGranularity={updateGranularity}
                        position={!isDesktop ? 'bottom' : 'top'}
                        isDesktop={isDesktop}
                    />
                )}
                chartType={chart_type}
                isMobile={isMobile}
                enabledNavigationWidget={isDesktop}
                granularity={granularity}
                requestAPI={requestAPI}
                requestForget={() => {}}
                requestForgetStream={() => {}}
                requestSubscribe={requestSubscribe}
                settings={settings}
                symbol={symbol}
                topWidgets={() => <ChartTitle onChange={onSymbolChange} />}
                isConnectionOpened={is_connection_opened}
                getMarketsOrder={getMarketsOrder}
                isLive
                leftMargin={80}
            >
                {/* Restored Chart Widgets */}
                <div className='chart-widgets-container'>
                    <TickStreamWidget ticks={tickHistory} />
                    <DigitStatsWidget ticks={tickHistory} selected_digit={null} />
                    <RiseFallStatsWidget ticks={tickHistory} />
                    <TradeSignalWidget
                        prediction={lastDigits[lastDigits.length - 1] || 0}
                        market={symbol}
                        condition='Rise/Fall'
                    />
                    {show_digits_stats && <LastDigitsChart digits={lastDigits} />}
                </div>
            </SmartChart>
        </div>
    );
});

export default Chart;
