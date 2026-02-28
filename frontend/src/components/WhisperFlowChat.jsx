import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    // NEW: We added a processing state so you know when the AI is thinking!
    const [isProcessing, setIsProcessing] = useState(false); 
    
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

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
        setIsProcessing(true); // Tell the UI we are thinking...
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            console.log("Backend Result:", data); // Check your browser console to see this!
            
            // Put the translated text directly into the text box
            if (data.transcript) {
                setInput(data.transcript); 
                
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
                }
            } else if (data.status === "empty") {
                // If the room was too noisy and it couldn't hear you
                setInput("Could not hear you over the noise. Please try again.");
            }
            
        } catch (error) {
            console.error("Upload failed. Is the Python backend running?", error);
            setInput("Error connecting to backend.");
        } finally {
            setIsProcessing(false); // Done thinking!
        }
    };

    const handleSend = () => {
        if (input.trim()) {
            console.log("User clicked send! Final text:", input);
            
            // ---------------------------------------------------------
            // Hey teammates! Pass the 'input' variable to the bot agent here!
            // ---------------------------------------------------------
            
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    // Determine what the button should say
    let buttonText = '🎙️ Voice Input';
    if (isProcessing) buttonText = '⏳ Processing...';
    else if (isListening) buttonText = '🛑 Stop Listening';

    return (
        <div id="whisper-flow-chat-area">
            <h2>Whisper Flow Chat</h2>
            
            <div id="input-container" style={{ marginTop: 'auto' }}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type or speak your command here..."
                    rows="1"
                    disabled={isProcessing} // Disable typing while processing
                />

                <div id="button-row">
                    <button 
                        onClick={handleVoiceInput}
                        className={isListening ? 'listening' : ''}
                        disabled={isProcessing} // Disable mic button while processing
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