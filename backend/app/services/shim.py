"""
Shim — the interceptor between the Agent and the terminal.

The Agent produces a CommandPayload (JSON).  The Shim passes it through the
RulesEngine.  If allowed, it *could* execute the command (or return an
"approved" verdict for the gateway to execute).  If blocked, it returns the
reason and logs the attempt.
"""

from __future__ import annotations

from app.schemas.security import CommandPayload, ShimVerdict
from app.services.rules_engine import engine


def intercept(payload: CommandPayload) -> ShimVerdict:
    """Primary entry-point called by the gateway / agent pipeline.

    1. Evaluate the command against the active security profile.
    2. Log the verdict (done inside engine.evaluate).
    3. Return the verdict so the caller can decide to execute or reject.
    """
    return engine.evaluate(payload)
