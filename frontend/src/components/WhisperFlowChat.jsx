import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const textareaRef = useRef(null);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
        }
    };

    const handleSend = () => {
        if (input.trim()) {
            // Add user message
            setMessages([...messages, { text: input, sender: 'user', timestamp: new Date() }]);
            
            // Simulate bot response after a delay
            // This gets the real time date using the Date object and formats it to show only hours and minutes
            setTimeout(() => {
                setMessages(prev => [...prev, { 
                    text: 'Bot response will appear here', 
                    sender: 'bot', 
                    timestamp: new Date() 
                }]);
            }, 1000);
            
            setInput('');

            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleVoiceInput = () => {
        setIsListening(!isListening);
        // TODO: Implement Web Speech API or call backend voice service
        console.log('Voice input:', isListening ? 'stopped' : 'started');
    };

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>
            <div id="chat-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <span className="message-text">{msg.text}</span>
                        <span className="message-time">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>

            <div id="input-container">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type your command here..."
                    rows="1"
                />

                <div id="button-row">
                    <button 
                        onClick={handleVoiceInput}
                        className={isListening ? 'listening' : ''}
                    >
                        {isListening ? '🎙️ Listening...' : '🎙️ Voice Input'}
                    </button>

                    <button onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default WhisperFlowChat;