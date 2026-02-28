import { useState, useRef } from 'react';
import WhisperFlow from './WhisperFlow'; // Import your logic here

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (input.trim()) {
            setMessages([...messages, { text: input, sender: 'user', timestamp: new Date() }]);
            setInput('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    };

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>
            <div id="chat-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <span className="message-text">{msg.text}</span>
                    </div>
                ))}
            </div>

            <div id="input-container">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your command here..."
                    rows="1"
                />

                <div id="button-row">
                    {/* YOUR VOICE COMPONENT IS NOW PART OF THE CHAT UI */}
                    <WhisperFlow /> 
                    <button className="send-btn" onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default WhisperFlowChat;