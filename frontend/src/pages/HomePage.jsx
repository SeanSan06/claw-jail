import LiveActivityLog from '../components/LiveActivityLog';
import WhisperFlowChat from '../components/WhisperFlowChat';
import SecurityModeSelected from '../components/SecurityModeSelected';

function HomePage() {
    return (
        <div id="home-page">
            {/* Column 1 */}
            <LiveActivityLog />
            
            {/* Column 2 (Now contains WhisperFlow inside it) */}
            <WhisperFlowChat />
            
            {/* Column 3 */}
            <SecurityModeSelected />
        </div>
    );
}

export default HomePage;