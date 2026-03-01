import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
from thefuzz import process, fuzz
from app.schemas.security import LogEntry, LogResponse

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
    """Check if the backend and Whisper model are ready."""
    return {"status": "online", "model": "tiny"}


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