import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    
    const textareaRef = useRef(null);
    // 1. We add two new refs to handle the microphone audio stream
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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

    // 2. This function turns on the mic and starts recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            // As audio data comes in, save it to our chunks array
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            // When recording stops, package the audio and send it to the backend
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await sendAudioToBackend(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setIsListening(false);
        }
    };

    // 3. This function stops the mic, which triggers the 'onstop' event above
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsListening(false);
        }
    };

    // 4. This sends the audio to your teammate's FastAPI backend
    const sendAudioToBackend = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            // 5. If Faster Whisper translated it, put it in the text box for the user to review!
            if (data.transcript) {
                setInput(data.transcript);
                
                // Adjust the height of the textbox to fit the new text
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
                }
            }
            
            // Note: The backend has already run the fuzzy matching here! 
            // `data.command` will hold the fuzzy-matched command if it found one.
            
        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    // 6. We update the button click handler to toggle recording
    const handleVoiceInput = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
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
                        {isListening ? '🛑 Stop Listening' : '🎙️ Voice Input'}
                    </button>

                    <button onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default WhisperFlowChat;