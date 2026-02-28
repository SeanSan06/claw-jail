import { useState, useEffect, useRef } from 'react';

function LiveActivityLog() {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const logContainerRef = useRef(null);

    // Mock data - replace with real API calls
    useEffect(() => {
        const mockLogs = [
            { id: 1, timestamp: '14:32:05', action: 'Read file: config.json', risk: 'low' },
            { id: 2, timestamp: '14:32:08', action: 'Execute: npm install', risk: 'medium' },
            { id: 3, timestamp: '14:32:12', action: 'Delete directory: /tmp/cache', risk: 'high' },
            { id: 4, timestamp: '14:32:15', action: 'Read environment variables', risk: 'medium' },
        ];
        setLogs(mockLogs);
    }, []);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const getRiskBadgeClass = (risk) => {
        switch(risk) {
            case 'high': return 'risk-high';
            case 'medium': return 'risk-medium';
            case 'low': return 'risk-low';
            default: return '';
        }
    };

    return (
        <div className="live-activity-log">
            <div className="log-header">
                <h2>Live Activity Log</h2>
                <label className="auto-scroll">
                    <input 
                        type="checkbox" 
                        checked={autoScroll} 
                        onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    Auto-scroll
                </label>
            </div>

            <div className="log-container" ref={logContainerRef}>
                {logs.map((log) => (
                    <div key={log.id} className="log-entry">
                        <div className="log-time">{log.timestamp}</div>
                        <div className="log-action">{log.action}</div>
                        <span className={`risk-badge ${getRiskBadgeClass(log.risk)}`}>
                            {log.risk}
                        </span>
                    </div>
                ))}
            </div>

            <div className="log-footer">
                <p>Total entries: {logs.length}</p>
            </div>
        </div>
    );
}

export default LiveActivityLog;