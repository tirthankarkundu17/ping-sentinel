FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
# Use cache mount for Go modules
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
# Use cache mount for Go build cache and modules
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -o api ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/api /app/api
COPY migrations ./migrations
EXPOSE 8080
CMD ["/app/api"]
