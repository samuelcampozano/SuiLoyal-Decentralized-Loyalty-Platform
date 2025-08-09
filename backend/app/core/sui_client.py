# Placeholder Sui client wrapper.
# In production, use a Node microservice or call `sui` via subprocess.
from typing import Any, Dict


def get_balance(wallet: str) -> Dict[str, Any]:
    return {"wallet": wallet, "balance": "0"}
