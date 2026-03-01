import { useState, useRef, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000';

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

    const addMessage = (text, sender) => {
        setMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            text,
            sender,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        setStatusMsg('');
    };

    const startRecording = async () => {
        setStatusMsg('');
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
            const response = await fetch(`${BACKEND_URL}/policy/voice`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Voice result:", data);

            if (data.transcript) {
                addMessage(`🎙️ "${data.transcript}"`, 'user');
                addMessage(`Policy updated. Blacklisted words: ${data.policy.word_blacklist.join(', ') || 'none'}. Blacklisted tools: ${data.policy.tool_blacklist.join(', ') || 'none'}. Threshold: ${data.policy.risk_threshold}.`, 'bot');
            } else {
                addMessage('🎙️ (no speech detected)', 'user');
                addMessage("Could not hear you. Please try again.", 'bot');
            }
        } catch (error) {
            console.error("Upload failed:", error);
            setStatusMsg("Error: Could not connect to backend.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                return;
            } else {
                e.preventDefault();
                handleSend();
            }
        }
    };

    const handleSend = async () => {
        if (input.trim()) {
            const userText = input.trim();

            setInput('');
            setStatusMsg('');
            setIsProcessing(true);

            addMessage(userText, 'user');

            try {
                const response = await fetch(`${BACKEND_URL}/policy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userText }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();
                console.log("Policy update result:", data);

                addMessage(
                    `Policy updated. Blacklisted words: ${data.policy.word_blacklist.join(', ') || 'none'}. Blacklisted tools: ${data.policy.tool_blacklist.join(', ') || 'none'}. Threshold: ${data.policy.risk_threshold}.`,
                    'bot'
                );
            } catch (error) {
                console.error("Failed to send text to backend:", error);
                addMessage("Error: Could not connect to backend.", 'bot');
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

            {/* Chat display area */}
            <div id="chat-messages-container">
                {messages.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                        Type or speak to update security policy…
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
                    placeholder="Type policy update (e.g. 'block rm-tool sudo')..."
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