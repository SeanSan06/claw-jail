import React, { useState, useRef } from 'react';

function WhisperFlow() {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Standby');
    const [transcript, setTranscript] = useState('');
    
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const startRecording = async () => {
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
            setStatus('Listening...');
        } catch (err) {
            setStatus('Error: Mic access denied');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            setStatus('Analyzing speech...');
        }
    };

    const sendToBackend = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'command.wav');

        try {
            // This matches the FastAPI route we created earlier
            const response = await fetch('http://localhost:8000/api/voice-command', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.status === 'success') {
                setStatus(`✅ EXECUTED: ${data.command}`);
                setTranscript(data.transcript);
            } else {
                setStatus(`❌ REJECTED: ${data.message}`);
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
            
            <button 
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording} // Stops if you drag mouse off button
            >
                {isRecording ? 'Release to Send' : 'Hold to Speak Command'}
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