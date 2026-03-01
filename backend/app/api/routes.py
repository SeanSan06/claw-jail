import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
from app.schemas.security import LogEntry, LogResponse

router = APIRouter()

# 1. LOAD THE MODEL
# We load this globally so it stays in memory (much faster).
# 'tiny' is used because it's the fastest and uses the least RAM.
model = WhisperModel("tiny", device="cpu", compute_type="int8")

# 2. THE COMMAND DICTIONARY
# This is where you "mess with it." 
# Left side = what you say. Right side = the code the system understands.

#If needed we can always update a command, when adding a new feature
COMMAND_MAP = {
    "activate safe mode": "MODE_SAFE",
    "go aggressive": "MODE_AGGRESSIVE",
    "clear the jail": "ACTION_CLEAR",
    "show me the logs": "ACTION_LOGS",
    "stop everything": "SYSTEM_HALT"
}

# 3. MOCK ACTIVITY LOGS
# These will eventually come from the rules_engine.py and shim.py
# For now, this is just test data to populate the frontend
ACTIVITY_LOGS = [
    LogEntry(id=1, timestamp="14:32:05", action="Read file: config.json", risk="low"),
    LogEntry(id=2, timestamp="14:32:08", action="Execute: npm install", risk="medium"),
    LogEntry(id=3, timestamp="14:32:12", action="Delete directory: /tmp/cache", risk="high"),
    LogEntry(id=4, timestamp="14:32:15", action="Read environment variables", risk="medium"),
    LogEntry(id=5, timestamp="14:32:18", action="Access /etc/passwd", risk="high"),
]

@router.get("/health")
async def health():
    """Check if the backend is alive."""
    return {"status": "online", "model_loaded": "tiny"}


@router.get("/logs", response_model=LogResponse)
async def get_logs():
    """
    Fetch all activity logs.
    
    This endpoint returns a list of security-related activities logged by the system.
    Each log entry contains:
    - id: Unique identifier
    - timestamp: When the action occurred (HH:MM:SS format)
    - action: Description of what happened
    - risk: Risk level (low, medium, high)
    
    TODO: Replace ACTIVITY_LOGS with real data from rules_engine.py
    """
    return LogResponse(logs=ACTIVITY_LOGS, total=len(ACTIVITY_LOGS))


@router.post("/logs/add")
async def add_log(action: str, risk: str):
    """
    Add a new log entry.
    
    Parameters:
    - action: Description of the command/action
    - risk: Risk level (must be 'low', 'medium', or 'high')
    
    This endpoint is called when a new command is executed and needs to be logged.
    The timestamp is generated automatically.
    """
    if risk not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Risk must be 'low', 'medium', or 'high'")
    
    # Generate new log entry
    new_log = LogEntry(
        id=len(ACTIVITY_LOGS) + 1,
        timestamp=datetime.now().strftime("%H:%M:%S"),
        action=action,
        risk=risk
    )
    ACTIVITY_LOGS.append(new_log)
    
    return new_log


@router.delete("/logs/clear")
async def clear_logs():
    """
    Clear all activity logs.
    Useful for testing or resetting the system state.
    """
    global ACTIVITY_LOGS
    ACTIVITY_LOGS = []
    return {"message": "All logs cleared", "total": 0}


@router.post("/logs/{log_id}/approve")
async def approve_log(log_id: int):
    """
    Approve a log entry (typically used for high-risk actions).
    
    When a user approves a high-risk action:
    - The system logs the user's approval
    - The action is allowed to proceed
    - Returns confirmation to frontend
    
    TODO: Integrate with rules_engine to allow the action
    """
    return {
        "status": "approved",
        "log_id": log_id,
        "message": f"Log {log_id} approved by user. Action will proceed."
    }


@router.post("/logs/{log_id}/reject")
async def reject_log(log_id: int):
    """
    Reject a log entry (typically used for high-risk actions).
    
    When a user rejects a high-risk action:
    - The system blocks the action
    - The rejection is logged
    - Returns confirmation to frontend
    
    TODO: Integrate with rules_engine to block the action
    """
    return {
        "status": "rejected",
        "log_id": log_id,
        "message": f"Log {log_id} rejected by user. Action has been blocked."
    }

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