import { useState, useEffect, useRef } from 'react';
import '../styles/specific-components/live-activity-log.css';

const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/commands';

function LiveActivityLog() {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const [connected, setConnected] = useState(false);
    const logContainerRef = useRef(null);
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    // Connect to the backend WebSocket for real-time tool call events
    useEffect(() => {
        function connect() {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[LiveActivityLog] WebSocket connected');
                setConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Decision updates (approve/reject/timeout) for existing entries
                    if (data.type === 'decision') {
                        setLogs(prev => prev.map(log =>
                            log.request_id === data.request_id
                                ? { ...log, status: data.status, needs_approval: false }
                                : log
                        ));
                        return;
                    }

                    // New tool call event
                    const entry = {
                        request_id: data.request_id,
                        timestamp: new Date().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        }),
                        tool_name: data.tool_name,
                        input: data.input,
                        risk_score: data.risk_score,
                        flagged: data.flagged,
                        needs_approval: data.needs_approval,
                        status: data.status, // "approved", "blocked", or "pending"
                        matched_patterns: data.matched_patterns || [],
                        blacklist_hit: data.blacklist_hit,
                    };

                    setLogs(prev => [entry, ...prev.slice(0, 99)]);
                } catch (err) {
                    console.error('[LiveActivityLog] Failed to parse WS message:', err);
                }
            };

            ws.onclose = () => {
                console.log('[LiveActivityLog] WebSocket disconnected, reconnecting in 3s…');
                setConnected(false);
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('[LiveActivityLog] WebSocket error:', err);
                ws.close();
            };
        }

        connect();

        return () => {
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // Auto-scroll when new logs arrive
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Approve a flagged tool call
    const handleApprove = async (requestId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/commands/${requestId}/approve`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // Optimistic UI update
            setLogs(prev => prev.map(log =>
                log.request_id === requestId
                    ? { ...log, status: 'approved', needs_approval: false }
                    : log
            ));
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    // Reject a flagged tool call
    const handleReject = async (requestId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/commands/${requestId}/reject`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setLogs(prev => prev.map(log =>
                log.request_id === requestId
                    ? { ...log, status: 'rejected', needs_approval: false }
                    : log
            ));
        } catch (err) {
            console.error('Failed to reject:', err);
        }
    };

    const getRiskClass = (score) => {
        if (score === null || score === undefined || score === 'N/A') return 'unknown';
        if (score >= 68) return 'high';
        if (score >= 34) return 'medium';
        return 'low';
    };

    const getRiskDisplay = (score) => {
        if (score === null || score === undefined) return 'N/A';
        return score;
    };

    const getEntryClass = (log) => {
        const classes = ['log-entry'];
        if (log.status === 'approved') classes.push('approved');
        if (log.status === 'rejected' || log.status === 'blocked') classes.push('rejected');
        if (log.needs_approval) classes.push('high-risk');
        return classes.join(' ');
    };

    const formatInput = (input) => {
        if (!input) return '';
        return Object.entries(input)
            .map(([k, v]) => {
                if (v === null || v === undefined) return `${k}: (empty)`;
                if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
                return `${k}: ${v}`;
            })
            .join(', ');
    };

    const formatCommand = (input) => {
        if (!input || typeof input !== 'object') return null;
        const entries = Object.entries(input);
        if (entries.length === 0) return null;

        // Show ALL key-value pairs, serialising complex values with JSON.stringify
        return entries
            .map(([k, v]) => {
                if (v === null || v === undefined) return null;
                if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
                return `${k}: ${v}`;
            })
            .filter(Boolean)
            .join('\n');
    };

    return (
        <div id="live-activity-log">
            <h2>
                Live Activity Log
                <span className={`ws-indicator ${connected ? 'connected' : 'disconnected'}`}
                      title={connected ? 'Connected' : 'Disconnected'}>
                    {connected ? '●' : '○'}
                </span>
            </h2>
            <div id="log-entries" ref={logContainerRef}>
                {logs.length === 0 && (
                    <div className="log-empty">Waiting for tool calls…</div>
                )}
                {logs.map(log => (
                    <div key={log.request_id} className={getEntryClass(log)}>
                        <span className="log-time">{log.timestamp}</span>
                        <div className="log-action">
                            <strong>{log.tool_name}</strong>
                            {log.input && formatCommand(log.input) && (
                                <div className="log-command">{formatCommand(log.input)}</div>
                            )}
                        </div>

                        <div className="log-controls">
                            {log.needs_approval && log.status === 'pending' && (
                                <div className="log-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleApprove(log.request_id)}
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        className="btn-reject"
                                        onClick={() => handleReject(log.request_id)}
                                    >
                                        ✕ Reject
                                    </button>
                                </div>
                            )}

                            {log.status === 'approved' && (
                                <span className="status-badge status-approved">APPROVED</span>
                            )}
                            {(log.status === 'rejected' || log.status === 'timeout') && (
                                <span className="status-badge status-rejected">
                                    {log.status === 'timeout' ? 'TIMED OUT' : 'REJECTED'}
                                </span>
                            )}
                            {log.status === 'blocked' && (
                                <span className="status-badge status-rejected">BLOCKED</span>
                            )}

                            <span className={`risk-badge risk-${getRiskClass(log.risk_score)}`}>
                                {getRiskDisplay(log.risk_score)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LiveActivityLog;