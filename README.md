# Heimdall Pipeline Test App

Frontend and backend sample project for testing automated build/deploy pipelines.

## Structure

```text
backend/
  Dockerfile
  src/
frontend/
  Dockerfile
  src/
docker-compose.yml
```

## Run Locally

Backend:

```bash
cd backend
npm install
npm run dev
```

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

