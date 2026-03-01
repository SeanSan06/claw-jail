"""Local distilled AI assessor via Ollama.

Phase 2 (Part 1): provide a lightweight local model call that returns
structured risk assessment for commands.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib import error, request

from app.core.config import settings


def _safe_int_score(value: Any, default: int = 5) -> int:
    """Normalize score to int in [1, 10]."""
    try:
        score = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(10, score))


def _extract_json_object(text: str) -> dict[str, Any] | None:
    """Extract first JSON object from free-form text."""
    text = text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None

    candidate = match.group(0)
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None

    return None


def assess_with_ollama(command: str) -> dict[str, Any]:
    """Assess command risk with a locally running distilled model.

    Returns dict with:
      - score: int 1..10
      - reason: str
      - assessment_source: "distilled_ai"
      - error: optional error details
    """
    prompt = (
        "You are a command security assessor. "
        "Rate shell command risk from 1 (safe) to 10 (dangerous). "
        "Return ONLY valid JSON with keys: score (int), reason (string).\n\n"
        f"Command: {command}"
    )

    body = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0},
    }

    data = json.dumps(body).encode("utf-8")
    req = request.Request(
        url=f"{settings.ollama_url.rstrip('/')}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    timeout_seconds = max(0.1, settings.ollama_timeout_ms / 1000.0)

    try:
        with request.urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
    except error.URLError as exc:
        return {
            "score": 5,
            "reason": "Distilled assessor unavailable; fallback to medium risk.",
            "assessment_source": "distilled_ai",
            "error": str(exc),
        }

    try:
        outer = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "score": 5,
            "reason": "Invalid response from distilled assessor; fallback to medium risk.",
            "assessment_source": "distilled_ai",
            "error": "invalid_outer_json",
        }

    model_response = outer.get("response", "")
    parsed = _extract_json_object(model_response)
    if not parsed:
        return {
            "score": 5,
            "reason": "Could not parse distilled assessor JSON; fallback to medium risk.",
            "assessment_source": "distilled_ai",
            "error": "invalid_inner_json",
        }

    score = _safe_int_score(parsed.get("score"), default=5)
    reason = str(parsed.get("reason") or "No reason provided by distilled assessor.")

    return {
        "score": score,
        "reason": reason,
        "assessment_source": "distilled_ai",
    }
