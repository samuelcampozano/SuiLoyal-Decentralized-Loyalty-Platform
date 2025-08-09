import os
import time
import json
from typing import Any, Dict

import requests

API_BASE = os.getenv("API_BASE", "http://localhost:8000")


def post(path: str, data: Dict[str, Any]):
    url = f"{API_BASE}{path}"
    r = requests.post(url, json=data, timeout=10)
    r.raise_for_status()
    return r.json()


def main():
    print("Seeding sample data...")
    time.sleep(0.5)

    try:
        merchant = post("/api/v1/merchants", {"name": "Coffee Club", "description": "Best beans"})
        customer = post("/api/v1/customers", {"wallet": "0xDEADBEEF"})
        reward = post("/api/v1/redemptions", {"customer_wallet": customer.get("wallet"), "points": 10})
        print(json.dumps({"merchant": merchant, "customer": customer, "reward": reward}, indent=2))
    except Exception as e:
        print("Seed failed:", e)


if __name__ == "__main__":
    main()
