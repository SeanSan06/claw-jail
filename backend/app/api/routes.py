"""All API routes.

Endpoints:
  GET  /                              — healthcheck
  POST /commands                      — bot command risk assessment (plugin webhook)
  POST /commands/{request_id}/approve — frontend approves a flagged tool call
  POST /commands/{request_id}/reject  — frontend rejects a flagged tool call
  GET  /policy                        — current security policy
  POST /policy                        — update policy from chat log text
  PUT  /policy                        — replace entire security policy
  POST /policy/voice                  — update policy from audio
"""

import asyncio
import os
import tempfile
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

from app.models import ChatLogMessage, SecurityPolicy, WebhookEnvelope, ApprovalResponse
from app.risk_assessment import compute_risk, policy_store
from app.api.websocket import command_queue

router = APIRouter()

model = WhisperModel("tiny", device="cpu", compute_type="int8")

# Pending approval futures: request_id → asyncio.Future
pending_approvals: dict[str, asyncio.Future] = {}

APPROVAL_TIMEOUT_S = 120  # seconds to wait for user approval before auto-rejecting


@router.get("/")
async def healthcheck():
    return {"status": "online"}


@router.post("/commands", response_model=ApprovalResponse)
async def receive_command(envelope: WebhookEnvelope):
    event = envelope.event
    request_id = str(uuid.uuid4())

    # Build a representative command string for risk scoring.
    if event.input:
        command_str = f"{event.toolName} {' '.join(str(v) for v in event.input.values())}"
    else:
        command_str = event.toolName

    # --- Blacklisted tool: block immediately, notify frontend ---
    if event.toolName in policy_store.policy.tool_blacklist:
        ws_payload = {
            "request_id": request_id,
            "hook": envelope.hook,
            "tool_name": event.toolName,
            "input": event.input,
            "risk_score": 100,
            "flagged": True,
            "needs_approval": False,
            "status": "blocked",
            "matched_patterns": ["tool_blacklisted"],
            "blacklist_hit": True,
        }
        await command_queue.put(ws_payload)
        return ApprovalResponse(approve=False, reason=f"Tool '{event.toolName}' is blacklisted")

    # --- Compute risk score ---
    risk = compute_risk(command_str)

    ws_payload = {
        "request_id": request_id,
        "hook": envelope.hook,
        "tool_name": event.toolName,
        "input": event.input,
        "risk_score": risk.score,
        "flagged": risk.flagged,
        "needs_approval": risk.flagged,
        "status": "pending" if risk.flagged else "approved",
        "matched_patterns": risk.matched_patterns,
        "blacklist_hit": risk.blacklist_hit,
        "llm_consulted": risk.llm_consulted,
        "llm_score": risk.llm_score,
    }
    await command_queue.put(ws_payload)

    # --- Not flagged: approve immediately ---
    if not risk.flagged:
        return ApprovalResponse(approve=True)

    # --- Flagged: hold open and wait for frontend approval ---
    loop = asyncio.get_event_loop()
    future: asyncio.Future = loop.create_future()
    pending_approvals[request_id] = future

    try:
        result = await asyncio.wait_for(future, timeout=APPROVAL_TIMEOUT_S)
        approved = result.get("approved", False)

        # Broadcast the decision to all connected frontends
        decision_payload = {
            "request_id": request_id,
            "type": "decision",
            "status": "approved" if approved else "rejected",
        }
        await command_queue.put(decision_payload)

        if approved:
            return ApprovalResponse(approve=True)
        return ApprovalResponse(approve=False, reason=result.get("reason", "Rejected by user"))
    except asyncio.TimeoutError:
        # Broadcast timeout to frontend
        timeout_payload = {
            "request_id": request_id,
            "type": "decision",
            "status": "timeout",
        }
        await command_queue.put(timeout_payload)
        return ApprovalResponse(approve=False, reason=f"Approval timed out after {APPROVAL_TIMEOUT_S}s")
    finally:
        pending_approvals.pop(request_id, None)


@router.post("/commands/{request_id}/approve")
async def approve_command(request_id: str):
    future = pending_approvals.get(request_id)
    if not future or future.done():
        raise HTTPException(status_code=404, detail="No pending approval found for this request")
    future.set_result({"approved": True})
    return {"status": "approved", "request_id": request_id}


@router.post("/commands/{request_id}/reject")
async def reject_command(request_id: str):
    future = pending_approvals.get(request_id)
    if not future or future.done():
        raise HTTPException(status_code=404, detail="No pending approval found for this request")
    future.set_result({"approved": False, "reason": "Rejected by user"})
    return {"status": "rejected", "request_id": request_id}


@router.get("/policy", response_model=SecurityPolicy)
async def get_policy():
    return policy_store.policy


@router.put("/policy")
async def replace_policy(body: SecurityPolicy):
    """Replace the entire security policy (used by security mode selector)."""
    policy_store.set_policy(body)
    return policy_store.policy


@router.post("/policy")
async def update_policy(body: ChatLogMessage):
    """Parse free-form text and update blacklists."""
    policy_store.ingest_chat_log(body.message)
    return {"message": "Policy updated", "policy": policy_store.policy.model_dump()}


@router.post("/policy/voice")
async def update_policy_voice(file: UploadFile = File(...)):
    fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        os.write(fd, await file.read())
        os.close(fd)

        segments, _ = model.transcribe(temp_path, beam_size=5, vad_filter=False)
        spoken_text = " ".join(s.text for s in segments).strip()

        if spoken_text:
            policy_store.ingest_chat_log(spoken_text)

        return {
            "transcript": spoken_text or "",
            "policy": policy_store.policy.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
