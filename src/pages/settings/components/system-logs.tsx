import React, { useEffect,useState } from 'react';

const SystemLogs = () => {
    const [logs, setLogs] = useState<Array<{ time: string, level: string, message: string }>>([
        { time: new Date().toLocaleTimeString(), level: 'info', message: 'System initialized' },
        { time: new Date().toLocaleTimeString(), level: 'info', message: 'Connected to WebSocket' },
    ]);

    // Mock incoming logs
    useEffect(() => {
        const interval = setInterval(() => {
            const levels = ['info', 'warn', 'error'];
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            const messages = [
                'Tick received',
                'Heartbeat check',
                'Latency spike detected',
                'Connection stable',
                'Updating chart data'
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            setLogs(prev => [...prev.slice(-19), {
                time: new Date().toLocaleTimeString(),
                level: randomLevel === 'error' ? 'info' : randomLevel, // Reduce mock errors
                message: randomMessage
            }]);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="system-logs-section">
            <div className="settings-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>System Logs</h3>
                    <button 
                        onClick={() => setLogs([])}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Logs
                    </button>
                </div>
                
                <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    height: '400px',
                    overflowY: 'auto'
                }}>
                    {logs.map((log, index) => (
                        <div key={index} className={`log-entry ${log.level}`}>
                            <span style={{ opacity: 0.6 }}>[{log.time}]</span>{' '}
                            <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{log.level}:</span>{' '}
                            {log.message}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="log-entry info">No logs to display</div>}
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
