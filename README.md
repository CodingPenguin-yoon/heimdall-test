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

When Heimdall deploys the backend, it uses the password-file contract instead of
`DATABASE_URL`:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_SCHEMA
DATABASE_PASSWORD_FILE
```

The backend reads the raw password only from `DATABASE_PASSWORD_FILE`. Heimdall mounts that
file read-only at runtime and does not expose the password through container environment
variables.

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
- `GET /api`
- `GET /api/status`
- `GET /api/memos`
- `POST /api/memos`
