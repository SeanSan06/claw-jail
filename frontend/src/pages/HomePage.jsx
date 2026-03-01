import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';
import SecurityModeSelected from '../components/SecurityModeSelected';
import NavBar from '../components/NavBar';

function HomePage() {
    return (
        <div id="home-page">
            <NavBar />
            <div id="content-columns">
                <LiveActivityLog />
                <WhisperFlowChat />
                <SecurityModeSelected />
            </div>
        </div>
    );
}

export default HomePage;