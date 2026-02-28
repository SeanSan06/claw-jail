from fastapi import FastAPI
from app.api import router as api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": settings.app_name}
