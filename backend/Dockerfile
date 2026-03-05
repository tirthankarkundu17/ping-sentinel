FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api ./cmd/server


FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/api /app/api
COPY migrations ./migrations

EXPOSE 8080
CMD ["/app/api"]
