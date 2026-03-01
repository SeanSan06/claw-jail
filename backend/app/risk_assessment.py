"""Risk scoring engine and security policy store."""

from __future__ import annotations

import json
import os
import re
from urllib import request

from dotenv import load_dotenv

from app.models import RiskResult, SecurityPolicy

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT_S", "10"))

RISK_PATTERNS: list[tuple[str, str, int | str]] = [
    ("safe_readonly",    r"^\s*(pwd|ls|whoami|echo|cat|grep|find|head|tail|wc)\s*($|\s|\|)",  -20),
    ("dangerous_delete", r"\b(rm|rmdir|del|deltree|shred|mkfs|dd|format)\b",                   35),
    ("network_tool",     r"\b(curl|wget|nc|ncat|ssh|scp|rsync|ftp|telnet)\b",                  20),
    ("pkg_install",      r"\b(pip install|npm install|apt install|apt-get install|brew install|yum install|dnf install)\b", 15),
    ("sudo",             r"\bsudo\b",                                                          30),
    ("chmod",            r"\bchmod\b.*(\+x|777|755)",                                         25),
    ("credential_access", r"\b(passwd|shadow|secret|token|credential|api.key)\b",              25),
    ("pipe_to_shell",    r"\|\s*(ba)?sh\b",                                                   40),
    ("b64_decode_exec",  r"base64\s+(-d|--decode).*\|\s*(ba)?sh",                              50),
    ("reverse_shell",    r"(bash\s+-i|/dev/tcp/|nc\s+-e|mkfifo|exec\s+\d+<>/dev/tcp)",        "set:95"),
    ("env_exfil",        r"(printenv|env|\$\{?\w+\}?).*\|.*(curl|wget|nc)",                   40),
    ("recursive_force",  r"-(r|R)(f|F)",                                                       20),
    ("system_path",      r"(^|\s)(/etc|/usr|/var|/boot|/sys|/proc|/root)\b",                   15),
    ("disk_write",       r"\bdd\b.*of=/dev/",                                                  "set:90"),
    ("kill_shutdown",    r"\b(kill|killall|shutdown|reboot|init\s+0)\b",                       20),
    ("dev_tool",         r"\b(git|npm|pip|node|python|python3)\b",                             5),
]


class PolicyStore:
    def __init__(self) -> None:
        self._policy = SecurityPolicy()

    @property
    def policy(self) -> SecurityPolicy:
        return self._policy

    def set_threshold(self, value: int) -> None:
        self._policy.risk_threshold = max(1, min(100, value))

    def ingest_chat_log(self, message: str) -> None:
        """Parse *message* into tokens and update both blacklists."""
        tokens = re.findall(r"[\w./-]+-tool|[\w./-]+", message.lower())
        for token in tokens:
            if token.endswith("-tool"):
                tool_name = token[: -len("-tool")]
                if tool_name and tool_name not in self._policy.tool_blacklist:
                    self._policy.tool_blacklist.append(tool_name)
            if token not in self._policy.word_blacklist:
                self._policy.word_blacklist.append(token)


policy_store = PolicyStore()


def _ask_llm(command: str, heuristic_score: int) -> int | None:
    """Call Gemini Flash-Lite to determine difficulty/risk on a 1-100 scale."""
    if not settings.gemini_api_key:
        return None

    # Strict prompt asking for ONLY a number from 1-100
    prompt = (
        "You are a strict security risk assessor for a Linux shell environment. "
        "Rate the risk of the following shell command on a scale from 1 (completely safe) to 100 (extremely dangerous/system wiping). "
        "Respond with ONLY a single integer from 1 to 100. Do not include any other text, letters, or punctuation.\n\n"
        f"Command: {command}"
    )

    try:
        # Load the super-fast flash-lite model!
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content(prompt)
        
        text = response.text.strip()
        # Find the first number in the response
        match = re.search(r"\d+", text)
        if match:
            raw_score = int(match.group())
            # Ensure it stays within 1 to 100 bounds
            return max(1, min(100, raw_score))
            
    except Exception as e:
        print(f"Gemini fallback failed: {e}")
        pass
        
    return None


def compute_risk(command: str) -> RiskResult:
    """Score *command* 0-100; flag if above threshold."""
    cmd = command.strip()
    score: int = 30
    matched: list[str] = []
    blacklist_hit = False

    for name, pattern, delta in RISK_PATTERNS:
        if isinstance(delta, str) and delta.startswith("set:"):
            if re.search(pattern, cmd, re.IGNORECASE):
                score = int(delta.split(":")[1])
                matched.append(name)
        else:
            assert isinstance(delta, int)
            if re.search(pattern, cmd, re.IGNORECASE):
                score += delta
                matched.append(name)

    score = max(0, min(100, score))

    policy = policy_store.policy
    cmd_lower = cmd.lower()

    for word in policy.word_blacklist:
        if re.search(r"\b" + re.escape(word) + r"\b", cmd_lower):
            score = 100
            blacklist_hit = True
            break

    if not blacklist_hit:
        for tool in policy.tool_blacklist:
            if re.search(r"\b" + re.escape(tool) + r"\b", cmd_lower):
                score = 100
                blacklist_hit = True
                break

    threshold = policy.risk_threshold
    llm_consulted = False
    llm_score: int | None = None

    if score < threshold and not blacklist_hit:
        llm_score = _ask_llm(cmd, score)
        if llm_score is not None:
            llm_consulted = True
            score = llm_score

    return RiskResult(
        score=score,
        flagged=score >= threshold,
        matched_patterns=matched,
        blacklist_hit=blacklist_hit,
        llm_consulted=llm_consulted,
        llm_score=llm_score,
    )
