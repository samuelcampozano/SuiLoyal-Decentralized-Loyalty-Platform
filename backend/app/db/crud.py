from typing import List, Dict, Any
from . import models

_merchants: List[models.Merchant] = []
_customers: List[models.Customer] = []
_redemptions: List[models.Redemption] = []

_mid = 0
_cid = 0
_rid = 0


def create_merchant(name: str, description: str | None) -> Dict[str, Any]:
    global _mid
    _mid += 1
    m = models.Merchant(id=_mid, name=name, description=description)
    _merchants.append(m)
    return m.model_dump()


def list_merchants() -> List[Dict[str, Any]]:
    return [m.model_dump() for m in _merchants]


def create_customer(wallet: str) -> Dict[str, Any]:
    global _cid
    _cid += 1
    c = models.Customer(id=_cid, wallet=wallet)
    _customers.append(c)
    return c.model_dump()


def list_customers() -> List[Dict[str, Any]]:
    return [c.model_dump() for c in _customers]


def redeem(customer_wallet: str, points: int) -> Dict[str, Any]:
    global _rid
    _rid += 1
    r = models.Redemption(id=_rid, customer_wallet=customer_wallet, points=points)
    _redemptions.append(r)
    return r.model_dump()


def list_redemptions() -> List[Dict[str, Any]]:
    return [r.model_dump() for r in _redemptions]
