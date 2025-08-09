from fastapi import APIRouter
from pydantic import BaseModel
from ...db import crud

router = APIRouter()


class CustomerIn(BaseModel):
    wallet: str


@router.post("/customers")
def create_customer(c: CustomerIn):
    return crud.create_customer(c.wallet)


@router.get("/customers")
def list_customers():
    return crud.list_customers()
