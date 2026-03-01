"""
Rules Engine — manages security profiles and evaluates commands.

Each SecurityMode maps to a pre-built SecurityProfile.  The user can also
supply custom rules via the API.
"""

from __future__ import annotations

import re
from copy import deepcopy
from typing import Dict

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
        """Evaluate a command against the active profile's rules.

        Phase 1 (Heuristic Filter):
        - Compute a confidence score (1-10) using fast heuristic patterns.
        - Evaluate against active security profile.
        - Return verdict with score.
        """
        profile = self.active_profile
        command = payload.command

        # Phase 1: Compute heuristic score
        confidence_score = _compute_heuristic_score(command)

        # Default assessment source/reason for Phase 1
        assessment_source = "heuristic"
        assessor_reason = None

        # Phase 2 (optional): consult local distilled assessor for non-trivial commands
        if settings.use_distilled_assessor and confidence_score > 1:
            assessor_result = assess_with_ollama(command)
            try:
                confidence_score = int(assessor_result.get("score", confidence_score))
            except Exception:
                # keep heuristic score on parse errors
                pass
            assessment_source = assessor_result.get("assessment_source", "distilled_ai")
            assessor_reason = assessor_result.get("reason")

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
        final_reason = assessor_reason or "No blocking rule matched."
        verdict = ShimVerdict(
            allowed=True,
            command=command,
            mode=self._active_mode,
            matched_rule=None,
            reason=final_reason,
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
