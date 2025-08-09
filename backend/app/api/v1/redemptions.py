from fastapi import APIRouter
from pydantic import BaseModel
from ...db import crud

router = APIRouter()


class RedemptionIn(BaseModel):
    customer_wallet: str
    points: int


@router.post("/redemptions")
def redeem(r: RedemptionIn):
    return crud.redeem(r.customer_wallet, r.points)


@router.get("/redemptions")
def list_redemptions():
    return crud.list_redemptions()
