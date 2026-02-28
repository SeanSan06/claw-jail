function NavBar() {
    return (
        <div id="nav-bar">
            <h1 id="nav-bar-title">Claw Jail</h1>
            <div id="nav-bar-controls">
                <button id="refresh-btn" title="Refresh data">🔄 Refresh</button>
                <button id="settings-btn" title="Settings">⚙️ Settings</button>
                <div id="system-status">
                    <span id="status-indicator"></span>
                    <span id="status-text">System Online</span>
                </div>
            </div>
        </div>
    );
}

export default NavBar;