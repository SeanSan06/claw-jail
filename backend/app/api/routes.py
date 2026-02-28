import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

router = APIRouter()

# Smaller model 'tiny' ensures fast response times on a laptop
model = WhisperModel("tiny", device="cpu", compute_type="int8")

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Takes audio from the frontend, converts it to raw text using Whisper,
    and sends that text back immediately.
    """
    # Create a unique filename so simultaneous users don't clash
    temp_filename = f"audio_{uuid.uuid4()}.wav"
    
    try:
        # 1. Save the audio file temporarily
        with open(temp_filename, "wb") as f:
            f.write(await file.read())

        # 2. Transcribe the audio (the "Ears")
        segments, _ = model.transcribe(temp_filename, beam_size=5)
        spoken_text = " ".join([s.text for s in segments]).strip()

        # 3. Return only the transcript to the frontend
        return {"transcript": spoken_text}

    except Exception as e:
        print(f"Transcription Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")
    
    finally:
        # Always delete the temp file to save disk space
        if os.path.exists(temp_filename):
            os.remove(temp_filename)