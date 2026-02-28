import WhisperFlow from '../components/WhisperFlow';
import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';
import SecurityModeSelected from '../components/SecurityModeSelected';

function HomePage() {
    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="home-page-title">Claw Jail <span className="version">v1.0</span></h1>
                <p className="dashboard-subtitle">AI Security Protocol Manager</p>
            </div>

            <div className="dashboard-grid">
                {/* 1. Live Logs */}
                <div className="grid-item">
                    <LiveActivityLog />
                </div>
                
                {/* 2. Your Voice Control */}
                <div className="grid-item">
                    <div className="dashboard-card main-voice">
                        <h2>Voice Control</h2>
                        <WhisperFlow />
                    </div>
                </div>

                {/* 3. Chat Interface */}
                <div className="grid-item">
                    <WhisperFlowChat />
                </div>

                {/* 4. Security Modes */}
                <div className="grid-item">
                    <SecurityModeSelected />
                </div>
            </div>
        </div>
    );
}

export default HomePage;