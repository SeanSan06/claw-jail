# Claw Jail — Backend (FastAPI)

Quick start

1. Create a virtual environment and activate it:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the app (development):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API endpoints

- `GET /` — root message
- `GET /api/health` — health check
- `POST /api/items` — create an item (JSON body)
