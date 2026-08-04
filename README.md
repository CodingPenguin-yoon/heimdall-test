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

## Deploy With Heimdall

Configure two build services from the same `main` commit:

- `frontend`: context `frontend`, port `80`, health `/`
- `backend`: context `backend`, port `4000`, health `/health`, Managed PostgreSQL enabled
- route `/` to `frontend` and `/api` to `backend`

Heimdall does not place the database password in `DATABASE_URL` or the container environment.
When `DATABASE_URL` is absent, the backend reads the managed database contract below and loads
the password from the read-only file referenced by `DATABASE_PASSWORD_FILE`:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_SCHEMA
DATABASE_PASSWORD_FILE
```

The existing `DATABASE_URL` path remains available for local Docker Compose development.

## Endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/memos`
- `POST /api/memos`
