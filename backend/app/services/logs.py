import asyncio
import random
from datetime import datetime

SAMPLES = [
    {"actor": "clawbot", "action": "read", "target": "/etc/passwd", "level": "info"},
    {"actor": "clawbot", "action": "list", "target": "/home/user", "level": "info"},
    {"actor": "clawbot", "action": "delete", "target": "/tmp/tmpfile", "level": "warn"},
    {"actor": "clawbot", "action": "exec", "target": "curl http://evil", "level": "error"},
]

async def fake_log_generator():
    """Yield a new fake log dict indefinitely."""
    while True:
        base = random.choice(SAMPLES)
        entry = {
            "id": random.randint(1_000_000, 9_999_999),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "actor": base["actor"],
            "action": base["action"],
            "target": base["target"],
            "level": base["level"],
        }
        yield entry
        await asyncio.sleep(random.uniform(0.5, 1.5))