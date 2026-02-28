import { useEffect, useState, useRef } from "react";

function NavBar() {
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const [theme, setTheme] = useState("dark");
    const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
    const themeBtnRef = useRef(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem("claw-jail-theme") || "dark";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
    }, []);

    const handleThemeButtonClick = () => {
        if (themeBtnRef.current) {
            const rect = themeBtnRef.current.getBoundingClientRect();
            setModalPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right
            });
        }
        setIsThemeModalOpen(true);
    };

    const handleThemeChange = (nextTheme) => {
        setTheme(nextTheme);
        localStorage.setItem("claw-jail-theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        setIsThemeModalOpen(false);
    };

    return (
        <>
            <div id="nav-bar">
                <h1 id="nav-bar-title">Claw Jail</h1>
                <div id="nav-bar-controls">
                    <button id="refresh-btn" title="Refresh data">🔄 Refresh</button>
                    <button id="settings-btn" title="Settings">⚙️ Settings</button>
                    <button
                        ref={themeBtnRef}
                        id="theme-btn"
                        title="Theme"
                        onClick={handleThemeButtonClick}
                    >
                        🎨 Theme
                    </button>
                    <div id="system-status">
                        <span id="status-indicator"></span>
                        <span id="status-text">System Online</span>
                    </div>
                </div>
            </div>

            {isThemeModalOpen && (
                <div
                    className="theme-modal-overlay"
                    onClick={() => setIsThemeModalOpen(false)}
                >
                    <div
                        className="theme-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Select theme"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: `${modalPosition.top}px`,
                            right: `${modalPosition.right}px`
                        }}
                    >
                        <h3>Select Theme</h3>
                        <div className="theme-options">
                            <button
                                className={`theme-option ${theme === "light" ? "active" : ""}`}
                                onClick={() => handleThemeChange("light")}
                            >
                                Light
                            </button>
                            <button
                                className={`theme-option ${theme === "cream" ? "active" : ""}`}
                                onClick={() => handleThemeChange("cream")}
                            >
                                Cream
                            </button>
                            <button
                                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                                onClick={() => handleThemeChange("dark")}
                            >
                                Dark
                            </button>
                        </div>
                        <button
                            className="theme-close-btn"
                            onClick={() => setIsThemeModalOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default NavBar;