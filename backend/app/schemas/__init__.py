"""Re-export all schemas from a single place."""

# Original schemas
from pydantic import BaseModel
from typing import Optional


class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None


class AIRequest(BaseModel):
    prompt: str
    count: int = 1


class AIResult(BaseModel):
    id: int
    text: str
    metadata: Optional[dict] = None


class AIResponse(BaseModel):
    results: list[AIResult]


# Security schemas
from .security import (  # noqa: E402, F401
    SecurityMode,
    SecurityRule,
    SecurityProfile,
    SetModeRequest,
    CustomRulesRequest,
    CommandPayload,
    ShimVerdict,
    SecurityStatus,
)
