import WhisperFlow from '../components/WhisperFlow';
import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';
import SecurityModeSelected from '../components/SecurityModeSelected';

function HomePage() {
    return (
        <div id="home-page">
            {/* 1. Team's Activity Log */}
            <LiveActivityLog />

            {/* 2. Your Voice Control component */}
            <div className="voice-control-wrapper">
                <WhisperFlow />
            </div>

            {/* 3. Team's Chat Interface */}
            <WhisperFlowChat />

            {/* 4. Team's Mode Selector */}
            <SecurityModeSelected />
        </div>
    );
}

export default HomePage;