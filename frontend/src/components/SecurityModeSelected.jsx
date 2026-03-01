import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000';

// Preset security policies for each mode
const MODE_POLICIES = {
    safe: {
        word_blacklist: ['rm', 'delete', 'remove', 'destroy', 'kill', 'shutdown', 'reboot', 'format'],
        tool_blacklist: ['rm', 'rmdir', 'dd', 'mkfs', 'shred', 'kill', 'shutdown', 'reboot'],
        risk_threshold: 30,
    },
    flexible: {
        word_blacklist: [],
        tool_blacklist: [],
        risk_threshold: 70,
    },
    aggressive: {
        word_blacklist: [],
        tool_blacklist: [],
        risk_threshold: 95,
    },
};

function SecurityModeSelected() {
    const [activeMode, setActiveMode] = useState('flexible');
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch current policy on mount
    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/policy`);
                if (res.ok) {
                    const data = await res.json();
                    setPolicy(data);
                    // Determine which mode matches the current policy
                    const matched = detectMode(data);
                    setActiveMode(matched);
                }
            } catch (err) {
                console.error('Failed to fetch policy:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    // Detect which preset mode matches the current policy (or 'custom')
    const detectMode = (p) => {
        for (const [mode, preset] of Object.entries(MODE_POLICIES)) {
            if (p.risk_threshold === preset.risk_threshold) {
                return mode;
            }
        }
        return 'custom';
    };

    // Apply a preset mode
    const applyMode = async (mode) => {
        if (mode === 'custom' || !MODE_POLICIES[mode]) return;

        const newPolicy = MODE_POLICIES[mode];
        try {
            const res = await fetch(`${BACKEND_URL}/policy`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPolicy),
            });
            if (res.ok) {
                const data = await res.json();
                setPolicy(data);
                setActiveMode(mode);
            }
        } catch (err) {
            console.error('Failed to update policy:', err);
        }
    };

    return (
        <div id="security-modes-selected-area">
            <h2>Security Mode</h2>

            <div
                id="security-mode-safe"
                className={activeMode === 'safe' ? 'active' : 'inactive'}
                title="Safe mode: low threshold (30), dangerous tools blacklisted."
                onClick={() => applyMode('safe')}
                style={{ cursor: 'pointer' }}
            >
                <div className="mode-header">
                    <h3>🔒 Mode: Safe</h3>
                    {activeMode === 'safe' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Threshold 30 — blocks destructive tools (rm, dd, kill, …)</p>
            </div>

            <div
                id="security-mode-flexible"
                className={activeMode === 'flexible' ? 'active' : 'inactive'}
                title="Flexible mode: default threshold (70), no preset blacklists."
                onClick={() => applyMode('flexible')}
                style={{ cursor: 'pointer' }}
            >
                <div className="mode-header">
                    <h3>⚖️ Mode: Flexible</h3>
                    {activeMode === 'flexible' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Threshold 70 — balanced, flags high-risk commands</p>
            </div>

            <div
                id="security-mode-aggressive"
                className={activeMode === 'aggressive' ? 'active' : 'inactive'}
                title="Aggressive mode: high threshold (95), almost nothing blocked."
                onClick={() => applyMode('aggressive')}
                style={{ cursor: 'pointer' }}
            >
                <div className="mode-header">
                    <h3>🔥 Mode: Aggressive</h3>
                    {activeMode === 'aggressive' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Threshold 95 — permits almost everything</p>
            </div>

            <div
                id="security-mode-custom"
                className={activeMode === 'custom' ? 'active' : 'inactive'}
                title="Custom mode: policy set via Whisper Flow Chat."
            >
                <div className="mode-header">
                    <h3>⚙️ Mode: Custom</h3>
                    {activeMode === 'custom' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Defined via Whisper Flow Chat commands</p>
            </div>

            {policy && (
                <div id="current-policy-summary" style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
                    <strong>Current policy:</strong> threshold {policy.risk_threshold},
                    {' '}{policy.tool_blacklist.length} tools blacklisted,
                    {' '}{policy.word_blacklist.length} words blacklisted
                </div>
            )}
        </div>
    );
}

export default SecurityModeSelected;