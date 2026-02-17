import { useState, useEffect, useCallback, useRef } from 'react';
import DerivWebSocket from '@/lib/deriv-websocket';
import AnalysisEngine, { AnalysisResult, Signal } from '@/lib/analysis-engine';

export interface MarketData {
    symbol: string;
    display_name: string;
    price: string;
    digit: number;
    analysis: AnalysisResult | null;
    signals: Signal[];
    proSignals: Signal[];
    signal: string;
    tickCount: number;
}

export const useMultiSymbolDeriv = (initialSymbols: string[] = [], fetchAllActive = true, maxTicks = 50) => {
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
    const [activeSymbolsList, setActiveSymbolsList] = useState<string[]>(initialSymbols);

    const wsRef = useRef<DerivWebSocket | null>(null);
    const enginesRef = useRef<Record<string, AnalysisEngine>>({});

    // Initialize engines when symbols change
    useEffect(() => {
        activeSymbolsList.forEach(sym => {
            if (!enginesRef.current[sym]) {
                enginesRef.current[sym] = new AnalysisEngine(maxTicks);
            }
        });

        // Initialize state for new symbols
        setMarketData(prev => {
            const next = { ...prev };
            activeSymbolsList.forEach(sym => {
                if (!next[sym]) {
                    next[sym] = {
                        symbol: sym,
                        display_name: sym, // Placeholder, updated later if available
                        price: '0.00',
                        digit: 0,
                        analysis: null,
                        signals: [],
                        proSignals: [],
                        signal: 'WAIT', // Default
                        tickCount: 0,
                    };
                }
            });
            return next;
        });
    }, [activeSymbolsList, maxTicks]);

    const handleTick = useCallback((data: any) => {
        if (data.msg_type === 'tick') {
            const { symbol, quote } = data.tick;

            if (!enginesRef.current[symbol]) return;

            const priceStr = String(quote);
            const lastDigit = parseInt(priceStr[priceStr.length - 1]);

            // Update Engine
            enginesRef.current[symbol].addTick(quote);

            // Generate Analysis
            const analysis = enginesRef.current[symbol].getAnalysis();
            const signals = enginesRef.current[symbol].generateSignals();
            const proSignals = enginesRef.current[symbol].generateProSignals();
            
            // Derive Summary Signal
            let summarySignal = 'WAIT';
            if (proSignals.length > 0) {
                // Priority to Pro signals
                const buy = proSignals.some(s => s.type === 'BUY');
                const sell = proSignals.some(s => s.type === 'SELL');
                if (buy && !sell) summarySignal = 'STRONG BUY';
                else if (sell && !buy) summarySignal = 'STRONG SELL';
                else if (buy && sell) summarySignal = 'MIXED';
            } else if (signals.length > 0) {
                 const buy = signals.some(s => s.type === 'BUY');
                const sell = signals.some(s => s.type === 'SELL');
                if (buy && !sell) summarySignal = 'BUY';
                else if (sell && !buy) summarySignal = 'SELL';
            }

            setMarketData(prev => ({
                ...prev,
                [symbol]: {
                    ...prev[symbol],
                    symbol,
                    price: quote,
                    digit: lastDigit,
                    analysis,
                    signals,
                    proSignals,
                    signal: summarySignal,
                    tickCount: (prev[symbol]?.tickCount || 0) + 1,
                },
            }));
        }
    }, []);

    useEffect(() => {
        const connect = async () => {
            if (!wsRef.current) {
                wsRef.current = new DerivWebSocket();
                wsRef.current.subscribe('tick', handleTick);
            }

            try {
                await wsRef.current.connect();
                setConnectionStatus('connected');

                let symbolsToSubscribe = [...initialSymbols];

                if (fetchAllActive) {
                    const response = await wsRef.current.getActiveSymbols();
                    if (response.active_symbols) {
                        // Filter for Volatility Indices or relevant markets if needed. 
                        // For now, let's take Volatility Indices as they are most common for this app type
                        const vIndices = response.active_symbols
                            .filter((s: any) => s.market === 'synthetic_index' && s.submarket === 'random_index')
                            .map((s: any) => s.symbol);
                        
                         // Update state with display names if possible, but for now just symbols
                         symbolsToSubscribe = [...new Set([...symbolsToSubscribe, ...vIndices])];
                         setActiveSymbolsList(symbolsToSubscribe);
                         
                         // Update display names in marketData
                         setMarketData(prev => {
                             const next = { ...prev };
                             response.active_symbols.forEach((s: any) => {
                                 if (symbolsToSubscribe.includes(s.symbol)) {
                                     if (!next[s.symbol]) { 
                                         // Initialize if not exists (though useEffect above handles it mostly, strict mode might race)
                                          next[s.symbol] = {
                                            symbol: s.symbol,
                                            display_name: s.display_name,
                                            price: '0.00',
                                            digit: 0,
                                            analysis: null,
                                            signals: [],
                                            proSignals: [],
                                            signal: 'WAIT',
                                            tickCount: 0,
                                        };
                                     } else {
                                         next[s.symbol].display_name = s.display_name;
                                     }
                                 }
                             });
                             return next;
                         });
                    }
                }

                // Subscribe to all symbols
                // We add a small delay between subscriptions to avoid flooding
                symbolsToSubscribe.forEach((sym, index) => {
                    setTimeout(() => {
                        wsRef.current?.subscribeTicks(sym);
                    }, index * 250);
                });
            } catch (error) {
                console.error('Multi-symbol connection failed', error);
                setConnectionStatus('disconnected');
            }
        };

        connect();

        return () => {
            wsRef.current?.disconnect();
        };
    }, [initialSymbols, fetchAllActive, handleTick]);

    return {
        connectionStatus,
        marketData,
    };
};
