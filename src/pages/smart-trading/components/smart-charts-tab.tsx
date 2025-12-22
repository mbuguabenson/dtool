import React from 'react';
import './smart-charts-tab.scss';

const SmartChartsTab = () => {
    return (
        <div className="smart-charts-tab">
             <iframe
                src="https://charts.deriv.com/deriv"
                title="Deriv Charts"
                className="deriv-chart-iframe"
                allowFullScreen
            />
        </div>
    );
};

export default SmartChartsTab;
