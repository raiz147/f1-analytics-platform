# F1 Data Pipeline

Production-quality Formula 1 data platform built with Python, PostgreSQL, Node.js, and React.

## Current Scope

Phases 1 through 4 now cover:

- project structure
- raw PostgreSQL ingestion layer
- analytics PostgreSQL processing layer
- Python ingestion pipeline for OpenF1 lap data
- Python processing job for session-level analytics
- Node.js + Express analytics API
- React frontend dashboard

## 1. Folder Structure

```text
windsurf-project/
|-- backend/
|   `-- api/
|       |-- package.json
|       |-- .env.example
|       `-- src/
|           |-- app.js
|           |-- config.js
|           |-- logger.js
|           |-- server.js
|           |-- db/
|           |   `-- pool.js
|           |-- middleware/
|           |   `-- errorHandler.js
|           |-- repositories/
|           |   `-- sessionRepository.js
|           |-- routes/
|           |   |-- healthRoutes.js
|           |   `-- sessionRoutes.js
|           |-- services/
|           |   `-- sessionService.js
|           `-- utils/
|               `-- http.js
|-- database/
|   |-- migrations/
|   `-- schema.sql
|-- frontend/
|   |-- package.json
|   |-- .env.example
|   |-- index.html
|   |-- vite.config.js
|   `-- src/
|       |-- api.js
|       |-- App.jsx
|       |-- main.jsx
|       `-- styles.css
|-- pipeline/
|   |-- requirements.txt
|   |-- .env.example
|   `-- src/
|       |-- __init__.py
|       |-- config.py
|       |-- database.py
|       |-- logging_config.py
|       |-- main.py
|       |-- clients/
|       |   |-- __init__.py
|       |   `-- openf1.py
|       |-- repositories/
|       |   |-- __init__.py
|       |   |-- analytics.py
|       |   `-- laps.py
|       |-- services/
|       |   |-- __init__.py
|       |   `-- ingestion.py
|       |   `-- processing.py
|       `-- utils/
|           |-- __init__.py
|           `-- parsing.py
`-- docker-compose.yml
```

## 2. Required Dependencies

Python dependencies are in [pipeline/requirements.txt](/d:/My%20Programs/CascadeProjects/windsurf-project/pipeline/requirements.txt).

- `requests`
- `psycopg[binary]`
- `python-dotenv`

## 3. Database Schema SQL

Schema lives in [database/schema.sql](/d:/My%20Programs/CascadeProjects/windsurf-project/database/schema.sql).

Highlights:

- `raw.sessions`: session-level ingestion metadata
- `raw.laps`: raw OpenF1 lap facts plus full `source_payload`
- `analytics.driver_session_summary`: per-driver metrics per session
- `analytics.session_fastest_laps`: session ranking by fastest lap
- `analytics.session_overview`: session-wide aggregate metrics
- `analytics.driver_stint_summary`: stint-level performance by driver
- unique key on `(session_key, driver_number, lap_number)` for idempotent raw ingestion

## 4. Python Ingestion Script

Main entry point: [pipeline/src/main.py](/d:/My%20Programs/CascadeProjects/windsurf-project/pipeline/src/main.py)

Responsibilities:

- `ingest`: fetch lap data from OpenF1, normalize records, and upsert into `raw`
- `process`: build analytics tables from raw laps
- `sync`: run ingestion and processing together for a single session
- `sync-recent`: discover and sync a bounded set of recent completed sessions
- log success and failure clearly

## 5. Instructions To Run Everything

### Start PostgreSQL

```bash
docker compose up -d postgres
```

### Create the schema

```bash
docker compose exec -T postgres psql -U f1 -d f1_analytics -f /docker-entrypoint-initdb.d/schema.sql
```

### Configure Python

```bash
cd pipeline
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create env file:

```bash
copy .env.example .env
```

### Run ingestion

Example for one session:

```bash
python -m src.main ingest --session-key 9158
```

Optional filters:

```bash
python -m src.main ingest --session-key 9158 --driver-number 1
python -m src.main ingest --session-key 9158 --meeting-key 1219
```

### Run processing

Build analytics tables for a session after ingestion:

```bash
python -m src.main process --session-key 9158
```

### Run sync

Run ingestion and processing together:

```bash
python -m src.main sync --session-key 9158
```

### Run recent sync

Discover and sync the most recent completed sessions for a season:

```bash
python -m src.main sync-recent --year 2025 --limit 6
```

### Configure and run the API

```bash
cd backend/api
npm install
copy .env.example .env
npm start
```

Available endpoints:

- `GET /health`
- `GET /sessions/:sessionKey/overview`
- `GET /sessions/:sessionKey/leaderboard`
- `GET /sessions/:sessionKey/drivers`
- `GET /sessions/:sessionKey/drivers/:driverNumber`
- `GET /sessions/:sessionKey/stints`
- `GET /sessions/:sessionKey/drivers/:driverNumber/laps`

### Configure and run the frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

- `http://localhost:5173`

