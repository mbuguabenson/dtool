import { observer } from 'mobx-react-lite';
import SCPTab from '../smart-trading/components/scp-tab';
import './auto-trader.scss';

const AutoTrader = observer(() => {
    return (
        <div className='auto-trader-wrapper'>
            <SCPTab />
        </div>
    );
});

export default AutoTrader;
