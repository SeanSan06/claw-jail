import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
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
            console.log('Sending:', input);
            setInput('');

            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleVoiceInput = () => {
        setIsListening(!isListening);
        // TODO: Implement Web Speech API or call backend voice service
        // We need to use Whisperflow or fastflow here
        console.log('Voice input:', isListening ? 'stopped' : 'started');
    };

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>
            <div id="chat-container">
                {/* Chat messages will display here as they are sent by user */}
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