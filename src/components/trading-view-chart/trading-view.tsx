import Chart from '../../pages/chart/chart';

const TradingViewComponent = () => {
    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--general-section-1)' }}>
            <Chart show_digits_stats={true} />
        </div>
    );
};

export default TradingViewComponent;
