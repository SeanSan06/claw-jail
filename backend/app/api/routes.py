from fastapi import APIRouter
from app.schemas import Item

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/items")
async def create_item(item: Item):
    return item
