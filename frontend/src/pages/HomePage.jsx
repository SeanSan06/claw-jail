import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';

function HomePage() {
    return  (
        <div id="home-page">
            <LiveActivityLog />
            <WhisperFlowChat />
        </div>
    );
}

export default HomePage;