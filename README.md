# API + Website Monitoring App

Full-stack monitoring app with:
- Frontend: React + TailwindCSS
- Backend: Go + Fiber
- Database: SQLite
- Worker: Go poller + HTTP client
- Authentication: JWT
- Deployment: Docker Compose

## Features

- User sign up/login with JWT auth
- Per-user monitor management (CRUD + enable/disable)
- Supports monitor type: `website` / `api`
- HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Configurable expected status code, response-time threshold, interval, headers, body
- Background monitor checks at `30s`, `1m`, `5m`, `10m`
- Stores check history and error logs
- Dashboard overview with UP/DOWN and average response time
- Monitor details page with status/response graphs and last 50 checks

## Project Structure

- `backend`: Fiber API service
- `frontend`: React web app
- `worker`: Go polling worker service
- `backend/migrations/001_init.sql`: initial schema

## Development with Makefile

A `Makefile` is provided as a shortcut for common development tasks:

| Command | Description |
| ------- | ----------- |
| `make install` | Install dependencies (Go modules and npm packages) |
| `make run-api` | Run the Backend API locally |
| `make run-worker` | Run the Worker service locally |
| `make run-web` | Run the Frontend React app locally |
| `make docker-up` | Build and start services using Docker Compose |
| `make docker-down` | Stop and remove Docker containers |
| `make tidy` | Run `go mod tidy` in backend and worker |

## Quick Start (Docker)


1. Build and start everything:

```bash
docker compose up --build
```

2. Open app:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/api/health

## Local Dev (without Docker)

Prerequisites:
- Go 1.23+
- Node 22+

1. Backend:

```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/server
```

2. Worker:

```bash
cd worker
cp .env.example .env
go mod tidy
go run .
```

3. Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

4. Apply SQL schema:
- Schema is applied automatically by the backend on startup to the SQLite database file.

## Manual Verification Checklist

- Auth:
  - Sign up a new user.
  - Login with created credentials.
  - Verify monitors from another user are not visible.

- Monitor CRUD:
  - Create Website monitor and API endpoint monitor.
  - Edit method, thresholds, headers/body.
  - Disable and re-enable monitor.
  - Delete monitor.

- Monitoring:
  - Verify checks appear in monitor details within configured interval.
  - Confirm status changes to `DOWN` on invalid expected status code.
  - Confirm error message appears for failures/timeouts.

- Dashboard/Details:
  - Overview cards update total/up/down/avg response.
  - Monitor table shows last check and uptime %.
  - Details page graphs update and last 50 checks render.

## API Endpoints

Public:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/health`

Protected (Bearer token required):
- `GET /api/dashboard/overview`
- `GET /api/dashboard/monitors`
- `GET /api/monitors`
- `POST /api/monitors`
- `PUT /api/monitors/:id`
- `DELETE /api/monitors/:id`
- `PATCH /api/monitors/:id/toggle`
- `GET /api/monitors/:id/details`
