// Users c set the mode of the bot here, and it will change the behavior of the bot.
// For example, we can have a safe, flexible, and aggressive mode. 
// Each mode will have different settings for the bot, and will change how the bot 
// behaves in certain situations. These are set modes that the user can select from, 
// and they will change the behavior of the bot accordingly.
function SecurityModeSelected() {
    return  (
        <div id="security-mode-selected-area">
            <h2>Security Mode Selected</h2>
            <div id="security-mode-safe">
                <h3>Mode: Safe</h3>
            </div>
            <div id="security-mode-flexible">
                <h3>Mode: Flexible</h3>
            </div>
            <div id="security-mode-aggressive">
                <h3>Mode: Aggressive</h3>
            </div>
            <div id="security-mode-focused">
                <h3>Mode: Focused</h3>
            </div>
            <div id="security-mode-custom">
                <h3>Mode: Custom</h3>
            </div>
        </div>
    );
}

export default SecurityModeSelected;