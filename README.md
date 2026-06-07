# PingSentinel - API + Website Monitoring App

Full-stack monitoring app with:
- Frontend: React + TailwindCSS
- Backend: Go + Fiber
- Database: SQLite
- Worker: Go poller + HTTP client
- Authentication: JWT
- Deployment: Docker Compose

## Features

- **User Authentication**: Secure user sign up/login with JWT-based auth.
- **Monitor Management**: Per-user monitor management (CRUD + enable/disable).
- **Flexible Request Types**: Supports monitor types: `website` / `api` with HTTP methods: `GET`, `POST`, `PUT`, `DELETE`.
- **Advanced Request Configuration**: Custom request headers, request bodies, and custom check intervals (from 5s up to 24h).
- **Response Validation**: Validates response status code, response time threshold, and response body content checking (`expected_body_contains`).
- **Real-time Alerting**: Sends Slack alerts via webhooks immediately on monitor status transition (UP ↔ DOWN).
- **Background Runner**: High-performance Go polling worker checking targets concurrently.
- **Metrics & History**: Automatic pruning of historical checks (configurable TTL) with database indices for rapid performance.
- **Dashboard Overview**: Summary statistics showing total, UP, and DOWN monitors, alongside average response times.
- **Interactive Details**: Detailed charts of status and response latency over time, along with access to the last 50 checks.

## Project Structure

