import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); 
    const [statusMsg, setStatusMsg] = useState(''); // NEW: Dedicated status/error message state
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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
                const audioBlob = new Blob(audioChunksRef.current);
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
                setStatusMsg(''); // Success, no error message needed
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

    const handleSend = () => {
        if (input.trim()) {
            console.log("User clicked send! Final text:", input);
            
            // ---------------------------------------------------------
            // Hey teammates! Pass the 'input' variable to the bot agent here!
            // ---------------------------------------------------------
            
            setInput('');
            setStatusMsg('');
        }
    };

    let buttonText = '🎙️ Voice Input';
    if (isProcessing) buttonText = '⏳ Processing...';
    else if (isListening) buttonText = '🛑 Stop Listening';

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>
            
            <div id="input-container" style={{ marginTop: 'auto' }}>
                <textarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type or speak your command here..."
                    rows="3"
                    disabled={isProcessing}
                />
                
                {/* NEW: Safe place to show errors without messing up the input box */}
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