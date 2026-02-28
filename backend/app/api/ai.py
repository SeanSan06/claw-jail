from fastapi import APIRouter
from typing import List
from app.schemas import AIRequest, AIResponse, Item
from app.services.agent import generate_ai_responses, generate_fake_items

router = APIRouter()


@router.post("/generate", response_model=AIResponse)
async def generate(request: AIRequest):
    """Generate AI responses (simulated)."""
    results = generate_ai_responses(request.prompt, request.count)
    return {"results": results}


@router.get("/fake-items", response_model=List[Item])
async def fake_items(q: str = "demo", n: int = 3):
    """Return a small list of fake items derived from query q."""
    return generate_fake_items(q, n)
