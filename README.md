# Lloyds Banking

A responsive Lloyds Banking portal with customer and admin experiences, CSV-backed data, and a server-side Groq banking assistant.

## Structure

```text
lloyds-banking/
├── backend/
│   ├── data/
│   │   ├── accounts.csv
│   │   ├── conversations.csv
│   │   ├── customers.csv
│   │   └── transactions.csv
│   ├── .env.example
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Run locally

1. Start the API:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Add your GROQ_API_KEY to .env
   uvicorn main:app --reload --port 8000
   ```
2. In a second terminal, start the website:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173`.

## Sign in

- Customer: `maya.shah@example.com` / `Lloyds@123`
- Customer: `daniel.lee@example.com` / `Lloyds@123`
- Admin: `admin` / `LloydsAdmin@2026`

The remaining customer credentials are in `backend/data/customers.csv`. The assistant uses Groq when a key is configured. Without a key, a small local banking-only fallback keeps the balance and transaction flow usable.
