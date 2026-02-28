from fastapi import APIRouter
from .routes import router as routes_router
from .ai import router as ai_router
from .security import router as security_router
from . import websocket as websocket_module

router = APIRouter()
router.include_router(routes_router)
router.include_router(ai_router, prefix="/ai")
router.include_router(security_router, prefix="/security", tags=["Security"])
router.include_router(websocket_module.router, prefix="/ws")
