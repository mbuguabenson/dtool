import React from 'react';
import { observer } from 'mobx-react-lite';
import { useApiBase } from '@/hooks/useApiBase';

const SystemStatus = observer(() => {
    const { connectionStatus } = useApiBase();
    // Assuming there's a log store or we can access logs. 
    // Since there isn't a dedicated global log store visible yet, we'll create a simple view 
    // that shows current connection status and maybe some mocked or local logs if available.
    // Ideally, we should have a store for this.
    
    // For now, let's display connection status and instructions.
    
    return (
        <div className="system-logs">
             <div className="logs-header">
                <h3>System Status Monitor</h3>
                <div className={`status-indicator ${connectionStatus === 'active' ? 'active' : 'inactive'}`}>
                    Status: {connectionStatus}
                </div>
            </div>
            
            <div className="logs-container">
                <div className="log-entry system">
                    <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                    <span className="message">System Monitor Initialized</span>
                </div>
                 {connectionStatus === 'active' ? (
                     <div className="log-entry success">
                        <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                        <span className="message">Connection to Deriv API established.</span>
                     </div>
                 ) : (
                      <div className="log-entry error">
                        <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                        <span className="message">Connection to Deriv API lost or connecting...</span>
                     </div>
                 )}
                 {/* Placeholder for future detailed logs */}
                 <div className="log-entry info">
                    <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                    <span className="message">Chart services running...</span>
                 </div>
            </div>
        </div>
    );
});

export default SystemStatus;
