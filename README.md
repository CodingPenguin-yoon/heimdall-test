# Heimdall Pipeline Test App

Frontend, backend, and PostgreSQL sample project for testing automated build/deploy pipelines.

## Structure

```text
backend/
  Dockerfile
  src/
frontend/
  Dockerfile
  src/
docker-compose.yml
.env.example
```

## Environment

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

## Run Locally

Start PostgreSQL first:

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
npm install
DATABASE_URL=postgres://heimdall:heimdall@localhost:5432/heimdall_test npm run dev
```

For Docker Compose, `DATABASE_URL` should point at the `postgres` service host. For a backend
process running directly on the host, use `localhost`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Run With Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/memos`
- `POST /api/memos`
