# CRM Platform Foundation - Backend

FastAPI-based REST backend for the CRM Platform Foundation, providing data persistence, business logic, validation, and API contracts for CRM entities (Companies, Contacts, Leads, Tasks, Interactions, and Dashboard).

> For full application setup, API documentation links, and container deployment runbook, see the root [README.md](../README.md).

## Prerequisites

- **Python**: 3.11 or higher
- **Package Manager**: `pip` (or `uv` / `pnpm` runner)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -e .
   # Alternatively, if using requirements.txt:
   # pip install -r requirements.txt
   ```

   If using `uv`:
   ```bash
   uv pip install -e .
   ```

## Environment Variables

Copy `.env.example` to `.env` in the `backend` directory to set up local environment variables:

```bash
cp .env.example .env
```

### Available Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database connection string | `sqlite:///./crm.db` |
| `LOG_LEVEL` | Application logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) | `INFO` |

## Running the Application

To start the FastAPI development server with auto-reload:

```bash
uvicorn src.api.main:app --reload
```

Or using `uv`:

```bash
uv run uvicorn src.api.main:app --reload
```

Once running, the server is available at:
- **API Base URL**: `http://localhost:8000`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`
- **Alternative Redoc Documentation**: `http://localhost:8000/redoc`
- **Health Check Endpoint**: `http://localhost:8000/healthz`

## Testing and Code Quality

### Running Tests

Run the full test suite with `pytest`:

```bash
pytest
```

Or run tests with coverage reporting:

```bash
pytest --cov=src --cov-report=term-missing
```

With `uv`:

```bash
uv run pytest
```

### Linting and Formatting

Check code style and formatting using Ruff:

```bash
ruff check .
ruff format --check .
```

To automatically fix formatting and lint issues:

```bash
ruff check --fix .
ruff format .
```

### Type Checking

Run static type checks with `mypy`:

```bash
mypy src
```

## Project Structure

```text
backend/
├── pyproject.toml        # Dependency & tool configurations (Ruff, mypy, pytest)
├── requirements.txt      # Generated requirements lockfile
├── .env.example          # Sample environment configuration
├── src/
│   ├── api/             # FastAPI routes, request/response handlers
│   ├── services/        # Business logic domain layer
│   ├── models/          # SQLAlchemy database models & schema definitions
│   ├── workers/         # Background tasks
│   ├── connectors/      # External integrations and adapters
│   └── lib/             # Configuration loading & structured logging
└── tests/
    ├── unit/            # Isolated unit tests for service & domain logic
    ├── integration/     # API and DB integration tests
    └── contract/        # OpenAPI contract conformance tests
```
