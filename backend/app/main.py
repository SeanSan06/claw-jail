import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as routes_router
from app.api.websocket import router as ws_router, _queue_consumer


@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(_queue_consumer())
    yield
    task.cancel()


app = FastAPI(title="Claw Jail", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_router)
app.include_router(ws_router)