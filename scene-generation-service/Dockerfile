# Use Node.js LTS version
FROM node:20-alpine AS base

# Install OpenSSL, libc6-compat for Prisma, and FFmpeg for video processing
RUN apk add --no-cache openssl libc6-compat ffmpeg

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY scene-generation-service/package.json scene-generation-service/package-lock.json* ./
COPY scene-generation-service/src/database/prisma ./src/database/prisma/
COPY packages/shared-ai-lib ./packages/shared-ai-lib/

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY scene-generation-service/package.json ./
COPY scene-generation-service/tsconfig.json ./
COPY scene-generation-service/src ./src/
COPY scene-generation-service/src/database/prisma ./src/database/prisma/
COPY packages/shared-ai-lib ./packages/shared-ai-lib/

# Build TypeScript
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Verify FFmpeg is available
RUN ffmpeg -version || (echo "FFmpeg not found!" && exit 1)

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/database/prisma ./src/database/prisma

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]

