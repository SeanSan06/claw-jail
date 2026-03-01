"""API routes for the security rules engine."""

from __future__ import annotations
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

# Pydantic models for log entries and responses
class LogEntry(BaseModel):
    timestamp: datetime
    action: str
    risk: Literal["low", "medium", "high"]
    
class LogResponse(BaseModel):
    id: int
    timestamp: str
    action: str
    risk: str

from app.schemas.security import (
    CommandPayload,
    CustomRulesRequest,
    SecurityProfile,
    SecurityRule,
    SecurityStatus,
    SetModeRequest,
    ShimVerdict,
)
from app.services.rules_engine import engine
from app.services.shim import intercept

router = APIRouter()


# ---------------------------------------------------------------------------
# Mode management
# ---------------------------------------------------------------------------

@router.get("/status", response_model=SecurityStatus)
async def get_status():
    """Return the current security mode, active profile, and stats."""
    return SecurityStatus(
        active_mode=engine.active_mode,
        profile=engine.active_profile,
        total_blocked=engine.total_blocked,
        total_allowed=engine.total_allowed,
    )


@router.post("/mode", response_model=SecurityProfile)
async def set_mode(req: SetModeRequest):
    """Switch the active security mode (safe, flexible, aggressive, custom)."""
    return engine.set_mode(req.mode)


@router.get("/profile", response_model=SecurityProfile)
async def get_active_profile():
    """Return the full rule set for the currently active mode."""
    return engine.active_profile


# ---------------------------------------------------------------------------
# Custom rules
# ---------------------------------------------------------------------------

@router.post("/custom-rules", response_model=SecurityProfile)
async def set_custom_rules(req: CustomRulesRequest):
    """Replace all custom-mode rules with the provided list."""
    return engine.set_custom_rules(req.rules)


@router.post("/custom-rules/add", response_model=SecurityProfile)
async def add_custom_rule(rule: SecurityRule):
    """Append a single rule to the custom-mode rule set."""
    return engine.add_custom_rule(rule)


# ---------------------------------------------------------------------------
# Shim — command evaluation
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=ShimVerdict)
async def evaluate_command(payload: CommandPayload):
    """Pass a command through the Shim and return the verdict.

    This is the endpoint the Agent/Gateway calls before executing anything.
    """
    return intercept(payload)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@router.get("/audit-log", response_model=List[ShimVerdict])
async def get_audit_log():
    """Return all recorded verdicts (allowed + blocked)."""
    return engine.audit_log


@router.delete("/audit-log")
async def clear_audit_log():
    """Clear the audit log and reset counters."""
    engine.clear_audit_log()
    return {"message": "Audit log cleared."}
