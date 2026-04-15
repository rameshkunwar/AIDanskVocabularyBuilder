# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./

RUN npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Build argument for the API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

# Build the production bundle
RUN npm run build

# ============================================
# Stage 3: Serve with Nginx
# ============================================
FROM nginx:stable-alpine AS production

# Copy custom Nginx config for SPA routing
COPY --from=build /app/dist /usr/share/nginx/html

# Add Nginx config that handles SPA client-side routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Cache static assets aggressively
    location ~* \.(?:css|js|svg|woff2?|ttf|eot|ico|webp|png|jpg|jpeg|gif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }    
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
