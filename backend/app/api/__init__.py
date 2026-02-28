from fastapi import APIRouter
from .routes import router as routes_router
from .ai import router as ai_router

router = APIRouter()
router.include_router(routes_router)
router.include_router(ai_router, prefix="/ai")
