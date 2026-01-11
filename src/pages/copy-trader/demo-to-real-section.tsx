import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './demo-to-real-section.scss';

const DemoToRealSection = observer(() => {
    const { client } = useStore();
    const [isEnabled, setIsEnabled] = useState(false);
    const [realApiToken, setRealApiToken] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleToggle = async () => {
        if (!isEnabled) {
            if (!realApiToken.trim()) {
                setErrorMessage('Please enter your Real account API token');
                return;
            }

            setConnectionStatus('connecting');
            setErrorMessage('');

            // TODO: Implement actual connection logic with Deriv API
            // For now, simulate connection
            setTimeout(() => {
                setConnectionStatus('active');
                setIsEnabled(true);
            }, 1500);
        } else {
            setIsEnabled(false);
            setConnectionStatus('idle');
        }
    };

    const getStatusBadge = () => {
        switch (connectionStatus) {
            case 'connecting':
                return <span className='status-badge connecting'>Connecting...</span>;
            case 'active':
                return <span className='status-badge active'>● Active</span>;
            case 'error':
                return <span className='status-badge error'>✕ Error</span>;
            default:
                return <span className='status-badge idle'>○ Ready</span>;
        }
    };

    return (
        <div className={`demo-to-real-section ${isEnabled ? 'enabled' : ''}`}>
            <div className='section-header'>
                <div className='title-group'>
                    <h2>Demo to Real Account</h2>
                    <p>Copy trades from your current Demo session to a Real account automatically</p>
                </div>
                {getStatusBadge()}
            </div>

            <div className='section-body'>
                <div className='connection-info'>
                    <div className='info-row'>
                        <span className='label'>Demo Account:</span>
                        <span className='value'>{client.loginid || 'Not connected'}</span>
                    </div>
                    <div className='info-row'>
                        <span className='label'>Account Type:</span>
                        <span className='value'>{client.is_virtual ? 'Virtual' : 'Real'}</span>
                    </div>
                    <div className='info-row'>
                        <span className='label'>Balance:</span>
                        <span className='value'>
                            {client.balance} {client.currency}
                        </span>
                    </div>
                </div>

                <div className='token-input-group'>
                    <label>Real Account API Token</label>
                    <input
                        type='password'
                        placeholder='Enter your Real account API token...'
                        value={realApiToken}
                        onChange={e => setRealApiToken(e.target.value)}
                        disabled={isEnabled}
                        className={errorMessage ? 'error' : ''}
                    />
                    {errorMessage && <span className='error-message'>{errorMessage}</span>}
                </div>

                <button
                    className={`toggle-button ${isEnabled ? 'active' : ''}`}
                    onClick={handleToggle}
                    disabled={connectionStatus === 'connecting'}
                >
                    {connectionStatus === 'connecting' ? 'Connecting...' : isEnabled ? 'Stop Copying' : 'Start Copying'}
                </button>

                {isEnabled && (
                    <div className='copy-stats'>
                        <div className='stat-card'>
                            <span className='stat-label'>Trades Copied</span>
                            <span className='stat-value'>0</span>
                        </div>
                        <div className='stat-card'>
                            <span className='stat-label'>Total P/L</span>
                            <span className='stat-value positive'>+$0.00</span>
                        </div>
                        <div className='stat-card'>
                            <span className='stat-label'>Win Rate</span>
                            <span className='stat-value'>0%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default DemoToRealSection;
