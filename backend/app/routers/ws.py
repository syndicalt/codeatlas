"""WebSocket endpoint for real-time collaboration."""
from __future__ import annotations
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# project_id -> set of (WebSocket, peer_info_dict)
_rooms: dict[str, dict[str, tuple[WebSocket, dict]]] = {}

COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#f43f5e", "#8b5cf6"]


@router.websocket("/ws/{project_id}")
async def collaboration_ws(websocket: WebSocket, project_id: str):
    await websocket.accept()

    peer_id = str(uuid.uuid4())[:8]
    if project_id not in _rooms:
        _rooms[project_id] = {}

    color = COLORS[len(_rooms[project_id]) % len(COLORS)]
    peer_info = {"id": peer_id, "color": color}
    _rooms[project_id][peer_id] = (websocket, peer_info)

    # Send peer their own info
    await websocket.send_json({"type": "connected", "peer": peer_info})

    # Broadcast join to others
    await _broadcast(project_id, peer_id, {
        "type": "peer_joined",
        "peer": peer_info,
        "peer_count": len(_rooms[project_id]),
    })

    # Send current peer list to new joiner
    peers = [info for pid, (ws, info) in _rooms[project_id].items() if pid != peer_id]
    await websocket.send_json({"type": "peer_list", "peers": peers})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg["peer"] = peer_info

            # Broadcast to all other peers in the room
            await _broadcast(project_id, peer_id, msg)
    except WebSocketDisconnect:
        pass
    finally:
        _rooms.get(project_id, {}).pop(peer_id, None)
        if project_id in _rooms and not _rooms[project_id]:
            del _rooms[project_id]
        else:
            await _broadcast(project_id, peer_id, {
                "type": "peer_left",
                "peer": peer_info,
                "peer_count": len(_rooms.get(project_id, {})),
            })


async def _broadcast(project_id: str, sender_id: str, message: dict):
    """Broadcast a message to all peers except the sender."""
    room = _rooms.get(project_id, {})
    disconnected = []
    for pid, (ws, _) in room.items():
        if pid == sender_id:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(pid)
    for pid in disconnected:
        room.pop(pid, None)