- [backend](file:///d:/Projects/ping-sentinel/backend): Go + Fiber API service.
- [worker](file:///d:/Projects/ping-sentinel/worker): Go polling worker service that runs background checks and prunes history.
- [frontend](file:///d:/Projects/ping-sentinel/frontend): React + TailwindCSS + Vite single-page application.
- [backend/migrations/001_init.sql](file:///d:/Projects/ping-sentinel/backend/migrations/001_init.sql): Initial SQLite database schema.
- [docs/ping-sentinel-backend.postman_collection.json](file:///d:/Projects/ping-sentinel/docs/ping-sentinel-backend.postman_collection.json): Postman collection containing all REST API endpoints for quick testing.

## Development with Makefile

A [Makefile](file:///d:/Projects/ping-sentinel/Makefile) is provided as a shortcut for common development tasks:

| Command | Description |
| ------- | ----------- |
| `make install` | Install dependencies (Go modules and npm packages) |
| `make run` | Run all services (Backend, Worker, Frontend) locally in parallel |
| `make run-api` | Run the Backend API locally |
| `make run-worker` | Run the Worker service locally |
| `make run-web` | Run the Frontend React app locally |
| `make docker-up` | Build and start services using Docker Compose in background |
| `make docker-down` | Stop and remove Docker containers |
| `make docker-rebuild` | Rebuild and restart services |
| `make docker-push` | Build and push single-arch images to Docker Hub for all services |
| `make docker-multi-push SERVICE=<name>` | Build and push a multi-arch (amd64/arm64) image for a specific service |
| `make docker-multi-push-all` | Build and push multi-arch images for all services |
| `make tidy` | Run `go mod tidy` in backend and worker |
| `make clean` | Remove build artifacts and local SQLite database |

## Docker Hub Deployment

The [Makefile](file:///d:/Projects/ping-sentinel/Makefile) supports building and pushing images to Docker Hub. By default, it uses your system username as the Docker Hub namespace.

```bash
# Push single-arch images for all services
make docker-push DOCKER_USER=your_username VERSION=v1.0.0

# Push multi-arch images for a specific service (requires Docker Buildx)
make docker-multi-push SERVICE=backend DOCKER_USER=your_username VERSION=v1.0.0

# Push multi-arch images for all services (requires Docker Buildx)
make docker-multi-push-all DOCKER_USER=your_username VERSION=v1.0.0
```

## CI/CD Pipeline

A GitHub Actions workflow is provided (located in [.github/workflows/docker-publish.yml](file:///d:/Projects/ping-sentinel/.github/workflows/docker-publish.yml)) that automatically builds and pushes multi-architecture images whenever:
- A push is made to the `main` branch (tags as `:latest`).
- A version tag (e.g., `v1.2.3`) is pushed.
- A workflow is manually triggered via `workflow_dispatch`.
- A Pull Request to the `main` branch is opened or synchronized with the label `build`.

### Required Secrets

To use the automated pipeline, you must add the following **GitHub Secrets** to your repository:
- `DOCKERHUB_USERNAME`: Your Docker Hub username.
- `DOCKERHUB_TOKEN`: A Personal Access Token (PAT) from your Docker Hub account.

> [!TIP]
> Use a token with **Read & Write** permissions for security instead of your main password.

> [!NOTE]
> The frontend image is built using Nginx and supports dynamic environment variables. You can set `VITE_API_URL` in your `docker-compose.yml` to point to your backend API without rebuilding the image.


## Quick Start (Docker)

1. Build and start all services:

```bash
make docker-up
# or: docker compose up --build -d
```

2. Open the application:
- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/api/health

## Local Dev (without Docker)

Prerequisites:
- Go 1.23+
- Node 22+

1. Install all dependencies:
```bash
make install
```

2. Setup Environment Variables:

Create the environment config files in their respective folders:
- **Backend Env** ([backend/.env](file:///d:/Projects/ping-sentinel/backend/.env)):
  ```ini
  HOST=localhost
  PORT=8080
  DATABASE_URL=./monitoring.db
  JWT_SECRET=super_secret_jwt_key
  ALLOWED_ORIGIN=http://localhost:5173
  ```
- **Worker Env** ([worker/.env](file:///d:/Projects/ping-sentinel/worker/.env)):
  ```ini
  DATABASE_URL=../backend/monitoring.db
  WORKER_POLL_INTERVAL_SECONDS=30
  MONITOR_CHECK_TTL_DAYS=7
  ```
- **Frontend Env** ([frontend/.env](file:///d:/Projects/ping-sentinel/frontend/.env)):
  ```ini
  VITE_API_URL=http://localhost:8080/api
  ```

3. Run the services:

You can run all services concurrently:
```bash
make run
```
Or run them individually:
- **Backend**: `make run-api` (runs `go run ./cmd/server` in [backend](file:///d:/Projects/ping-sentinel/backend))
- **Worker**: `make run-worker` (runs `go run .` in [worker](file:///d:/Projects/ping-sentinel/worker))
- **Frontend**: `make run-web` (runs `npm run dev` in [frontend](file:///d:/Projects/ping-sentinel/frontend))

4. Database Schema:
- The backend Fiber service will automatically initialize and run any needed migrations on the SQLite database (`DATABASE_URL`) at startup using [backend/migrations/001_init.sql](file:///d:/Projects/ping-sentinel/backend/migrations/001_init.sql).

## Running Tests

Automated tests are available for the backend and the worker service.

### Backend Tests
```bash
cd backend
go test ./...
```

### Worker Tests
```bash
cd worker
go test ./...
```

## Manual Verification Checklist

- **Authentication**:
  - Sign up a new user.
  - Login with created credentials.
  - Verify monitors from another user are not visible.

- **Monitor CRUD & Configuration**:
  - Create a Website monitor and an API endpoint monitor.
  - Configure custom method (`GET`/`POST`/`PUT`/`DELETE`), request body, headers, and validation options like expected response status code, response time threshold, and body pattern matching (`expected_body_contains`).
  - Toggle a monitor's enabled/disabled state.
  - Update and delete a monitor.

- **Monitoring Execution & Alerts**:
  - Verify checks appear in the monitor details page within the configured interval.
  - Confirm status transitions to `DOWN` on invalid status codes, response timeouts, or missing body search patterns.
  - Verify Slack webhook alerts trigger on state changes (UP ↔ DOWN).
  - Confirm error messages are logged for failures/timeouts.

- **Dashboard / Details Visuals**:
  - Overview cards update total, up, down, and average response times.
  - Monitor table displays the last check status and calculated uptime percentage.
  - Details page charts show the latency and status history, listing the last 50 checks.

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
