# Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn
- Cloudflare R2 account (for file storage) or AWS S3

## Installation

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Extension
cd ../extension
npm install
```

### 2. Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE elemental_portal;
```

2. Configure database URL in `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/elemental_portal?schema=public"
```

3. Run migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

### 3. Storage Configuration

#### Cloudflare R2 (Current)

1. Create R2 bucket in Cloudflare dashboard
2. Get credentials: Account ID, Access Key ID, Secret Access Key
3. Configure in `backend/.env`:
```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

#### AWS S3 (Future)

```env
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
```

### 4. Backend Configuration

Create `backend/.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://..."
STORAGE_PROVIDER=r2
# ... storage config ...
FRONTEND_URL=http://localhost:5173
```

### 5. Frontend Configuration

Frontend uses proxy to backend (configured in `vite.config.ts`). No additional config needed.

### 6. Extension Setup

1. Build extension:
```bash
cd extension
npm run build
```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/` folder

## Running the Application

### Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

### Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ folder with your web server
```

## Project Structure

```
Elemental Content Creation Portal/
├── docs/              # Documentation (all docs go here)
├── frontend/          # React application
├── backend/           # Node.js API
├── extension/         # Browser Extension
└── tests/             # Tests (if any)
```

**Important:** All documentation should be placed in `docs/` folder. Tests go in `tests/` folder.

## Troubleshooting

### Database Connection Issues

- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Ensure database exists

### Storage Issues

- Verify R2/S3 credentials
- Check bucket permissions
- Ensure public URL is configured correctly

### Extension Not Working

- Check extension is loaded in Chrome
- Verify manifest.json is valid
- Check browser console for errors

