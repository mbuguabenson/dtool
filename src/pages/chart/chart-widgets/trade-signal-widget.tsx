import React from 'react';
import { observer } from 'mobx-react-lite';
import { CirclePlay } from 'lucide-react';
import './chart-widgets.scss';

type TTradeSignalProps = {
    prediction: number | null;
    market: string;
    condition: string;
};

const TradeSignalWidget = observer(({ prediction, market, condition }: TTradeSignalProps) => {
    // Simple logic to simulate signal active state for demonstration/MVP
    // In real app, this would depend on the Analysis Engine's output
    if (prediction === null) return null;

    return (
        <div className='trade-signal-widget'>
            <div className='signal-info'>
                <h4>
                    <CirclePlay size={18} /> TRADE SIGNAL: {condition}
                </h4>
                <p>
                    Entry: <strong>{prediction}</strong> | Market: {market}
                </p>
            </div>
            <button className='trade-btn' onClick={() => window.alert('Trade Placed!')}>
                TRADE NOW
            </button>
        </div>
    );
});

export default TradeSignalWidget;
