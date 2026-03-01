"""All API routes.

Endpoints:
  GET  /              — healthcheck
  POST /commands      — bot command risk assessment
  GET  /policy        — current security policy
  POST /policy        — update policy from chat log
  POST /policy/voice  — update policy from audio
"""

import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

from app.models import ChatLogMessage, SecurityPolicy, WebhookEnvelope, ApprovalResponse
from app.risk_assessment import compute_risk, policy_store
from app.api.websocket import command_queue

router = APIRouter()

model = WhisperModel("tiny", device="cpu", compute_type="int8")


@router.get("/")
async def healthcheck():
    return {"status": "online"}


@router.post("/commands", response_model=ApprovalResponse)
async def receive_command(envelope: WebhookEnvelope):
    event = envelope.event

    # Build a representative command string for risk scoring.
    # If the event carries an 'input' dict (tool arguments), serialise it;
    # otherwise fall back to the tool name alone.
    if event.input:
        command_str = f"{event.toolName} {' '.join(str(v) for v in event.input.values())}"
    else:
        command_str = event.toolName

    # Check tool blacklist first
    if event.toolName in policy_store.policy.tool_blacklist:
        ws_payload = {
            "hook": envelope.hook,
            "tool_name": event.toolName,
            "input": event.input,
            "risk_score": 100,
            "flagged": True,
            "matched_patterns": ["tool_blacklisted"],
            "blacklist_hit": True,
        }
        await command_queue.put(ws_payload)
        return ApprovalResponse(approve=False, reason=f"Tool '{event.toolName}' is blacklisted")

    risk = compute_risk(command_str)

    ws_payload = {
        "hook": envelope.hook,
        "tool_name": event.toolName,
        "input": event.input,
        "risk_score": risk.score,
        "flagged": risk.flagged,
        "matched_patterns": risk.matched_patterns,
        "blacklist_hit": risk.blacklist_hit,
        "llm_consulted": risk.llm_consulted,
        "llm_score": risk.llm_score,
    }
    await command_queue.put(ws_payload)

    if risk.flagged:
        return ApprovalResponse(
            approve=False,
            reason=f"Risk score {risk.score} exceeds threshold ({policy_store.policy.risk_threshold})",
        )

    return ApprovalResponse(approve=True)


@router.get("/policy", response_model=SecurityPolicy)
async def get_policy():
    return policy_store.policy


@router.post("/policy", status_code=204)
async def update_policy(body: ChatLogMessage):
    policy_store.ingest_chat_log(body.message)


@router.post("/policy/voice", status_code=204)
async def update_policy_voice(file: UploadFile = File(...)):
    fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        os.write(fd, await file.read())
        os.close(fd)

        segments, _ = model.transcribe(temp_path, beam_size=5, vad_filter=False)
        spoken_text = " ".join(s.text for s in segments).strip()

        if spoken_text:
            policy_store.ingest_chat_log(spoken_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)