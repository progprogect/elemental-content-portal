# Elemental Content Creation Portal

Веб-платформа для управления контент-планом и генерации маркетингового контента через интеграцию с AI-сервисами.

## Структура проекта

```
Elemental Content Creation Portal/
├── docs/              # Вся документация
├── frontend/          # React приложение
├── backend/           # Node.js API
├── extension/         # Browser Extension (Chrome/Edge)
└── tests/             # Тесты (если будут)
```

**Важно:** Вся документация должна храниться в папке `docs/`. Тесты - в папке `tests/`.

## Быстрый старт

### Требования

- Node.js 20+
- PostgreSQL 15+
- npm или yarn

### Установка

1. Клонировать репозиторий
2. Установить зависимости:

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

3. Настроить переменные окружения:

```bash
# Backend
cp backend/.env.example backend/.env
# Заполнить переменные окружения
```

4. Запустить миграции БД:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. Запустить приложение:

```bash
# Backend (терминал 1)
cd backend
npm run dev

# Frontend (терминал 2)
cd frontend
npm run dev
```

## Разработка

### Backend

- API сервер: `http://localhost:3000`
- Prisma Studio: `npx prisma studio`

### Frontend

- Dev сервер: `http://localhost:5173`
- Сборка: `npm run build`

### Extension

- Загрузить в Chrome через `chrome://extensions/` в режиме разработчика
- Путь к расширению: `extension/`

## Документация

**Важно:** Вся документация хранится в папке `docs/`. Тесты - в папке `tests/`.

- [Архитектура](docs/ARCHITECTURE.md) - полное описание архитектуры системы
- [Настройка](docs/SETUP.md) - детальные инструкции по развертыванию
- [Contributing](docs/CONTRIBUTING.md) - правила разработки и структуры проекта

## Технологии

- **Frontend:** React 18+, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Extension:** Manifest V3, TypeScript
- **Storage:** Cloudflare R2 (текущее) / AWS S3 (будущее)

## Лицензия

Proprietary

