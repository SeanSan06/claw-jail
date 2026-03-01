import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
from thefuzz import process, fuzz

router = APIRouter()

# LOAD THE MODEL GLOBALLY
# 'tiny' is used because it's the fastest for CPU-only hackathon environments.
model = WhisperModel("tiny", device="cpu", compute_type="int8")

COMMAND_MAP = {
    "activate safe mode": "MODE_SAFE",
    "go aggressive": "MODE_AGGRESSIVE",
    "clear the jail": "ACTION_CLEAR",
    "show me the logs": "ACTION_LOGS",
    "stop everything": "SYSTEM_HALT"
}

@router.get("/health")
async def health():
    """Check if the backend and Whisper model are ready."""
    return {"status": "online", "model": "tiny"}

@router.post("/voice-command")
async def handle_voice_command(file: UploadFile = File(...)):
    """
    Receives audio from the React frontend, transcribes it, 
    and uses Fuzzy Logic to find the best matching command.
    """
    # FIXED: Save as .webm because that is what the React browser sends!
    temp_filename = f"audio_{uuid.uuid4()}.webm"
    
    try:
        # Save the incoming audio blob to a temporary file
        with open(temp_filename, "wb") as f:
            f.write(await file.read())

        # TRANSCRIBE
        segments, _ = model.transcribe(temp_filename, beam_size=5, vad_filter=False)
        spoken_text = " ".join([s.text for s in segments]).lower().strip()
        
        # Print to your backend terminal so you can see exactly what the AI heard
        print(f"--- WHISPER HEARD: '{spoken_text}' ---")
        
        if not spoken_text:
            return {"status": "empty", "message": "No speech detected."}

        # FUZZY INTERPRETATION
        choices = list(COMMAND_MAP.keys())
        result = process.extractOne(spoken_text, choices, scorer=fuzz.token_set_ratio)
        
        if result:
            best_match, score = result
            if score >= 80:
                found_command = COMMAND_MAP[best_match]
                return {
                    "status": "success",
                    "command": found_command,
                    "transcript": spoken_text,
                    "confidence": score,
                    "message": f"Command '{best_match}' recognized."
                }

        # UNCERTAIN FALLBACK
        return {
            "status": "uncertain",
            "transcript": spoken_text,
            "message": f"I heard '{spoken_text}', but that isn't a recognized command."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)