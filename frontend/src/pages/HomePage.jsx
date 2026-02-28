import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';
import SecurityModeSelected from '../components/SecurityModeSelected';

function HomePage() {
    return  (
        <div id="home-page">
            <LiveActivityLog />
            <WhisperFlowChat />
            <SecurityModeSelected />
        </div>
    );
}

export default HomePage;