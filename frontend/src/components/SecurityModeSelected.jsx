// Users c set the mode of the bot here, and it will change the behavior of the bot.
// For example, we can have a safe, flexible, and aggressive mode. 
// Each mode will have different settings for the bot, and will change how the bot 
// behaves in certain situations. These are set modes that the user can select from, 
// and they will change the behavior of the bot accordingly.
function SecurityModeSelected() {
    const activeMode = 'safe';

    return  (
        <div id="security-modes-selected-area">
            <h2>Security Mode Selected</h2>

            <div 
                id="security-mode-safe" 
                className={activeMode === 'safe' ? 'active' : 'inactive'}
                title="Safe mode prevents the bot from deleting any files or folders. Recommended for maximum security."
            >
                <div className="mode-header">
                    <h3>🔒 Mode: Safe</h3>
                    {activeMode === 'safe' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Bot cant delete folders or files</p>
            </div>

            <div 
                id="security-mode-flexible" 
                className={activeMode === 'flexible' ? 'active' : 'inactive'}
                title="Flexible mode allows deletion of folders and files except ones found under the home folder. 
                Recommend for balanced security."
            >
                <div className="mode-header">
                    <h3>⚖️ Mode: Flexible</h3>
                    {activeMode === 'flexible' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Bot can delete folders or files except home folder</p>
            </div>

            <div 
                id="security-mode-aggressive" 
                className={activeMode === 'aggressive' ? 'active' : 'inactive'}
                title="Aggressive mode allows full file system access & deletion of all folders and files. 
                Strong recommend to be used with caution!"
            >
                <div className="mode-header">
                    <h3>🔥 Mode: Aggressive</h3>
                    {activeMode === 'aggressive' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>Bot can delete all folders or files</p>
            </div>

            <div 
                id="security-mode-custom" 
                className={activeMode === 'custom' ? 'active' : 'inactive'}
                title="Custom mode lets you define specific rules and file access permissions. 
                Recommended for advanced users who want granular control over bot's file system interactions."
            >
                <div className="mode-header">
                    <h3>⚙️ Mode: Custom</h3>
                    {activeMode === 'custom' ? (
                        <span className="active-label">Active</span>
                    ) : (
                        <span className="inactive-label">Inactive</span>
                    )}
                </div>
                <p>You choose which files to allow the bot to access</p>
            </div>
        </div>
    );
}

export default SecurityModeSelected;