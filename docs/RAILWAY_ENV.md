# Railway Environment Variables

## Backend Variables

Добавьте следующие переменные окружения в Railway для Backend сервиса:

### Обязательные переменные

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database (Railway автоматически создаст PostgreSQL и предоставит DATABASE_URL)
DATABASE_URL=<автоматически из Railway PostgreSQL>
# Если DATABASE_URL указывает на postgres.railway.internal и не работает, используйте публичный URL:
DATABASE_PUBLIC_URL=postgresql://postgres:password@host.proxy.rlwy.net:port/railway

# Storage Provider (cloudinary, r2, or s3)
STORAGE_PROVIDER=cloudinary

# Cloudinary Configuration (рекомендуется)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=elemental-portal  # опционально, папка для файлов

# Cloudflare R2 Configuration (альтернатива)
# R2_ACCOUNT_ID=your_cloudflare_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key_id
# R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
# R2_BUCKET_NAME=your_bucket_name
# R2_PUBLIC_URL=https://your-bucket.r2.dev

# CORS - URL вашего Frontend (Railway или другой хостинг)
FRONTEND_URL=https://your-frontend-domain.com

# Nano Banana API Configuration
NANOBANANA_API_KEY=your_api_key_here
# Опционально, если endpoint отличается от стандартного
# NANOBANANA_API_URL=https://api.nanobanana.com
```

### Альтернативные провайдеры

**Cloudflare R2:**
```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**AWS S3 (для будущей миграции):**
```env
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your_s3_bucket_name
```

**Переключение между провайдерами:**
Просто измените `STORAGE_PROVIDER` и соответствующие переменные окружения. Код автоматически переключится на нужный адаптер.

## Frontend Variables

Для Frontend обычно не требуются переменные окружения, так как он использует proxy к Backend через Vite config.

Если вы деплоите Frontend отдельно, может понадобиться:

```env
VITE_API_URL=https://your-backend-domain.railway.app
```

## Инструкция по настройке в Railway

1. **Создайте PostgreSQL Database:**
   - В Railway Dashboard → New → Database → PostgreSQL
   - Railway автоматически создаст DATABASE_URL

2. **Создайте Backend Service:**
   - New → GitHub Repo → выберите репозиторий
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm run dev` (для разработки) или `npm start` (для production)

3. **Добавьте переменные окружения:**
   - В настройках сервиса → Variables
   - Добавьте все переменные из списка выше
   - Используйте DATABASE_URL из PostgreSQL сервиса

4. **Запустите миграции:**
   - После первого деплоя выполните миграции:
   ```bash
   railway run npx prisma migrate deploy
   railway run npx prisma db seed
   ```

5. **Создайте Frontend Service (если отдельно):**
   - New → GitHub Repo → тот же репозиторий
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`

## Примечания

- Railway автоматически предоставляет DATABASE_URL для PostgreSQL
- Убедитесь, что FRONTEND_URL соответствует реальному URL вашего Frontend
- R2_PUBLIC_URL должен быть публичным URL вашего Cloudflare R2 bucket
- После изменения переменных окружения Railway автоматически перезапустит сервис

