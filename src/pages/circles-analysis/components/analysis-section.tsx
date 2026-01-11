import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

interface AnalysisSectionProps {
    title: string;
    streak: { count: number; type: string };
    history: any[];
    left_label: string;
    left_pct: number;
    right_label: string;
    right_pct: number;
    type: string;
}

const AnalysisSection = observer(
    ({ title, streak, history, left_label, left_pct, right_label, right_pct, type }: AnalysisSectionProps) => {
        const { analysis } = useStore();
        return (
            <div className='analysis-section-card'>
                <div className='section-header'>
                    <h3 className='section-title'>{title}</h3>
                    <div className='streak-info'>
                        Current Streak:{' '}
                        <span className='streak-value'>
                            {streak.count}x {streak.type}
                        </span>
                    </div>
                </div>

                {type !== 'R_F' && (
                    <div className='digit-selector'>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                            <div
                                key={d}
                                className={`digit-box ${
                                    (type === 'M_D' && d === analysis.match_diff_digit) ||
                                    (type === 'U_O' && d === analysis.over_under_threshold)
                                        ? 'selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    if (type === 'M_D') analysis.setMatchDiffDigit(d);
                                    if (type === 'U_O') analysis.setOverUnderThreshold(d);
                                }}
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                )}

                <div className='percentage-bars'>
                    <div className='bar-container left'>
                        <div className='bar-header'>
                            <span className='label'>{left_label}</span>
                            <span className='value'>{left_pct.toFixed(1)}%</span>
                        </div>
                        <div className='bar-bg'>
                            <div className='bar-fill' style={{ width: `${left_pct}%`, background: '#10b981' }}></div>
                        </div>
                    </div>
                    <div className='bar-container right'>
                        <div className='bar-header'>
                            <span className='label'>{right_label}</span>
                            <span className='value'>{right_pct.toFixed(1)}%</span>
                        </div>
                        <div className='bar-bg'>
                            <div className='bar-fill' style={{ width: `${right_pct}%`, background: '#ef4444' }}></div>
                        </div>
                    </div>
                </div>

                <div className='history-grid'>
                    {history.slice(0, 48).map((item, i) => (
                        <div key={i} className='history-item' style={{ background: item.color }}>
                            {item.type}
                        </div>
                    ))}
                    <button className='less-btn'>LESS</button>
                </div>
            </div>
        );
    }
);

export default AnalysisSection;
