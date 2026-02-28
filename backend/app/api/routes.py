import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

router = APIRouter()

# 1. LOAD THE MODEL
# We load this globally so it stays in memory (much faster).
# 'tiny' is used because it's the fastest and uses the least RAM.
model = WhisperModel("tiny", device="cpu", compute_type="int8")

# 2. THE COMMAND DICTIONARY
# This is where you "mess with it." 
# Left side = what you say. Right side = the code the system understands.
COMMAND_MAP = {
    "activate safe mode": "MODE_SAFE",
    "go aggressive": "MODE_AGGRESSIVE",
    "clear the jail": "ACTION_CLEAR",
    "show me the logs": "ACTION_LOGS",
    "stop everything": "SYSTEM_HALT"
}

@router.get("/health")
async def health():
    """Check if the backend is alive."""
    return {"status": "online", "model_loaded": "tiny"}

@router.post("/voice-command")
async def handle_voice_command(file: UploadFile = File(...)):
    """
    This endpoint receives audio from React, transcribes it, 
    and matches it to a security command.
    """
    # 3. SAVE AUDIO TEMPORARILY
    # We give it a unique name so multiple teammates can test at once.
    temp_filename = f"audio_{uuid.uuid4()}.wav"
    
    try:
        with open(temp_filename, "wb") as f:
            f.write(await file.read())

        # 4. TRANSCRIBE (THE "EARS")
        # We look for the first 5 seconds of audio for speed.
        segments, _ = model.transcribe(temp_filename, beam_size=5)
        spoken_text = " ".join([s.text for s in segments]).lower().strip()
        
        # 5. INTERPRET (THE "BRAIN")
        found_command = None
        for phrase, command_id in COMMAND_MAP.items():
            # This 'in' check allows for natural speech like: 
            # "Hey bot, please activate safe mode"
            if phrase in spoken_text:
                found_command = command_id
                break

        # 6. RETURN THE RESULT
        if found_command:
            return {
                "status": "success",
                "command": found_command,
                "transcript": spoken_text,
                "message": f"Command '{found_command}' recognized."
            }
        else:
            return {
                "status": "invalid",
                "transcript": spoken_text,
                "message": f"I heard '{spoken_text}', but that command isn't in my database."
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Always clean up the temporary file so we don't fill up the computer
        if os.path.exists(temp_filename):
            os.remove(temp_filename)