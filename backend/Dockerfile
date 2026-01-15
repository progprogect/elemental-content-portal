# Use Node.js LTS version
FROM node:20-alpine AS base

# Install OpenSSL, libc6-compat for Prisma, FFmpeg for video processing,
# and build dependencies for canvas (Python, make, g++, cairo, pango, etc.)
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    ffmpeg \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for backend
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma ./prisma/

# Copy scene-generation-service package files
COPY scene-generation-service/package.json scene-generation-service/package-lock.json* ./scene-generation-service/
COPY scene-generation-service/src/database/prisma ./scene-generation-service/src/database/prisma/

# Install backend dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Install scene-generation-service dependencies
WORKDIR /app/scene-generation-service
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
WORKDIR /app

# Build the application
FROM base AS builder
WORKDIR /app

# Copy backend files
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/prisma ./prisma/
COPY backend/src ./src/
COPY backend/tsconfig.json ./

# Copy scene-generation-service files
COPY --from=deps /app/scene-generation-service/node_modules ./scene-generation-service/node_modules
COPY scene-generation-service/package.json ./scene-generation-service/
COPY scene-generation-service/src ./scene-generation-service/src/
COPY scene-generation-service/tsconfig.json ./scene-generation-service/

# Build scene-generation-service first
WORKDIR /app/scene-generation-service
RUN npm run build || echo "Scene generation service build failed - continuing anyway"

# Build backend TypeScript
WORKDIR /app
RUN npm run build

# Build Frontend
FROM base AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY frontend/ ./
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install runtime libraries for canvas (without dev dependencies)
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=frontend-builder /app/frontend/dist ./public
# Copy scene-generation-service dist for runtime
COPY --from=builder /app/scene-generation-service/dist ./scene-generation-service/dist
COPY --from=builder /app/scene-generation-service/node_modules ./scene-generation-service/node_modules
COPY --from=builder /app/scene-generation-service/package.json ./scene-generation-service/

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]

