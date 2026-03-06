#!/bin/sh
# This script replaces environment variables in the built React files at runtime.
# It allows us to set VITE_API_URL via docker-compose environment variables.

set -e

# Default value if not set
if [ -z "$VITE_API_URL" ]; then
  VITE_API_URL="http://localhost:8080/api"
fi

echo "Setting VITE_API_URL to $VITE_API_URL"

# Find all JS files in the static directory and replace the placeholder
# We use a unique placeholder that we'll inject during the build phase.
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|__VITE_API_URL_PLACEHOLDER__|${VITE_API_URL}|g" {} +

# Start Nginx
exec nginx -g "daemon off;"
