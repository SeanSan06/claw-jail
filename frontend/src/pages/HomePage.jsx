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

            <div id="home-page">
                {/* The Team's new components */}
                <LiveActivityLog />
                
                {/* Your Voice Control */}
                <div className="dashboard-card main-voice">
                    <h2>Voice Control</h2>
                    <WhisperFlow />
                </div>

                <WhisperFlowChat />
                <SecurityModeSelected />
            </div>
        </div>
    );
}

export default HomePage;