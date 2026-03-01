import { useState, useEffect, useRef } from 'react';
import '../styles/specific-components/live-activity-log.css';

function LiveActivityLog() {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const logContainerRef = useRef(null);

    // Fetch initial logs from backend API
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/logs');
                const data = await response.json();
                setLogs(data.logs);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch logs:', err);
                setError('Failed to load logs');
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    // Simulate new logs appearing every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const actions = [
                'Network connection established',
                'File access: /etc/config',
                'Process spawned: systemd',
                'Memory allocation: 256MB',
                'DNS query: google.com',
                'SSH login attempt',
                'Database query executed',
                'Cache cleared',
                'Firewall rule updated',
                'Backup initiated'
            ];

            const risks = ['low', 'medium', 'high'];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            const randomRisk = risks[Math.floor(Math.random() * risks.length)];

            const newLog = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                }),
                action: randomAction,
                risk: randomRisk
            };

            setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
        }, 3000); // Add new log every 3 seconds

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const getRiskBadgeClass = (risk) => {
        return `risk-badge risk-${risk}`;
    };

    if (loading) return <div id="live-activity-log"><p>Loading logs...</p></div>;
    if (error) return <div id="live-activity-log"><p>{error}</p></div>;

    return (
        <div id="live-activity-log">
            <h2>Live Activity Log</h2>
            <div id="log-entries" ref={logContainerRef}>
                {logs.map(log => (
                    <div key={log.id} className="log-entry">
                        <span className="log-time">{log.timestamp}</span>
                        <span className="log-action">{log.action}</span>
                        <span className={getRiskBadgeClass(log.risk)}>
                            {log.risk.toUpperCase()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LiveActivityLog;