Frontend features in the current phase:

- session selector
- live health check against the API
- session leaderboard table
- driver detail panel

## Notes

- The ingestion is idempotent because it uses PostgreSQL upserts.
- The processing layer is also idempotent because it upserts derived tables.
- `raw` keeps source-shaped data; `analytics` keeps query-friendly data.
- The backend API reads only from analytics tables, not raw ingestion tables.
- The frontend currently targets the existing analytics endpoints and is ready for more API expansion.

## Deployment

Recommended production split:

- frontend on Vercel
- API on Render Web Service
- PostgreSQL on Render Postgres
- pipeline on a Render Cron Job or worker service

Deployment files included:

- [render.yaml](/d:/My%20Programs/CascadeProjects/windsurf-project/render.yaml)
- [frontend/vercel.json](/d:/My%20Programs/CascadeProjects/windsurf-project/frontend/vercel.json)
- [backend/api/.env.example](/d:/My%20Programs/CascadeProjects/windsurf-project/backend/api/.env.example)
- [pipeline/.env.example](/d:/My%20Programs/CascadeProjects/windsurf-project/pipeline/.env.example)

### 1. Deploy PostgreSQL

Create a managed PostgreSQL instance on Render.

This project now supports either:

- `DATABASE_URL`
- or the individual `POSTGRES_*` variables

For production, prefer `DATABASE_URL`.

### 2. Deploy the API on Render

Use the repo root [render.yaml](/d:/My%20Programs/CascadeProjects/windsurf-project/render.yaml) as a Blueprint, or create the web service manually from [backend/api](/d:/My%20Programs/CascadeProjects/windsurf-project/backend/api).

Important environment variables:

- `DATABASE_URL`
- `FRONTEND_ORIGINS`
- `OPENF1_BASE_URL`
- `ENABLE_SESSION_IMPORTS=false` for public production deployments

### 3. Deploy the frontend on Vercel

Deploy [frontend](/d:/My%20Programs/CascadeProjects/windsurf-project/frontend) as a Vite app.

Required environment variable:

- `VITE_API_BASE_URL=https://your-api-domain`

### 4. Deploy the pipeline separately

Treat [pipeline](/d:/My%20Programs/CascadeProjects/windsurf-project/pipeline) as a scheduled ingestion/processing job, not as part of the frontend.

Important environment variables:

- `DATABASE_URL`
- `OPENF1_BASE_URL`
- `OPENF1_TIMEOUT_SECONDS`
- `SYNC_YEAR`
- `SYNC_LIMIT`

### 5. Production caveat

The API now supports `ENABLE_SESSION_IMPORTS`.

- `true`: local/dev mode, the API can shell out to the Python pipeline
- `false`: production-safe mode, the API import route returns `403`

The included [render.yaml](/d:/My%20Programs/CascadeProjects/windsurf-project/render.yaml) uses the safer production model:

- API imports disabled
- pipeline sync handled by a separate scheduled service
- scheduled sync uses `sync-recent` to discover recent completed sessions automatically

## CI/CD

GitHub Actions workflows are included:

- [ci.yml](/d:/My%20Programs/CascadeProjects/windsurf-project/.github/workflows/ci.yml)
- [deploy.yml](/d:/My%20Programs/CascadeProjects/windsurf-project/.github/workflows/deploy.yml)

### CI

The CI workflow runs on pushes to `main` and on pull requests. It validates:

- Python syntax in [pipeline/src](/d:/My%20Programs/CascadeProjects/windsurf-project/pipeline/src)
- API syntax in [backend/api](/d:/My%20Programs/CascadeProjects/windsurf-project/backend/api)
- frontend production build in [frontend](/d:/My%20Programs/CascadeProjects/windsurf-project/frontend)

### CD

The deploy workflow triggers platform deploy hooks on pushes to `main`.

Configure these GitHub repository secrets:

- `RENDER_API_DEPLOY_HOOK_URL`
- `RENDER_PIPELINE_DEPLOY_HOOK_URL`
- `VERCEL_FRONTEND_DEPLOY_HOOK_URL`

If a secret is not set, that deployment step is skipped automatically.
