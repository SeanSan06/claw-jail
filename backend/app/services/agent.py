from typing import List
from app.schemas import AIResult, Item


def generate_ai_responses(prompt: str, count: int = 1) -> List[AIResult]:
    """Simulate AI-generated text responses based on a prompt.

    This is a placeholder for a real AI agent integration.
    """
    results = []
    for i in range(count):
        text = f"[clawbot] Response {i+1} for prompt: {prompt}"
        results.append(AIResult(id=i + 1, text=text, metadata={"source": "openclaw-sim"}))
    return results


def generate_fake_items(q: str, n: int = 3) -> List[Item]:
    items: List[Item] = []
    for i in range(n):
        items.append(Item(id=i + 1, name=f"{q}-item-{i+1}", description=f"Fake item generated from '{q}'"))
    return items
