import { useState, useRef, useEffect } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); 
    const [statusMsg, setStatusMsg] = useState(''); 
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const messagesEndRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        setStatusMsg(''); // Clear any errors when user starts typing
    };

    const startRecording = async () => {
        setStatusMsg(''); // Clear previous messages
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioToBackend(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setStatusMsg('Microphone access denied or unavailable.');
            setIsListening(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsListening(false);
        }
    };

    const handleVoiceInput = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const sendAudioToBackend = async (blob) => {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', blob, 'command.webm'); 

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Backend Result:", data); 
            
            if (data.transcript) {
                setInput(data.transcript); 
                setStatusMsg(''); 
            } else if (data.status === "empty") {
                setStatusMsg("Could not hear you. Please try again.");
            }
            
        } catch (error) {
            console.error("Upload failed. Is the Python backend running?", error);
            setStatusMsg("Error: Could not connect to backend. Is uvicorn running?");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                return; // allow newline
            } else {
                e.preventDefault();
                handleSend();
            }
        }
    };

    const handleSend = async () => {
        if (input.trim()) {
            const userText = input.trim();
            
            // 1. Add user message to UI
            setMessages(prev => [...prev, { text: userText, sender: 'user', timestamp: new Date() }]);
            
            setInput('');
            setStatusMsg('');
            setIsProcessing(true);

            try {
                // 2. Do the fuzzy matching!
                const fuzzyResponse = await fetch('http://localhost:8000/api/text-command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: userText }),
                });

                const fuzzyData = await fuzzyResponse.json();
                
                if (fuzzyData.status === 'success') {
                    setStatusMsg(`Command recognized: ${fuzzyData.command} (Confidence: ${fuzzyData.confidence}%)`);
                } else {
                    setStatusMsg(`Unrecognized command: "${fuzzyData.original_text}".`);
                }

                // 3. Simple fake bot response (No more Gemini API here!)
                setTimeout(() => {
                    setMessages(prev => [...prev, { 
                        text: 'Command intercepted and sent to Shim.', 
                        sender: 'bot', 
                        timestamp: new Date() 
                    }]);
                }, 1000);
                
            } catch (error) {
                console.error("Failed to process command:", error);
                setStatusMsg("Error: Could not connect to backend.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    let buttonText = '🎙️ Voice Input';
    if (isProcessing) buttonText = '⏳ Processing...';
    else if (isListening) buttonText = '🛑 Stop Listening';

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>

            {/* ADDED THE CHAT UI BACK SO MESSAGES ACTUALLY SHOW UP */}
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
            
            {/* Chat display area */}
            <div id="chat-messages-container">
                {messages.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                        Start a conversation...
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.sender}`}>
                            <div className="message-content">{msg.text}</div>
                            <div className="message-time">{msg.timestamp}</div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div id="input-container">
                <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your command here..."
                    rows="1"
                />
                
                {statusMsg && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                        {statusMsg}
                    </div>
                )}

                <div id="button-row" style={{ marginTop: '8px' }}>
                    <button 
                        onClick={handleVoiceInput}
                        className={isListening ? 'listening' : ''}
                        disabled={isProcessing}
                    >
                        {buttonText}
                    </button>

                    <button onClick={handleSend} disabled={isProcessing}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default WhisperFlowChat;