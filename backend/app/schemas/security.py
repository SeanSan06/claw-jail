"""Schemas for the security rules engine."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Security modes
# ---------------------------------------------------------------------------

class SecurityMode(str, Enum):
    SAFE = "safe"
    FLEXIBLE = "flexible"
    AGGRESSIVE = "aggressive"
    CUSTOM = "custom"


# ---------------------------------------------------------------------------
# Rule definitions
# ---------------------------------------------------------------------------

class SecurityRule(BaseModel):
    """A single security rule that can allow or deny a pattern."""
    id: Optional[int] = None
    name: str = Field(..., description="Human-readable rule name")
    description: Optional[str] = None
    # Regex pattern matched against the raw command string
    pattern: str = Field(..., description="Regex pattern to match against commands")
    # True = block matching commands, False = allow (whitelist entry)
    block: bool = True
    # Optional list of protected paths (used by path-aware rules)
    protected_paths: list[str] = Field(default_factory=list)


class SecurityProfile(BaseModel):
    """A complete security profile (set of rules) for a given mode."""
    mode: SecurityMode
    rules: list[SecurityRule] = Field(default_factory=list)
    allow_network: bool = True
    allow_install: bool = True
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SetModeRequest(BaseModel):
    mode: SecurityMode


class CustomRulesRequest(BaseModel):
    rules: list[SecurityRule]


class CommandPayload(BaseModel):
    """JSON payload the Agent sends to the Shim for evaluation."""
    command: str = Field(..., description="The shell command to evaluate")
    working_dir: Optional[str] = None
    env: Optional[dict[str, str]] = None
    metadata: Optional[dict] = None


class ShimVerdict(BaseModel):
    """Result returned by the Shim after evaluating a command."""
    allowed: bool
    command: str
    mode: SecurityMode
    matched_rule: Optional[str] = None
    reason: Optional[str] = None
    confidence_score: int = Field(default=5, ge=1, le=10, description="Risk score 1-10; 1=safe, 10=dangerous")
    assessment_source: str = Field(default="heuristic", description="Source of assessment: 'heuristic' or 'distilled_ai'")


class SecurityStatus(BaseModel):
    """Current state of the rules engine."""
    active_mode: SecurityMode
    profile: SecurityProfile
    total_blocked: int = 0
    total_allowed: int = 0

# ---------------------------------------------------------------------------
# Activity Log Models
# ---------------------------------------------------------------------------

class LogEntry(BaseModel):
    """A single log entry for activity tracking."""
    id: int
    timestamp: str = Field(..., description="Timestamp in HH:MM:SS format")
    action: str = Field(..., description="The command or action performed")
    risk: str = Field(..., description="Risk level: low, medium, or high")


class LogResponse(BaseModel):
    """Response containing a list of log entries."""
    logs: list[LogEntry]
    total: int