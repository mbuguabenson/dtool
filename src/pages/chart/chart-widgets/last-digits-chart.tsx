import { observer } from 'mobx-react-lite';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import './chart-widgets.scss';

type TLastDigitsLineChartProps = {
    digits: number[];
};

const LastDigitsLineChart = observer(({ digits }: TLastDigitsLineChartProps) => {
    if (!digits || !Array.isArray(digits) || digits.length === 0) return null;
    const data = digits.slice(-20).map((d, i) => ({ index: i, value: d }));

    return (
        <div className='last-digits-chart'>
            <div
                className='chart-header'
                style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}
            >
                Last 20 Digits Line
            </div>
            <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.1)' vertical={false} />
                    <XAxis hide />
                    <YAxis
                        domain={[0, 9]}
                        ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                        orientation='right'
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Line
                        type='linear'
                        dataKey='value'
                        stroke='#8b5cf6'
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#1e293b', stroke: '#8b5cf6', strokeWidth: 2 }}
                        isAnimationActive={false}
                    >
                        <LabelList
                            dataKey='value'
                            position='top'
                            offset={10}
                            style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                    </Line>
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

export default LastDigitsLineChart;
