"""
Rules Engine — manages security profiles and evaluates commands.

Each SecurityMode maps to a pre-built SecurityProfile.  The user can also
supply custom rules via the API.
"""

from __future__ import annotations

import re
from copy import deepcopy
from typing import Dict, Literal
from enum import Enum

from app.schemas.security import (
    CommandPayload,
    SecurityMode,
    SecurityProfile,
    SecurityRule,
    ShimVerdict,
)
from app.services.ollama_assessor import assess_with_ollama
from app.core.config import settings


# ---------------------------------------------------------------------------
# Routing directives for Three-Lane Hybrid
# ---------------------------------------------------------------------------

class EvaluationDirective(str, Enum):
    """Directive returned by the evaluation router."""
    EXECUTE = "EXECUTE"  # Lane 1: Safe path, skip AI
    PAUSE_FOR_HUMAN = "PAUSE_FOR_HUMAN"  # Lane 3: High risk, require override
    CONSULT_AI = "CONSULT_AI"  # Lane 2: Grey area, call distilled assessor


# ---------------------------------------------------------------------------
# Heuristic scoring rules (Phase 1: Fast-path)
# ---------------------------------------------------------------------------

_SAFE_COMMANDS_PATTERN = r"^\s*(pwd|ls|whoami|echo|cat|grep|find|head|tail|wc)\s*($|\s|\|)"  # Low-risk read-only
_MEDIUM_RISK_PATTERN = r"\b(git|npm|pip|curl|wget)\b"  # Common but potentially risky
_HIGH_RISK_PATTERN = r"\b(rm|rmdir|dd|mkfs|chmod|chown|sudo|passwd)\b"  # Dangerous system commands


def _compute_heuristic_score(command: str) -> int:
    """
    Compute a confidence score (1-10) for a command based on heuristic patterns.
    1 = safe (low risk), 10 = dangerous (high risk).
    """
    cmd = command.strip()

    # Safest: simple read-only commands
    if re.match(_SAFE_COMMANDS_PATTERN, cmd, re.IGNORECASE):
        return 1

    # High risk: dangerous system commands
    if re.search(_HIGH_RISK_PATTERN, cmd, re.IGNORECASE):
        return 9

    # Medium risk: common tools that can be risky
    if re.search(_MEDIUM_RISK_PATTERN, cmd, re.IGNORECASE):
        return 5

    # Default: unknown commands get medium score
    return 5


def _route_evaluation(heuristic_score: int) -> EvaluationDirective:
    """
    Three-Lane Hybrid Routing based on heuristic score.
    
    Lane 1 (Fast-Path Allow): score == 1 → EXECUTE immediately
    Lane 3 (Fast-Path Block): score >= 8 → PAUSE_FOR_HUMAN (fail-closed)
    Lane 2 (Grey Area): 2 <= score <= 7 → CONSULT_AI (if enabled)
    
    Returns the directive to route the evaluation.
    """
    if heuristic_score == 1:
        return EvaluationDirective.EXECUTE
    elif heuristic_score >= 8:
        return EvaluationDirective.PAUSE_FOR_HUMAN
    else:
        return EvaluationDirective.CONSULT_AI


def _evaluate_command_with_directive(
    command: str,
    heuristic_score: int,
    directive: EvaluationDirective,
) -> tuple[int, str, str]:
    """
    Execute the evaluation directive and return:
    (final_confidence_score, assessment_source, reason)
    
    Args:
        command: The shell command being evaluated
        heuristic_score: Initial heuristic score (1-10)
        directive: Routing directive (EXECUTE, PAUSE_FOR_HUMAN, CONSULT_AI)
    
    Returns:
        Tuple of (confidence_score, assessment_source, reason)
    """
    
    # Lane 1: Fast-Path Allow
    if directive == EvaluationDirective.EXECUTE:
        return (
            1,
            "heuristic",
            "Command matches safe pattern. Executing immediately."
        )
    
    # Lane 3: Fast-Path Block (Fail-Closed)
    elif directive == EvaluationDirective.PAUSE_FOR_HUMAN:
        return (
            9,
            "heuristic",
            "High-risk command detected. Pausing for human review."
        )
    
    # Lane 2: Grey Area - Consult AI (if enabled)
    elif directive == EvaluationDirective.CONSULT_AI:
        if not settings.use_distilled_assessor:
            # AI assessor disabled; use heuristic score as-is
            return (
                heuristic_score,
                "heuristic",
                f"Distilled assessor disabled. Using heuristic score: {heuristic_score}"
            )
        
        # Call the distilled assessor with Fail-Closed error handling
        try:
            assessor_result = assess_with_ollama(command)
            
            # Extract score from response (with bounds checking)
            ai_score = assessor_result.get("score", heuristic_score)
            try:
                ai_score = int(ai_score)
                ai_score = max(1, min(10, ai_score))  # Clamp to [1, 10]
            except (TypeError, ValueError):
                # Malformed score; use heuristic as fallback
                ai_score = heuristic_score
            
            reason = assessor_result.get("reason", "AI assessment completed.")
            assessment_source = assessor_result.get("assessment_source", "distilled_ai")
            
            return (ai_score, assessment_source, reason)
        
        except Exception as exc:
            # Fail-Closed: Any error in the AI assessor → HIGH RISK (score 9)
            # This ensures we don't accidentally allow risky commands due to timeouts
            return (
                9,
                "distilled_ai",
                f"Distilled assessor error (fail-closed): {type(exc).__name__}. "
                f"Treating as high-risk and pausing for human review."
            )
    
    # Fallback (should not reach here)
    return (heuristic_score, "heuristic", "Unknown directive; using heuristic score.")


