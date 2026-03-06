# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use cache mount for npm
RUN --mount=type=cache,target=/root/.npm \
    npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
