from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # <-- ADD THIS
from app.api import router as api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

# ALLOW REACT TO TALK TO FASTAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, this is fine
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": settings.app_name}