# Scene Generation Service

Microservice for generating video scenes from text prompts and resources.

## Overview

This service implements a multi-phase pipeline for scene generation:
- **Phase 0**: Resource Understanding (analyzes videos, images, references)
- **Phase 1**: Scenario Generation (creates timeline and scene descriptions)
- **Phase 2**: Scene Project Construction (prepares render configs)
- **Phase 3**: Scene Pipelines (renders individual scenes)
- **Phase 4**: Final Composition (combines scenes into final video)

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis (for BullMQ job queue)
- FFmpeg (for video processing, TODO)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy `.env.example` to `.env`):
```bash
cp .env.example .env
```

3. Set up database:
```bash
npm run prisma:migrate
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

## Development

Run in development mode:
```bash
npm run dev
```

The service will start on `http://localhost:3001`

## API Documentation

Swagger UI is available at `/api-docs` when the service is running.

## Architecture

- **Express.js** for HTTP API
- **Prisma** for database access
- **BullMQ** for async job processing
- **@elemental-content/shared-ai-lib** for AI operations
- **Pino** for structured logging

## Environment Variables

See `.env.example` for required environment variables.

## Docker

Use `docker-compose.yml` for local development with Redis and PostgreSQL:

```bash
docker-compose up -d
```

## Health Check

Health check endpoint: `GET /health`

