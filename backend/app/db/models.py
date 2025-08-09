from pydantic import BaseModel


class Merchant(BaseModel):
    id: int
    name: str
    description: str | None = None


class Customer(BaseModel):
    id: int
    wallet: str


class Redemption(BaseModel):
    id: int
    customer_wallet: str
    points: int
