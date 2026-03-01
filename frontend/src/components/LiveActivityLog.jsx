import { useState, useEffect, useRef } from 'react';
import '../styles/specific-components/live-activity-log.css';

function LiveActivityLog() {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [pendingHighRiskId, setPendingHighRiskId] = useState(null);
    const logContainerRef = useRef(null);
    const intervalRef = useRef(null);

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

    // Start interval for new logs (only when not paused)
    useEffect(() => {
        if (isPaused) {
            // Clear interval if paused
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

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

        intervalRef.current = setInterval(() => {
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
                risk: randomRisk,
                status: 'pending' // pending, approved, rejected
            };

            setLogs(prev => [newLog, ...prev.slice(0, 49)]);

            // If high risk, pause and wait for user decision
            if (randomRisk === 'high') {
                setIsPaused(true);
                setPendingHighRiskId(newLog.id);
            }
        }, 3000);

        return () => clearInterval(intervalRef.current);
    }, [isPaused]);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Handle approve action
    const handleApprove = async (logId) => {
        try {
            // Send approval to backend
            await fetch(`http://localhost:8000/api/logs/${logId}/approve`, {
                method: 'POST'
            });

            // Update log status in UI
            setLogs(prev => prev.map(log => 
                log.id === logId ? { ...log, status: 'approved' } : log
            ));

            // Resume log stream
            setPendingHighRiskId(null);
            setIsPaused(false);
        } catch (err) {
            console.error('Failed to approve log:', err);
        }
    };

    // Handle reject action
    const handleReject = async (logId) => {
        try {
            // Send rejection to backend
            await fetch(`http://localhost:8000/api/logs/${logId}/reject`, {
                method: 'POST'
            });

            // Update log status in UI
            setLogs(prev => prev.map(log => 
                log.id === logId ? { ...log, status: 'rejected' } : log
            ));

            // Resume log stream
            setPendingHighRiskId(null);
            setIsPaused(false);
        } catch (err) {
            console.error('Failed to reject log:', err);
        }
    };

    const getLogStatusClass = (status, risk) => {
        if (status === 'approved') return 'log-entry approved';
        if (status === 'rejected') return 'log-entry rejected';
        if (risk === 'high') return 'log-entry high-risk';
        return 'log-entry';
    };

    if (loading) return <div id="live-activity-log"><p>Loading logs...</p></div>;
    if (error) return <div id="live-activity-log"><p>{error}</p></div>;

    return (
        <div id="live-activity-log">
            <h2>Live Activity Log</h2>
            <div id="log-entries" ref={logContainerRef}>
                {logs.map(log => (
                    <div key={log.id} className={getLogStatusClass(log.status, log.risk)}>
                        <span className="log-time">{log.timestamp}</span>
                        <span className="log-action">{log.action}</span>
                        
                        <div className="log-controls">
                            {log.risk === 'high' && log.status === 'pending' && (
                                <div className="log-actions">
                                    <button 
                                        className="btn-approve" 
                                        onClick={() => handleApprove(log.id)}
                                    >
                                        ✓ Approve
                                    </button>
                                    <button 
                                        className="btn-reject" 
                                        onClick={() => handleReject(log.id)}
                                    >
                                        ✕ Reject
                                    </button>
                                </div>
                            )}
                            
                            {log.status === 'approved' && (
                                <span className="status-badge status-approved">APPROVED</span>
                            )}
                            {log.status === 'rejected' && (
                                <span className="status-badge status-rejected">REJECTED</span>
                            )}
                            
                            <span className={`risk-badge risk-${log.risk}`}>
                                {log.risk.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LiveActivityLog;