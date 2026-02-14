import { useState, useEffect, useCallback, useRef } from 'react';
import DerivWebSocket from '@/lib/deriv-websocket';
import AnalysisEngine, { AnalysisResult, Signal } from '@/lib/analysis-engine';

export interface MarketData {
    symbol: string;
    price: string;
    digit: number;
    analysis: AnalysisResult | null;
    signals: Signal[];
    proSignals: Signal[];
}

export const useMultiSymbolDeriv = (symbols: string[] = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'], maxTicks = 50) => {
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [marketData, setMarketData] = useState<Record<string, MarketData>>({});

    const wsRef = useRef<DerivWebSocket | null>(null);
    const enginesRef = useRef<Record<string, AnalysisEngine>>({});

    // Initialize engines
    useEffect(() => {
        symbols.forEach(sym => {
            if (!enginesRef.current[sym]) {
                enginesRef.current[sym] = new AnalysisEngine(maxTicks);
            }
        });

        // Initialize state
        setMarketData(prev => {
            const next = { ...prev };
            symbols.forEach(sym => {
                if (!next[sym]) {
                    next[sym] = {
                        symbol: sym,
                        price: '0.00',
                        digit: 0,
                        analysis: null,
                        signals: [],
                        proSignals: [],
                    };
                }
            });
            return next;
        });
    }, [symbols, maxTicks]);

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

            setMarketData(prev => ({
                ...prev,
                [symbol]: {
                    symbol,
                    price: quote,
                    digit: lastDigit,
                    analysis,
                    signals,
                    proSignals,
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

                // Subscribe to all symbols
                // We add a small delay between subscriptions to avoid flooding
                symbols.forEach((sym, index) => {
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
    }, [symbols, handleTick]);

    return {
        connectionStatus,
        marketData,
    };
};
