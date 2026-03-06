# Use the native platform for the build stage to avoid emulation slowness
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder

# These arguments are automatically populated by Docker Buildx
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY go.mod go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .

# Use the native Go compiler but cross-compile to the target architecture
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o api ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/api /app/api
COPY migrations ./migrations
EXPOSE 8080
CMD ["/app/api"]
