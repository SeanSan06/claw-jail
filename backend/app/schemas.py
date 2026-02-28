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
