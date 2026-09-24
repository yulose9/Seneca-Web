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

# nginx config: SPA fallback (react-router-dom), caching and security headers
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
