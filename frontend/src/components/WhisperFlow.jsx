import React, { useState, useRef } from 'react';

function WhisperFlow() {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Standby');
    const [transcript, setTranscript] = useState('');
    
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    // We combine the start and stop into one toggle function
    const toggleRecording = async () => {
        if (!isRecording) {
            // START RECORDING LOGIC
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder.current = new MediaRecorder(stream);
                audioChunks.current = [];

                mediaRecorder.current.ondataavailable = (event) => {
                    audioChunks.current.push(event.data);
                };

                mediaRecorder.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                    sendToBackend(audioBlob);
                };

                mediaRecorder.current.start();
                setIsRecording(true);
                setStatus('Recording... Click again to stop');
            } catch (err) {
                setStatus('Error: Mic access denied');
                console.error(err);
            }
        } else {
            // STOP RECORDING LOGIC
            if (mediaRecorder.current) {
                mediaRecorder.current.stop();
                setIsRecording(false);
                setStatus('Analyzing speech...');
            }
        }
    };

    const sendToBackend = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.status === 'success') {
                setStatus(`✅ EXECUTED: ${data.command}`);
                setTranscript(data.transcript);
            } else {
                setStatus(`❌ REJECTED: ${data.message || 'Invalid Command'}`);
                setTranscript(data.transcript);
            }
        } catch (error) {
            setStatus('❌ Connection Error. Is Backend running?');
        }
    };

    return (
        <div className="whisper-flow-card">
            <div className={`voice-status-indicator ${isRecording ? 'pulse' : ''}`}>
                {status}
            </div>
            
            {/* Now using a single onClick instead of mouse events */}
            <button 
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
            >
                {isRecording ? '🛑 Stop Recording' : '🎙️ Click to Speak'}
            </button>

            {transcript && (
                <p className="transcript-text">
                    "<em>{transcript}</em>"
                </p>
            )}
        </div>
    );
}

export default WhisperFlow;