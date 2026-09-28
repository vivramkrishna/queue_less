import csv
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="Lloyds Banking API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

customer_sessions: dict[str, str] = {}
admin_sessions: set[str] = set()


def read_csv(name: str) -> list[dict]:
    with (DATA_DIR / name).open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def safe_customer(customer: dict) -> dict:
    return {key: value for key, value in customer.items() if key != "password"}


def secure_equals(left: str, right: str) -> bool:
    """Compare user-entered credentials safely, including Unicode input."""
    return secrets.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def account_payload(account: dict) -> dict:
    result = dict(account)
    result["balance"] = float(result["balance"])
    return result


def transaction_payload(transaction: dict) -> dict:
    result = dict(transaction)
    result["amount"] = float(result["amount"])
    result["balance after"] = float(result["balance after"])
    return result


def bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in")
    return authorization.removeprefix("Bearer ").strip()


def current_customer(authorization: Optional[str] = Header(default=None)) -> dict:
    token = bearer_token(authorization)
    customer_id = customer_sessions.get(token)
    customer = next((c for c in read_csv("customers.csv") if c["customer_id"] == customer_id), None)
    if not customer:
        raise HTTPException(status_code=401, detail="Session expired")
    return customer


def require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    if bearer_token(authorization) not in admin_sessions:
        raise HTTPException(status_code=401, detail="Admin access required")


class LoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class ChatRequest(BaseModel):
    message: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/login")
def login(body: LoginRequest):
    customer = next((c for c in read_csv("customers.csv") if c["email"].lower() == body.email.strip().lower()), None)
    if not customer or not secure_equals(customer["password"], body.password):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    token = secrets.token_urlsafe(32)
    customer_sessions[token] = customer["customer_id"]
    return {"token": token, "customer": safe_customer(customer)}


@app.post("/api/admin/login")
def admin_login(body: AdminLoginRequest):
    expected_user = os.getenv("ADMIN_USERNAME", "admin")
    expected_password = os.getenv("ADMIN_PASSWORD", "LloydsAdmin@2026")
    if not secure_equals(body.username, expected_user) or not secure_equals(body.password, expected_password):
        raise HTTPException(status_code=401, detail="Admin credentials are incorrect")
    token = secrets.token_urlsafe(32)
    admin_sessions.add(token)
    return {"token": token}


@app.get("/api/me")
def me(customer: dict = Depends(current_customer)):
    accounts = [account_payload(a) for a in read_csv("accounts.csv") if a["customer_id"] == customer["customer_id"]]
    return {"customer": safe_customer(customer), "accounts": accounts}


@app.get("/api/accounts/{account_id}")
def account_detail(account_id: str, customer: dict = Depends(current_customer)):
    account = next((a for a in read_csv("accounts.csv") if a["account_id"] == account_id and a["customer_id"] == customer["customer_id"]), None)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    transactions = [transaction_payload(t) for t in read_csv("transactions.csv") if t["account_id"] == account_id]
    transactions.sort(key=lambda item: item["date"], reverse=True)
    return {"account": account_payload(account), "transactions": transactions}


def build_context(customer: dict) -> tuple[list[dict], list[dict]]:
    accounts = [account_payload(a) for a in read_csv("accounts.csv") if a["customer_id"] == customer["customer_id"]]
    ids = {a["account_id"] for a in accounts}
    transactions = [transaction_payload(t) for t in read_csv("transactions.csv") if t["account_id"] in ids]
    transactions.sort(key=lambda item: item["date"], reverse=True)
    return accounts, transactions[:12]


def local_banking_answer(message: str, accounts: list[dict], transactions: list[dict]) -> str:
    text = message.lower()
    if any(word in text for word in ["balance", "money", "funds"]):
        balances = [f'{a["type"].title()} account ending {a["account number"][-4:]}: ₹{a["balance"]:,.2f}' for a in accounts]
        return "Your available balances are: " + "; ".join(balances) + "."
    if any(word in text for word in ["transaction", "spent", "payment", "recent"]):
        if not transactions:
            return "There are no recent transactions on your accounts."
        recent = transactions[:3]
        items = [f'{t["description"]} — {"+" if t["type"] == "credit" else "−"}₹{t["amount"]:,.2f}' for t in recent]
        return "Your latest transactions are: " + "; ".join(items) + "."
    if any(word in text for word in ["account", "savings", "current"]):
        types = ", ".join(a["type"] for a in accounts)
        return f"You currently have {types} account access. Savings accounts are designed for personal saving; current accounts support frequent everyday or business transactions."
    return "I can help with your balances, recent transactions, account types, and general banking questions."


async def groq_answer(customer: dict, message: str, accounts: list[dict], transactions: list[dict]) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return local_banking_answer(message, accounts, transactions)
    system_prompt = "You are a helpful assistant. Answer any user query as accurately and helpfully as possible."
    context = {"customer": safe_customer(customer), "accounts": accounts, "recent_transactions": transactions}
    payload = {
        "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
        "temperature": 0.2,
        "max_tokens": 350,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": "Authenticated customer context (private; use only to answer this customer):\n" + json.dumps(context)},
            {"role": "user", "content": message},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError):
        return local_banking_answer(message, accounts, transactions)


@app.post("/api/chat")
async def chat(body: ChatRequest, customer: dict = Depends(current_customer)):
    question = body.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    accounts, transactions = build_context(customer)
    answer = await groq_answer(customer, question, accounts, transactions)
    row = {
        "conversation_id": "CHAT" + secrets.token_hex(5).upper(),
        "customer_id": customer["customer_id"],
        "customer_name": customer["name"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question,
        "response": answer,
    }
    with (DATA_DIR / "conversations.csv").open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=row.keys())
        writer.writerow(row)
    return {"response": answer, "timestamp": row["timestamp"]}


@app.get("/api/admin/customers")
def admin_customers(_: None = Depends(require_admin)):
    customers = read_csv("customers.csv")
    accounts = read_csv("accounts.csv")
    return [
        {**safe_customer(customer), "accounts": [account_payload(a) for a in accounts if a["customer_id"] == customer["customer_id"]]}
        for customer in customers
    ]


@app.get("/api/admin/customers/{customer_id}")
def admin_customer_detail(customer_id: str, _: None = Depends(require_admin)):
    customer = next((c for c in read_csv("customers.csv") if c["customer_id"] == customer_id), None)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    accounts = [account_payload(a) for a in read_csv("accounts.csv") if a["customer_id"] == customer_id]
    ids = {a["account_id"] for a in accounts}
    transactions = [transaction_payload(t) for t in read_csv("transactions.csv") if t["account_id"] in ids]
    transactions.sort(key=lambda item: item["date"], reverse=True)
    return {"customer": safe_customer(customer), "accounts": accounts, "transactions": transactions}


@app.get("/api/admin/conversations")
def admin_conversations(customer_id: Optional[str] = Query(default=None), search: str = Query(default=""), _: None = Depends(require_admin)):
    conversations = read_csv("conversations.csv")
    if customer_id:
        conversations = [c for c in conversations if c["customer_id"] == customer_id]
    if search.strip():
        needle = search.strip().lower()
        conversations = [c for c in conversations if needle in (c["customer_name"] + " " + c["question"] + " " + c["response"]).lower()]
    conversations.sort(key=lambda item: item["timestamp"], reverse=True)
    return conversations