# ---------------------------------------------------------------------------
# Default rule sets per mode
# ---------------------------------------------------------------------------

_DANGEROUS_CMD_PATTERN = r"\b(rm|rmdir|del|deltree|shred|mkfs|dd|format)\b"
_NETWORK_PATTERN = r"\b(curl|wget|nc|ncat|ssh|scp|rsync|ftp|telnet)\b"
_INSTALL_PATTERN = r"\b(pip install|npm install|apt install|apt-get install|brew install|yum install|dnf install)\b"
_HOME_PATH_PATTERN = r"(~|/home/|/root|\$HOME)"
_SYSTEM_PATH_PATTERN = r"(^|\s)(/|/etc|/usr|/var|/boot|/sys|/proc)"
_SUDO_PATTERN = r"\bsudo\b"
_CHMOD_PATTERN = r"\bchmod\b.*(\+x|777|755)"

SAFE_RULES: list[SecurityRule] = [
    SecurityRule(
        id=1,
        name="block_delete",
        description="Block all delete/remove commands",
        pattern=_DANGEROUS_CMD_PATTERN,
        block=True,
    ),
    SecurityRule(
        id=2,
        name="block_network",
        description="Block outbound network tools",
        pattern=_NETWORK_PATTERN,
        block=True,
    ),
    SecurityRule(
        id=3,
        name="block_install",
        description="Block package installs",
        pattern=_INSTALL_PATTERN,
        block=True,
    ),
    SecurityRule(
        id=4,
        name="block_sudo",
        description="Block sudo elevation",
        pattern=_SUDO_PATTERN,
        block=True,
    ),
    SecurityRule(
        id=5,
        name="block_chmod",
        description="Block permission changes",
        pattern=_CHMOD_PATTERN,
        block=True,
    ),
]

FLEXIBLE_RULES: list[SecurityRule] = [
    SecurityRule(
        id=1,
        name="block_home_delete",
        description="Block delete commands targeting home / root directories",
        pattern=_DANGEROUS_CMD_PATTERN,
        block=True,
        protected_paths=["~", "/home", "/root", "$HOME"],
    ),
    SecurityRule(
        id=2,
        name="block_system_paths",
        description="Block commands that target system-critical paths",
        pattern=_SYSTEM_PATH_PATTERN,
        block=True,
        protected_paths=["/", "/etc", "/usr", "/var", "/boot"],
    ),
    SecurityRule(
        id=3,
        name="block_sudo",
        description="Block sudo elevation",
        pattern=_SUDO_PATTERN,
        block=True,
    ),
]

AGGRESSIVE_RULES: list[SecurityRule] = [
    # Aggressive mode: nearly everything is allowed.
    # Only block catastrophic system-wide wipes.
    SecurityRule(
        id=1,
        name="block_system_wipe",
        description="Block rm -rf / or equivalent total wipes",
        pattern=r"\brm\s+.*-[rR].*\s+/\s*$",
        block=True,
    ),
]


# ---------------------------------------------------------------------------
# Default profiles
# ---------------------------------------------------------------------------

DEFAULT_PROFILES: Dict[SecurityMode, SecurityProfile] = {
    SecurityMode.SAFE: SecurityProfile(
        mode=SecurityMode.SAFE,
        rules=SAFE_RULES,
        allow_network=False,
        allow_install=False,
        description="Maximum restrictions — blocks deletes, network, installs, sudo.",
    ),
    SecurityMode.FLEXIBLE: SecurityProfile(
        mode=SecurityMode.FLEXIBLE,
        rules=FLEXIBLE_RULES,
        allow_network=True,
        allow_install=True,
        description="Moderate — allows most commands but protects home and system paths.",
    ),
    SecurityMode.AGGRESSIVE: SecurityProfile(
        mode=SecurityMode.AGGRESSIVE,
        rules=AGGRESSIVE_RULES,
        allow_network=True,
        allow_install=True,
        description="Minimal guardrails — only blocks catastrophic system wipes.",
    ),
    SecurityMode.CUSTOM: SecurityProfile(
        mode=SecurityMode.CUSTOM,
        rules=[],
        allow_network=True,
        allow_install=True,
        description="User-defined rules.",
    ),
}


