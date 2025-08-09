from fastapi import FastAPI
from .api.v1 import merchants, customers, redemptions

app = FastAPI(title="SuiLoyal API")

app.include_router(merchants.router, prefix="/api/v1", tags=["merchants"])
app.include_router(customers.router, prefix="/api/v1", tags=["customers"])
app.include_router(redemptions.router, prefix="/api/v1", tags=["redemptions"])


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
