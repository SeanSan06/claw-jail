from pydantic import BaseModel
from typing import Optional


class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
