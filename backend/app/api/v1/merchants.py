from fastapi import APIRouter
from pydantic import BaseModel
from ...db import crud

router = APIRouter()


class MerchantIn(BaseModel):
    name: str
    description: str | None = None


@router.post("/merchants")
def create_merchant(m: MerchantIn):
    return crud.create_merchant(m.name, m.description)


@router.get("/merchants")
def list_merchants():
    return crud.list_merchants()
