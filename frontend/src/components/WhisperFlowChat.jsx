import { useState, useRef } from 'react';

function WhisperFlowChat() {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // 1. Handles the user typing or editing the text box
    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
        }
    };

    // 2. Turns on the mic and starts recording
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

    // 3. Stops the mic
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

    // 4. Sends audio to the backend (Faster Whisper + Fuzzy Search)
    const sendAudioToBackend = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            // 5. Put the translated text directly into the text box!
            if (data.transcript) {
                setInput(data.transcript); // This puts it in the box for the user to review
                
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 72) + 'px';
                }
            }
            
            // We can log the fuzzy match to the console just to prove to your teammates it works
            console.log("Backend Result:", data);
            
        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    // 6. When the user manually clicks "Send"
    const handleSend = () => {
        if (input.trim()) {
            console.log("User clicked send! Final text:", input);
            
            // ---------------------------------------------------------
            // Hey teammates! Pass the 'input' variable to the bot agent here!
            // ---------------------------------------------------------
            
            // Clear the input box after sending
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

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

