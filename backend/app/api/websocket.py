import asyncio
import json
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass

    async def broadcast(self, message: str) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                # remove failing connections
                self.disconnect(connection)


manager = ConnectionManager()


# Example fake log dataset (dicts) to iterate and send to clients
FAKE_LOGS = [
    {"level": "INFO", "msg": "agent initialized", "source": "agent"},
    {"level": "INFO", "msg": "listening for events", "source": "shim"},
    {"level": "WARN", "msg": "high memory usage detected", "source": "monitor"},
    {"level": "ERROR", "msg": "failed to apply rule", "source": "rules_engine"},
    {"level": "INFO", "msg": "clearing temporary files", "source": "agent"},
]


async def _broadcaster_task() -> None:
    """Background task that iterates FAKE_LOGS and broadcasts them."""
    while True:
        if not manager.active_connections:
            # no clients, pause briefly
            await asyncio.sleep(0.5)
            continue

        for entry in FAKE_LOGS:
            payload = json.dumps(entry)
            await manager.broadcast(payload)
            # small delay between messages
            await asyncio.sleep(1.0)


# Launch a single background broadcaster
_broadcast_task = asyncio.create_task(_broadcaster_task())


@router.websocket("/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint that keeps a persistent connection and receives streamed logs.

    Clients connect once and receive a continuous stream of JSON-formatted log dicts.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive by awaiting receive_text. Frontend can send pings if desired.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)