import WhisperFlow from '../components/WhisperFlow';

function HomePage() {
    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="home-page-title">Claw Jail <span className="version">v1.0</span></h1>
                <p className="dashboard-subtitle">AI Security Protocol Manager</p>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card main-voice">
                    <h2>Voice Control</h2>
                    <WhisperFlow />
                </div>
            </div>
        </div>
    );
}

export default HomePage;