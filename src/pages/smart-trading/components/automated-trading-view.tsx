import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import SCPTab from './scp-tab';
import StrategyTile from './strategy-tile';
import './automated-trading.scss';

const AutomatedTradingView = observer(() => {
    const { smart_trading, dashboard } = useStore();
    const { strategies } = smart_trading;

    if (dashboard.active_tab === DBOT_TABS.SMART_AUTO24) {
        return <SCPTab />;
    }

    return (
        <div className='automated-trading-view'>
            {Object.values(strategies)
                .filter((s: any) => !['EVENODD', 'OVER3UNDER6', 'OVER2UNDER7', 'MATCHES', 'DIFFERS'].includes(s.id))
                .map((strategy: any) => (
                    <StrategyTile key={strategy.id} strategy={strategy} />
                ))}
        </div>
    );
});

export default AutomatedTradingView;
