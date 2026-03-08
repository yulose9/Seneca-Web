# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
# Serve the Vite dist/ with nginx on port 8080 (required by Cloud Run)
FROM nginx:alpine

# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: serve SPA with HTML5 History API support
# All routes fall back to index.html (required for react-router-dom)
RUN echo 'server { \
  listen 8080; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  # Cache static assets with hashed filenames for 1 year \
  location ~* \.(js|css|woff2|woff|png|jpg|svg|ico|webp|avif)$ { \
    expires 1y; \
    add_header Cache-Control "public, max-age=31536000, immutable"; \
  } \
  # Never cache HTML \
  location = /index.html { \
    add_header Cache-Control "no-cache, must-revalidate"; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
