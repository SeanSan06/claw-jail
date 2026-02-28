import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
from thefuzz import process, fuzz

router = APIRouter()

# 1. LOAD THE MODEL GLOBALLY
# 'tiny' is used because it's the fastest for CPU-only hackathon environments.
model = WhisperModel("tiny", device="cpu", compute_type="int8")

# 2. THE COMMAND DICTIONARY
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
    temp_filename = f"audio_{uuid.uuid4()}.wav"
    
    try:
        # Save the incoming audio blob to a temporary file
        with open(temp_filename, "wb") as f:
            f.write(await file.read())

        # 3. TRANSCRIBE (THE "EARS")
        # vad_filter=True removes silence, making it faster.
        segments, _ = model.transcribe(temp_filename, beam_size=5, vad_filter=True)
        spoken_text = " ".join([s.text for s in segments]).lower().strip()
        
        if not spoken_text:
            return {"status": "empty", "message": "No speech detected."}

        # 4. FUZZY INTERPRETATION (THE "BRAIN")
        choices = list(COMMAND_MAP.keys())
        
        # We use token_set_ratio because it handles extra words 
        # (e.g., "Yo bot, activate safe mode please") very well.
        result = process.extractOne(spoken_text, choices, scorer=fuzz.token_set_ratio)
        
        if result:
            best_match, score = result
            
            # 80 is a solid confidence threshold.
            if score >= 80:
                found_command = COMMAND_MAP[best_match]
                return {
                    "status": "success",
                    "command": found_command,
                    "transcript": spoken_text,
                    "confidence": score,
                    "message": f"Command '{best_match}' recognized."
                }

        # 5. UNCERTAIN FALLBACK
        return {
            "status": "uncertain",
            "transcript": spoken_text,
            "message": f"I heard '{spoken_text}', but that isn't a recognized command."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup: Don't leave junk audio files on your machine
        if os.path.exists(temp_filename):
            os.remove(temp_filename)