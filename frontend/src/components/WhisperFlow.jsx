import { useState, useRef } from 'react';

function WhisperFlow({ onCommandRecognized }) {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Idle');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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
            setIsRecording(true);
            setStatus('Recording...');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setStatus('Mic Error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setStatus('Processing...');
        }
    };

    const sendAudioToBackend = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                setStatus(`Success: ${data.command}`);
                // This sends the command (like MODE_SAFE) back up to the parent component
                if (onCommandRecognized) onCommandRecognized(data.command, data.transcript);
            } else {
                setStatus('Not recognized');
            }
        } catch (error) {
            console.error("Upload failed:", error);
            setStatus('Server Error');
        }
    };

    return (
        <div className="whisper-flow-controls">
            <button 
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    backgroundColor: isRecording ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                {isRecording ? '🛑 Stop & Send' : '🎙️ Voice Command'}
            </button>
            <span style={{ marginLeft: '10px', color: '#9ca3af', fontSize: '14px' }}>{status}</span>
        </div>
    );
}

export default WhisperFlow;