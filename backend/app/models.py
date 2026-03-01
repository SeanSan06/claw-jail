"""Pydantic models for the security policy and risk scoring."""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class SecurityPolicy(BaseModel):
    word_blacklist: list[str] = Field(default_factory=list)
    tool_blacklist: list[str] = Field(default_factory=list)
    risk_threshold: int = Field(default=70, ge=1, le=100)


class ChatLogMessage(BaseModel):
    message: str = Field(..., description="Free-form text from which words are extracted")


class RiskResult(BaseModel):
    score: int = Field(..., ge=0, le=100)
    flagged: bool = False
    matched_patterns: list[str] = Field(default_factory=list)
    blacklist_hit: bool = False
    llm_consulted: bool = False
    llm_score: int | None = None


# --- OpenClaw webhook envelope models ---

class ToolCallEvent(BaseModel):
    """The 'event' payload inside a before_tool_call envelope.

    OpenClaw SDK sends `params`; the plugin normalises it to `input`,
    but we accept both field names as a safety net.
    """
    toolName: str
    input: dict | None = None

    class Config:
        extra = "allow"  # pass through any extra fields from OpenClaw

    @model_validator(mode="before")
    @classmethod
    def _normalise_params(cls, data):
        """Accept ``params`` as an alias for ``input``."""
        if isinstance(data, dict):
            if "params" in data and "input" not in data:
                data["input"] = data.pop("params")
        return data


class WebhookEnvelope(BaseModel):
    """Top-level envelope sent by the OpenClaw plugin."""
    hook: str
    timestamp: str
    event: ToolCallEvent


class ApprovalResponse(BaseModel):
    """Response the plugin expects back."""
    approve: bool
    reason: str | None = None
