import os
from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    network: str = os.getenv("SUI_NETWORK", "devnet")


settings = Settings()