# ---------------------------------------------------------------------------
# Rules Engine (singleton-style state)
# ---------------------------------------------------------------------------

class RulesEngine:
    """In-memory rules engine that holds the active security mode and stats."""

    def __init__(self) -> None:
        self._active_mode: SecurityMode = SecurityMode.SAFE
        self._profiles: Dict[SecurityMode, SecurityProfile] = deepcopy(DEFAULT_PROFILES)
        self._total_blocked: int = 0
        self._total_allowed: int = 0
        self._audit_log: list[ShimVerdict] = []

    # -- Mode management ----------------------------------------------------

    @property
    def active_mode(self) -> SecurityMode:
        return self._active_mode

    @property
    def active_profile(self) -> SecurityProfile:
        return self._profiles[self._active_mode]

    def set_mode(self, mode: SecurityMode) -> SecurityProfile:
        self._active_mode = mode
        return self.active_profile

    # -- Custom rules -------------------------------------------------------

    def set_custom_rules(self, rules: list[SecurityRule]) -> SecurityProfile:
        self._profiles[SecurityMode.CUSTOM].rules = rules
        return self._profiles[SecurityMode.CUSTOM]

    def add_custom_rule(self, rule: SecurityRule) -> SecurityProfile:
        self._profiles[SecurityMode.CUSTOM].rules.append(rule)
        return self._profiles[SecurityMode.CUSTOM]

    # -- Evaluation ---------------------------------------------------------

    def evaluate(self, payload: CommandPayload) -> ShimVerdict:
        """
        Evaluate a command against the active profile's rules using Three-Lane Hybrid Routing.
        
        Phase 1 (Heuristic Fast-Path):
        - Compute a confidence score (1-10) using fast heuristic patterns.
        - Route to appropriate lane based on score.
        
        Phase 2 (Optional AI Consultation):
        - Only consult distilled assessor for scores in the grey area (2-7).
        - Implements Fail-Closed: AI errors → score 9 (high risk).
        
        Then evaluate against the active security profile's rules.
        """
        profile = self.active_profile
        command = payload.command

        # Phase 1: Compute heuristic score
        heuristic_score = _compute_heuristic_score(command)

        # Determine routing directive
        directive = _route_evaluation(heuristic_score)

        # Phase 2: Execute directive (fast-path or AI consultation)
        confidence_score, assessment_source, reason = _evaluate_command_with_directive(
            command, heuristic_score, directive
        )

        # Phase 3: Evaluate against active profile rules
        for rule in profile.rules:
            if self._matches(rule, command):
                verdict = ShimVerdict(
                    allowed=False,
                    command=command,
                    mode=self._active_mode,
                    matched_rule=rule.name,
                    reason=rule.description or f"Blocked by rule: {rule.name}",
                    confidence_score=confidence_score,
                    assessment_source=assessment_source,
                )
                self._total_blocked += 1
                self._audit_log.append(verdict)
                return verdict

        # No rule matched → allow
        verdict = ShimVerdict(
            allowed=True,
            command=command,
            mode=self._active_mode,
            matched_rule=None,
            reason=reason,
            confidence_score=confidence_score,
            assessment_source=assessment_source,
        )
        self._total_allowed += 1
        self._audit_log.append(verdict)
        return verdict

    # -- Stats & logs -------------------------------------------------------

    @property
    def total_blocked(self) -> int:
        return self._total_blocked

    @property
    def total_allowed(self) -> int:
        return self._total_allowed

    @property
    def audit_log(self) -> list[ShimVerdict]:
        return list(self._audit_log)

    def clear_audit_log(self) -> None:
        self._audit_log.clear()
        self._total_blocked = 0
        self._total_allowed = 0

    # -- Internals ----------------------------------------------------------

    @staticmethod
    def _matches(rule: SecurityRule, command: str) -> bool:
        """Return True if the rule's pattern matches the command.

        For rules with protected_paths, the rule only blocks when the
        command BOTH matches the pattern AND references a protected path.
        """
        pattern_hit = bool(re.search(rule.pattern, command, re.IGNORECASE))
        if not pattern_hit:
            return False

        # If no protected paths specified, any pattern match triggers the rule.
        if not rule.protected_paths:
            return True

        # Check if any protected path appears in the command.
        for path in rule.protected_paths:
            escaped = re.escape(path)
            if re.search(escaped, command):
                return True

        return False


# Module-level singleton
engine = RulesEngine()
