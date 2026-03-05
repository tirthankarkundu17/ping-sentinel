# Makefile for ping-sentinel

# Docker Hub Configuration
DOCKER_USER ?= $(USER)
VERSION ?= latest
PLATFORMS ?= linux/amd64,linux/arm64

.PHONY: all install run-api run-worker run-web docker-up docker-down docker-rebuild docker-push docker-multi-push backend-tidy worker-tidy tidy clean


# Default target
all: install build

# Setup and dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "Installing worker dependencies..."
	cd worker && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Running services locally (without Docker)
run-api:
	@echo "Starting Backend API..."
	cd backend && go run ./cmd/server

run-worker:
	@echo "Starting Worker..."
	cd worker && go run .

run-web:
	@echo "Starting Frontend..."
	cd frontend && npm run dev

# Docker operations
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-rebuild:
	docker compose up --build -d

# Docker Hub - Single Architecture
docker-push:
	@echo "Building and pushing single-platform images to $(DOCKER_USER)..."
	docker build -t $(DOCKER_USER)/ping-sentinel-backend:$(VERSION) ./backend && docker push $(DOCKER_USER)/ping-sentinel-backend:$(VERSION)
	docker build -t $(DOCKER_USER)/ping-sentinel-worker:$(VERSION) ./worker && docker push $(DOCKER_USER)/ping-sentinel-worker:$(VERSION)
	docker build -t $(DOCKER_USER)/ping-sentinel-frontend:$(VERSION) ./frontend && docker push $(DOCKER_USER)/ping-sentinel-frontend:$(VERSION)

# Docker Hub - Multi Architecture (using Buildx)
docker-multi-push:
	@echo "Creating and using a buildx builder for multi-platform builds..."
	-docker buildx create --use --name sentinel-builder
	@echo "Building and pushing multi-platform ($(PLATFORMS)) images to $(DOCKER_USER)..."
	docker buildx build --platform $(PLATFORMS) -t $(DOCKER_USER)/ping-sentinel-backend:$(VERSION) ./backend --push
	docker buildx build --platform $(PLATFORMS) -t $(DOCKER_USER)/ping-sentinel-worker:$(VERSION) ./worker --push
	docker buildx build --platform $(PLATFORMS) -t $(DOCKER_USER)/ping-sentinel-frontend:$(VERSION) ./frontend --push
	@echo "Cleaning up buildx builder..."
	docker buildx rm sentinel-builder

# Maintenance
backend-tidy:
	cd backend && go mod tidy

worker-tidy:
	cd worker && go mod tidy

tidy: backend-tidy worker-tidy

clean:
	@echo "Cleaning up..."
	@if [ -d "backend/tmp" ]; then rm -rf backend/tmp; fi
	@if [ -f "backend/monitoring.db" ]; then rm -f backend/monitoring.db; fi
	@if [ -f "worker/worker.exe" ]; then rm -f worker/worker.exe; fi
	@echo "Cleanup complete."

