import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000';

function SecurityModeSelected() {
    const [threshold, setThreshold] = useState(70);
    const [blocklist, setBlocklist] = useState([]);
    const [toolBlacklist, setToolBlacklist] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial blocklist and threshold from backend
    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/policy`);
                if (!response.ok) {
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                setBlocklist(data.word_blacklist || []);
                setToolBlacklist(data.tool_blacklist || []);
                setThreshold(data.risk_threshold || 70);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch policy:', err);
                setLoading(false);
            }
        };

        fetchPolicy();

        // Poll for updates every 2 seconds
        const interval = setInterval(fetchPolicy, 2000);
        return () => clearInterval(interval);
    }, []);

    // Handle threshold change
    const handleThresholdChange = async (e) => {
        const newThreshold = parseInt(e.target.value);
        setThreshold(newThreshold);

        try {
            await fetch(`${BACKEND_URL}/policy`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word_blacklist: blocklist,
                    tool_blacklist: toolBlacklist,
                    risk_threshold: newThreshold,
                }),
            });
        } catch (err) {
            console.error('Failed to update threshold:', err);
        }
    };

    // Handle removing item from blocklist
    const handleRemoveFromBlocklist = async (item) => {
        const updatedWords = blocklist.filter((entry) => entry !== item);
        setBlocklist(updatedWords);

        try {
            const response = await fetch(`${BACKEND_URL}/policy`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word_blacklist: updatedWords,
                    tool_blacklist: toolBlacklist,
                    risk_threshold: threshold,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setBlocklist(data.word_blacklist || []);
                setToolBlacklist(data.tool_blacklist || []);
                setThreshold(data.risk_threshold || threshold);
            }
        } catch (err) {
            console.error('Failed to remove from blocklist:', err);
        }
    };

    // Determine which mode is active based on threshold ranges
    const getModeStatus = (modeRange) => {
        const [min, max] = modeRange;
        return threshold >= min && threshold <= max;
    };

    const safeMode = getModeStatus([1, 33]);
    const flexibleMode = getModeStatus([34, 67]);
    const aggressiveMode = getModeStatus([68, 100]);

    return (
        <div id="security-modes-selected-area">
            <h2>Security Mode</h2>

            {/* Safe Mode */}
            <div
                id="security-mode-safe"
                className={safeMode ? 'active' : 'inactive'}
                title="Threshold 1-33: Strict security"
            >
                <div className="mode-header">
                    <h3>🔒 Safe</h3>
                    {safeMode && <span className="active-label">Active</span>}
                </div>
            </div>

            {/* Flexible Mode */}
            <div
                id="security-mode-flexible"
                className={flexibleMode ? 'active' : 'inactive'}
                title="Threshold 34-67: Balanced security"
            >
                <div className="mode-header">
                    <h3>⚖️ Flexible</h3>
                    {flexibleMode && <span className="active-label">Active</span>}
                </div>
            </div>

            {/* Aggressive Mode */}
            <div
                id="security-mode-aggressive"
                className={aggressiveMode ? 'active' : 'inactive'}
                title="Threshold 68-100: Permissive security"
            >
                <div className="mode-header">
                    <h3>🔥 Aggressive</h3>
                    {aggressiveMode && <span className="active-label">Active</span>}
                </div>
            </div>

            {/* Risk Threshold Slider */}
            <div id="threshold-container">
                <div className="threshold-header">
                    <h3>Risk Threshold</h3>
                    <span className="threshold-value">{threshold}</span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={threshold}
                    onChange={handleThresholdChange}
                    className="threshold-slider"
                />
                <div className="threshold-labels">
                    <span>1 (Strict)</span>
                    <span>100 (Permissive)</span>
                </div>
            </div>

            {/* Block List Display */}
            <div id="blocklist-container">
                <h3>Block List</h3>
                {loading ? (
                    <p className="blocklist-empty">Loading...</p>
                ) : blocklist.length === 0 ? (
                    <p className="blocklist-empty">No blocked items yet. Add items via chat.</p>
                ) : (
                    <div className="blocklist-items">
                        {blocklist.map((item, index) => (
                            <div key={index} className="blocklist-item">
                                <span className="blocklist-text">{item}</span>
                                <button 
                                    className="blocklist-remove"
                                    onClick={() => handleRemoveFromBlocklist(item)}
                                    title="Remove from blocklist"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SecurityModeSelected;