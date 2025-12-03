# Content Creation Portal - Архитектурный документ

## 📋 Оглавление
1. [Обзор системы](#обзор-системы)
2. [Архитектура](#архитектура)
3. [Структура данных](#структура-данных)
4. [Пользовательские сценарии](#пользовательские-сценарии)
5. [Интеграции](#интеграции)
6. [UI/UX концепция](#uiux-концепция)
7. [Технический стек](#технический-стек)
8. [Риски и митигация](#риски-и-митигация)

---

## 🎯 Обзор системы

**Elemental Content Creation Portal** — веб-платформа для управления контент-планом и генерации маркетингового контента через интеграцию с AI-сервисами.

### Ключевые функции (MVP)
- ✅ Управление задачами в табличном формате (контент-план)
- ✅ Динамические поля в таблице (текст, файлы, ссылки, чекбоксы)
- ✅ Генерация видеороликов через Haygen AI Content Creator
- ✅ Ручное выполнение задач (загрузка контента/ссылок без генерации)
- ✅ Прикрепление результатов к задачам (ссылка + ассет, опционально)
- ✅ Адаптивный интерфейс для мобильных устройств

### Будущие функции (не в MVP)
- Генерация изображений через NanoBanana
- Генерация говорящей головы через Haygen ImageToVideo
- Другие типы контента (текст, презентация)

---

## 🏗 Архитектура

### Общая схема

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Table View  │  │  Task Form   │  │  Results     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tasks API  │  │  Prompt Gen  │  │ Storage      │      │
│  │              │  │              │  │ Adapter      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │ Cloudflare R2│  │  Browser     │
│   Database   │  │   (→ S3)     │  │  Extension   │
└──────────────┘  └──────────────┘  └──────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  Haygen AI     │
                                    │  Content Creator│
                                    └─────────────────┘
```

### Компоненты системы

#### 1. Frontend (React SPA)
- **Таблица задач**: Основной интерфейс управления контент-планом
- **Формы создания/редактирования**: Управление задачами и полями
- **Интеграция с расширением**: Коммуникация через postMessage API
- **Адаптивный дизайн**: Mobile-first подход

#### 2. Backend API (Node.js + Express)
- **REST API**: CRUD операции для задач
- **Генерация промптов**: Создание промптов на основе данных задачи
- **Storage Adapter**: Абстракция для файлового хранилища (Cloudflare R2 / S3)
- **Интеграция с расширением**: WebSocket/SSE для real-time коммуникации
- **Ручное выполнение**: Поддержка загрузки результатов без генерации

#### 3. База данных (PostgreSQL)
- **Реляционная структура**: Пользователи, задачи, поля, результаты
- **JSONB поддержка**: Гибкое хранение динамических данных полей

#### 4. Browser Extension (Chrome/Edge)
- **Подготовка данных**: Получение промпта и ассетов из портала
- **Передача данных в Haygen**: Автоматическое заполнение или redirect с данными
- **Перехват результатов**: Отслеживание действий пользователя в Haygen (Save/Share)
- **Отправка результатов**: Передача публичной ссылки и ссылки на скачивание обратно в портал

---

## 📊 Структура данных

### ER-диаграмма

```
┌─────────────┐
│   Users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ name        │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│   Tasks     │
├─────────────┤
│ id (PK)     │
│ user_id (FK)│
│ title       │
│ content_type│
│ status      │
│ created_at  │
│ updated_at  │
└──────┬──────┘
       │
       │ 1:N        │ 1:N
       ▼            ▼
┌─────────────┐  ┌─────────────┐
│ Task Fields │  │  Results    │
├─────────────┤  ├─────────────┤
│ id (PK)     │  │ id (PK)     │
│ task_id (FK)│  │ task_id (FK)│
│ field_name  │  │ link_url    │
│ field_type  │  │ asset_path  │
│ field_value │  │ created_at  │
│ order_index │  └─────────────┘
└─────────────┘
```

### Схемы таблиц

#### `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `tasks`
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'video', 'image', 'talking_head', 'text', 'presentation'
    execution_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'generated' (способ выполнения задачи)
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_execution_type (execution_type)
);
```

**Примечание:**
- `execution_type = 'manual'`: Задача выполнена вручную (пользователь загрузил контент/ссылку)
- `execution_type = 'generated'`: Задача выполнена через AI-генерацию (Haygen и т.д.)

#### `task_fields`
```sql
CREATE TABLE task_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'file', 'url', 'checkbox'
    field_value JSONB, -- Гибкое хранение значения
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_task_id (task_id),
    INDEX idx_order (task_id, order_index)
);
```

**Примеры `field_value` (JSONB):**
- `text`: `{"value": "Описание задачи"}`
- `file`: `{"filename": "image.jpg", "path": "/uploads/...", "size": 1024}`
- `url`: `{"value": "https://example.com"}`
- `checkbox`: `{"checked": true}`

#### `task_results`
```sql
CREATE TABLE task_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    result_url VARCHAR(1000), -- Публичная ссылка на результат (share link, опционально)
    download_url VARCHAR(1000), -- Ссылка для скачивания файла (опционально)
    asset_path VARCHAR(1000), -- Путь к файлу в нашем хранилище (если файл скачан, опционально)
    asset_url VARCHAR(1000), -- Публичный URL файла в нашем хранилище (опционально)
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'haygen', 'nanobanana', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_task_id (task_id),
    INDEX idx_source (source)
);
```

**Примечание:**
- `result_url`: Публичная ссылка на результат (например, `https://haygen.com/share/abc123` для Haygen)
- `download_url`: Ссылка для скачивания файла с внешнего сервиса (например, `https://haygen.com/download/abc123`)
- `asset_path`: Внутренний путь к файлу в нашем хранилище (если файл был скачан и сохранен локально)
- `asset_url`: Публичный URL для доступа к файлу в нашем хранилище (генерируется Storage Adapter)
- `source`: Источник результата ('manual' для ручной загрузки, 'haygen' для генерации через Haygen)

**Сценарии использования:**
- **Haygen генерация:** `result_url` + `download_url` (файл остается на Haygen, но доступен для скачивания)
- **Haygen + локальное сохранение:** `result_url` + `download_url` + `asset_path` + `asset_url` (файл также скачан и сохранен локально)
- **Ручная загрузка:** `result_url` (если ссылка) или `asset_path` + `asset_url` (если файл)

#### `content_type_configs`
```sql
CREATE TABLE content_type_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) UNIQUE NOT NULL,
    generator_service VARCHAR(100), -- 'haygen', 'nanobanana', etc.
    generator_type VARCHAR(100), -- 'video', 'image_to_video', etc.
    prompt_template TEXT, -- Шаблон промпта
    required_fields JSONB, -- Обязательные поля для типа
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Пример конфигурации для видеоролика:**
```json
{
  "content_type": "video",
  "generator_service": "haygen",
  "generator_type": "video",
  "prompt_template": "Create a video about: {description}. Style: {style}. Duration: {duration}.",
  "required_fields": ["description", "style"]
}
```

---

## 👤 Пользовательские сценарии

### Сценарий 1: Создание задачи на генерацию видеоролика

1. **Пользователь открывает портал**
   - Видит таблицу с существующими задачами
   - Нажимает "Создать задачу" или "+"

2. **Заполнение базовой информации**
   - Вводит название задачи
   - Выбирает тип контента: "Видеоролик"
   - Система показывает стандартные поля для видеоролика

3. **Добавление динамических полей**
   - Пользователь видит стандартные поля: "Описание", "Стиль", "Длительность"
   - Может добавить новое поле через кнопку "+"
   - Выбирает тип поля: текст/файл/ссылка/чекбокс
   - Задает название поля
   - Заполняет значение

4. **Загрузка ассетов**
   - Пользователь загружает необходимые файлы (изображения, видео)
   - Файлы сохраняются в хранилище

5. **Сохранение задачи**
   - Задача сохраняется со статусом "draft"
   - Появляется в таблице

### Сценарий 2: Генерация контента через Haygen

1. **Инициация генерации**
   - Пользователь открывает задачу
   - Нажимает "Сгенерировать контент"
   - Система проверяет наличие Browser Extension

2. **Подготовка данных**
   - Backend собирает все поля задачи
   - Генерирует промпт на основе шаблона и данных
   - Подготавливает список ассетов (публичные URL файлов из хранилища)

3. **Передача данных в расширение**
   - Frontend отправляет данные расширению через `postMessage`
   - Расширение сохраняет `taskId` и данные локально
   - Расширение готовит данные для Haygen

4. **Redirect на Haygen**
   - **Вариант A:** Frontend делает redirect на Haygen с данными в URL параметрах
   - **Вариант B:** Расширение открывает новую вкладку с Haygen и автоматически заполняет данные
   - **Вариант C:** Промпт копируется в буфер обмена, пользователь вручную вставляет в Haygen
   - Ассеты доступны по публичным URL, которые можно загрузить в Haygen

5. **Работа пользователя в Haygen**
   - Пользователь авторизуется в Haygen (если необходимо)
   - Видит предзаполненные данные (промпт и ассеты)
   - Редактирует промпт, настраивает параметры генерации
   - Запускает генерацию видео
   - Просматривает результат

6. **Сохранение результата**
   - После завершения генерации пользователь нажимает "Save" или "Share" в Haygen
   - Browser Extension перехватывает действие:
     - Получает публичную ссылку на результат (share link)
     - Получает ссылку для скачивания файла (download link)
   - Расширение отправляет данные обратно в портал через `postMessage`

7. **Обработка результата в портале**
   - Frontend получает данные от расширения
   - Отправляет запрос на Backend: `POST /api/tasks/:id/results`
   - Backend сохраняет:
     - Публичную ссылку в `task_results.link_url`
     - Опционально: скачивает файл и сохраняет в хранилище (`task_results.asset_path`)
   - Обновляет статус задачи на "completed"
   - Обновляет `execution_type` на "generated"
   - Пользователь видит результат в интерфейсе задачи

**Альтернативный вариант (если расширение не перехватывает автоматически):**
- Расширение добавляет кнопку "Save to Portal" на страницу Haygen
- Пользователь нажимает эту кнопку после завершения генерации
- Результаты сохраняются так же, как описано выше

### Сценарий 3: Ручное выполнение задачи (загрузка результата)

1. **Создание задачи**
   - Пользователь создает задачу как обычно
   - Заполняет поля и загружает ассеты (если необходимо)
   - Сохраняет задачу

2. **Ручное выполнение**
   - Пользователь открывает задачу
   - Видит два варианта: "Сгенерировать контент" или "Добавить результат вручную"
   - Выбирает "Добавить результат вручную"

3. **Загрузка результата**
   - **Вариант A: Загрузка файла**
     - Пользователь нажимает "Загрузить файл"
     - Выбирает файл с устройства
     - Файл загружается в хранилище через Storage Adapter
     - Система сохраняет путь к файлу в `task_results`
   
   - **Вариант B: Добавление ссылки**
     - Пользователь нажимает "Добавить ссылку"
     - Вводит URL результата
     - Система сохраняет ссылку в `task_results`

4. **Сохранение результата**
   - Backend сохраняет результат в `task_results` с `source = 'manual'`
   - Обновляет статус задачи на "completed"
   - Обновляет `execution_type` на "manual"
   - Пользователь видит результат в интерфейсе задачи

5. **Комбинированный вариант**
   - Пользователь может добавить и ссылку, и файл одновременно
   - Оба сохраняются как опциональные поля

### Сценарий 4: Работа с таблицей на мобильном устройстве

1. **Адаптивный интерфейс**
   - Таблица преобразуется в карточки на маленьких экранах
   - Горизонтальная прокрутка для широких таблиц
   - Swipe-жесты для действий (удаление, редактирование)

2. **Создание задачи**
   - Модальное окно на весь экран
   - Пошаговая форма с навигацией

3. **Просмотр задачи**
   - Карточка с детальной информацией
   - Вертикальная прокрутка для полей
   - Кнопка генерации внизу экрана

---

## 🔌 Интеграции

### Haygen AI Content Creator (через Browser Extension)

**Важно:** Haygen AI Content Creator не предоставляет API для генерации контента. Интеграция происходит через redirect пользователя на платформу Haygen с автоматической подгрузкой данных, а результаты перехватываются через Browser Extension.

#### Архитектура интеграции

```
Frontend (Portal)
    │
    │ 1. Генерация промпта и подготовка данных
    │ 2. Redirect на Haygen с данными в URL
    ▼
Haygen Platform (в браузере)
    │
    │ Пользователь работает в Haygen
    │ (редактирует, настраивает, генерирует)
    ▼
Browser Extension
    │
    │ Перехват результатов при сохранении/поделиться
    │ (публичная ссылка + файл для скачивания)
    ▼
Frontend (Portal)
    │
    │ HTTP POST /api/tasks/:id/results
    ▼
Backend API
```

#### Механизм передачи данных в Haygen

**Вариант 1: URL Parameters (если поддерживается Haygen)**
```javascript
// Frontend генерирует URL с данными
const haygenUrl = new URL('https://haygen.com/create');
haygenUrl.searchParams.set('prompt', encodeURIComponent(prompt));
haygenUrl.searchParams.set('assets', JSON.stringify(assets));
haygenUrl.searchParams.set('callback', `${portalUrl}/api/haygen/callback?taskId=${taskId}`);

// Redirect пользователя
window.location.href = haygenUrl.toString();
```

**Вариант 2: Deep Link через Extension**
```javascript
// Frontend отправляет данные расширению
window.postMessage({
  type: 'HAYGEN_PREPARE',
  payload: {
    taskId: 'uuid',
    prompt: 'Generated prompt text',
    assets: [
      { type: 'image', url: 'https://...', filename: 'image.jpg' },
      { type: 'video', url: 'https://...', filename: 'video.mp4' }
    ]
  }
}, '*');

// Extension открывает Haygen и автоматически заполняет данные
// (через инъекцию скрипта или clipboard API)
```

**Вариант 3: Clipboard + Redirect**
```javascript
// Копирование промпта в буфер обмена
await navigator.clipboard.writeText(prompt);

// Redirect на Haygen
window.open('https://haygen.com/create', '_blank');

// Инструкция пользователю: "Промпт скопирован, вставьте его в Haygen"
```

#### Перехват результатов через Browser Extension

**Расширение отслеживает действия пользователя в Haygen:**

```javascript
// Content Script в расширении отслеживает страницу Haygen
// Когда пользователь нажимает "Save" или "Share":

// 1. Перехват публичной ссылки
const shareLink = document.querySelector('[data-share-link]')?.href;
const downloadLink = document.querySelector('[data-download-link]')?.href;

// 2. Отправка данных обратно в портал
window.postMessage({
  type: 'HAYGEN_RESULT',
  payload: {
    taskId: getTaskIdFromStorage(), // Сохранен при redirect
    resultUrl: shareLink, // Публичная ссылка на результат
    downloadUrl: downloadLink, // Ссылка для скачивания файла
    status: 'success'
  }
}, '*');
```

**Альтернативный подход: Content Script инжектит кнопку "Save to Portal"**

```javascript
// Расширение добавляет кнопку на страницу Haygen
const saveButton = document.createElement('button');
saveButton.textContent = 'Save to Portal';
saveButton.onclick = async () => {
  const shareLink = getShareLink();
  const downloadUrl = await getDownloadUrl();
  
  // Отправка в портал
  window.postMessage({
    type: 'HAYGEN_RESULT',
    payload: {
      taskId: getTaskIdFromStorage(),
      resultUrl: shareLink,
      downloadUrl: downloadUrl,
      status: 'success'
    }
  }, '*');
};

// Добавление кнопки в интерфейс Haygen
document.querySelector('.haygen-actions').appendChild(saveButton);
```

#### Протокол коммуникации

**Frontend → Extension (подготовка данных):**
```javascript
// Инициация генерации
window.postMessage({
  type: 'HAYGEN_PREPARE',
  payload: {
    taskId: 'uuid',
    prompt: 'Generated prompt text',
    assets: [
      { type: 'image', url: 'https://portal.com/files/image.jpg', filename: 'image.jpg' },
      { type: 'video', url: 'https://portal.com/files/video.mp4', filename: 'video.mp4' }
    ],
    callbackUrl: 'https://portal.com/api/haygen/callback'
  }
}, '*');
```

**Extension → Frontend (результат):**
```javascript
// Результат генерации (после работы пользователя в Haygen)
window.postMessage({
  type: 'HAYGEN_RESULT',
  payload: {
    taskId: 'uuid',
    resultUrl: 'https://haygen.com/share/abc123', // Публичная ссылка
    downloadUrl: 'https://haygen.com/download/abc123', // Ссылка для скачивания файла
    status: 'success' | 'error',
    error: 'error message' // если status === 'error'
  }
}, '*');
```

**Frontend → Backend (сохранение результата):**
```javascript
// После получения результата от расширения
POST /api/tasks/:taskId/results
{
  "resultUrl": "https://haygen.com/share/abc123",      // Публичная ссылка
  "downloadUrl": "https://haygen.com/download/abc123", // Ссылка для скачивания
  "source": "haygen"
}

// Backend сохраняет данные в task_results:
// - result_url = публичная ссылка
// - download_url = ссылка на скачивание
// - Опционально: скачивает файл и сохраняет в хранилище (asset_path + asset_url)
```

#### Детальный процесс интеграции

**Шаг 1: Подготовка данных в портале**
1. Пользователь нажимает "Сгенерировать контент"
2. Backend генерирует промпт на основе полей задачи
3. Backend подготавливает публичные URL для всех ассетов (изображения, видео)
4. Frontend отправляет данные в Browser Extension через `postMessage`

**Шаг 2: Передача данных в Haygen**
1. Browser Extension получает данные (промпт + ассеты)
2. Сохраняет `taskId` локально для последующего связывания результата
3. Открывает новую вкладку с Haygen или делает redirect
4. **Варианты передачи данных:**
   - **URL параметры** (если Haygen поддерживает): `?prompt=...&assets=...`
   - **Clipboard**: Копирование промпта в буфер, пользователь вставляет вручную
   - **Инжекция скрипта**: Расширение автоматически заполняет поля в Haygen через DOM манипуляции

**Шаг 3: Работа пользователя в Haygen**
1. Пользователь видит предзаполненные данные (или вставляет промпт из буфера)
2. Загружает ассеты по предоставленным URL
3. Настраивает параметры генерации
4. Запускает генерацию видео
5. Просматривает результат

**Шаг 4: Перехват результатов**
1. Browser Extension отслеживает страницу Haygen через Content Script
2. Когда пользователь нажимает "Save" или "Share":
   - Расширение извлекает публичную ссылку (share link)
   - Расширение извлекает ссылку на скачивание (download link)
3. **Альтернатива**: Расширение добавляет кнопку "Save to Portal" на страницу Haygen
   - Пользователь нажимает эту кнопку после завершения генерации
   - Расширение получает ссылки и отправляет в портал

**Шаг 5: Сохранение в портале**
1. Browser Extension отправляет данные в портал через `postMessage`
2. Frontend получает данные и отправляет на Backend
3. Backend сохраняет:
   - Публичную ссылку (`result_url`)
   - Ссылку на скачивание (`download_url`)
   - Опционально: скачивает файл и сохраняет в хранилище
4. Обновляет статус задачи на "completed"
5. Пользователь видит результат в интерфейсе задачи

#### Fallback механизмы

Если Browser Extension не установлен или не работает:
1. Пользователь может вручную скопировать ссылку из Haygen
2. Вернуться в портал и добавить результат вручную через кнопку "Add Result"
3. Вставить публичную ссылку и/или загрузить файл

Если перехват результатов не сработал:
1. Расширение показывает уведомление пользователю
2. Пользователь может вручную скопировать ссылку и добавить в портал
3. Или использовать кнопку "Save to Portal", если она была добавлена расширением

#### Генерация промпта

**Шаблон для видеоролика:**
```
Create a marketing video with the following requirements:

Description: {description}
Style: {style}
Duration: {duration}
Target Audience: {target_audience}

Additional context:
{additional_fields}
```

**Логика генерации (Backend):**
```javascript
function generatePrompt(task, config) {
  let prompt = config.prompt_template;
  
  // Замена стандартных полей
  task.fields.forEach(field => {
    const placeholder = `{${field.field_name}}`;
    if (prompt.includes(placeholder)) {
      prompt = prompt.replace(placeholder, field.field_value.value);
    }
  });
  
  // Добавление дополнительных полей
  const additionalFields = task.fields
    .filter(f => !config.required_fields.includes(f.field_name))
    .map(f => `${f.field_name}: ${f.field_value.value}`)
    .join('\n');
  
  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }
  
  return prompt;
}
```

### Storage Adapter (Абстракция файлового хранилища)

#### Архитектура адаптера

Для обеспечения возможности переключения между Cloudflare R2 и AWS S3 используется паттерн Adapter:

```typescript
interface StorageAdapter {
  upload(file: Buffer, filename: string, path?: string): Promise<StorageResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
}

interface StorageResult {
  path: string;
  url: string;
  size: number;
}
```

#### Реализации

**Cloudflare R2 Adapter (текущее):**
```typescript
class CloudflareR2Adapter implements StorageAdapter {
  private client: S3Client;
  
  constructor(config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  }) {
    // Инициализация R2 клиента (S3-совместимый API)
  }
  
  async upload(file: Buffer, filename: string): Promise<StorageResult> {
    // Загрузка в R2 через S3 API
  }
}
```

**AWS S3 Adapter (будущее):**
```typescript
class AwsS3Adapter implements StorageAdapter {
  private client: S3Client;
  
  constructor(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  }) {
    // Инициализация AWS S3 клиента
  }
  
  async upload(file: Buffer, filename: string): Promise<StorageResult> {
    // Загрузка в S3
  }
}
```

#### Конфигурация через переменные окружения

```env
# Текущее (Railway + Cloudflare R2)
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Будущее (AWS + S3)
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
```

#### Переключение между провайдерами

Переключение происходит через переменную окружения `STORAGE_PROVIDER`:

```typescript
function createStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || 'r2';
  
  switch (provider) {
    case 'r2':
      return new CloudflareR2Adapter({
        accountId: process.env.R2_ACCOUNT_ID!,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        bucketName: process.env.R2_BUCKET_NAME!,
      });
    
    case 's3':
      return new AwsS3Adapter({
        region: process.env.AWS_REGION!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        bucketName: process.env.S3_BUCKET_NAME!,
      });
    
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}
```

### Будущие интеграции (не в MVP)

- **NanoBanana**: Генерация изображений
- **Haygen ImageToVideo**: Генерация говорящей головы

---

## 🎨 UI/UX концепция

### Референсы и паттерны

Изучены интерфейсы:
- **Notion**: Гибкая таблица с динамическими полями
- **Airtable**: Табличный интерфейс с типами полей
- **Monday.com**: Управление задачами в таблице

### Ключевые принципы

1. **Простота**: Минимум элементов, максимум функциональности
2. **Привычность**: Табличный интерфейс как основной паттерн
3. **Гибкость**: Динамические поля без ограничений
4. **Мобильность**: Адаптивный дизайн с приоритетом на мобильные устройства

### Компоненты интерфейса

#### 1. Таблица задач (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ Content Creation Portal                    [+ New Task] [Filter] │
├──────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ Title│ Content Type │   Status     │   Created    │   Actions   │
├──────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ Task1│ Video        │ In Progress  │ 2024-01-15   │ [Edit] [⚙️] │
│ Task2│ Image        │ Draft        │ 2024-01-14   │ [Edit] [⚙️] │
└──────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

#### 2. Таблица задач (Mobile)

```
┌─────────────────────────────┐
│ [+ New Task]                │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Task 1                   │ │
│ │ Video • In Progress      │ │
│ │ [View] [Generate]        │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Task 2                   │ │
│ │ Image • Draft            │ │
│ │ [View] [Generate]        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### 3. Форма создания/редактирования задачи

```
┌─────────────────────────────────────┐
│ Create Task                          │
├─────────────────────────────────────┤
│ Title: [________________________]   │
│ Content Type: [Video ▼]             │
│                                     │
│ Fields:                             │
│ ┌─────────────────────────────────┐ │
│ │ Description (text)              │ │
│ │ [Enter description...]          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Style (text)                    │ │
│ │ [Enter style...]                │ │
│ └─────────────────────────────────┘ │
│ [+ Add Field]                       │
│                                     │
│ [Cancel] [Save Task]                │
└─────────────────────────────────────┘
```

#### 4. Диалог добавления поля

```
┌─────────────────────────────────────┐
│ Add Field                           │
├─────────────────────────────────────┤
│ Field Name: [_______________]       │
│ Field Type: [Text ▼]               │
│   • Text                            │
│   • File                            │
│   • URL                             │
│   • Checkbox                        │
│                                     │
│ [Cancel] [Add]                     │
└─────────────────────────────────────┘
```

#### 5. Детальный просмотр задачи

```
┌─────────────────────────────────────┐
│ Task: Marketing Video                │
│ Type: Video • Status: In Progress   │
├─────────────────────────────────────┤
│ Description:                        │
│ [Video content description...]      │
│                                     │
│ Style: Professional                 │
│ Duration: 60 seconds               │
│                                     │
│ Assets:                             │
│ • image1.jpg [Remove]               │
│ • video1.mp4 [Remove]               │
│ [+ Upload Asset]                    │
│                                     │
│ Results:                            │
│ • Link: https://haygen.com/...      │
│ • File: result.mp4 [Download]       │
│                                     │
│ [Generate Content] [Add Result]    │
│ [Edit] [Delete]                     │
└─────────────────────────────────────┘
```

#### 6. Диалог добавления результата вручную

```
┌─────────────────────────────────────┐
│ Add Result                          │
├─────────────────────────────────────┤
│ Link (optional):                    │
│ [https://example.com/result...]     │
│                                     │
│ File (optional):                    │
│ [Choose File] No file chosen        │
│                                     │
│ [Cancel] [Save Result]             │
└─────────────────────────────────────┘
```

### Адаптация под мобильные устройства

1. **Breakpoints:**
   - Mobile: < 768px (карточки)
   - Tablet: 768px - 1024px (адаптивная таблица)
   - Desktop: > 1024px (полная таблица)

2. **Навигация:**
   - Bottom navigation для основных действий
   - Swipe-жесты для быстрых действий
   - Модальные окна на весь экран

3. **Оптимизация:**
   - Lazy loading для больших списков
   - Виртуализация таблицы при большом количестве задач
   - Оптимизация изображений (WebP, lazy loading)

---

## 🛠 Технический стек

### Frontend
- **Framework**: React 18+ (TypeScript)
- **UI Library**: 
  - Tailwind CSS (стилизация)
  - Headless UI (доступные компоненты)
  - React Table / TanStack Table (таблица)
- **State Management**: React Query (server state) + Zustand (client state)
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Mobile**: PWA support

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **ORM**: Prisma (типобезопасный доступ к БД)
- **Validation**: Zod
- **File Storage**: 
  - Cloudflare R2 (текущее, через S3-совместимый API)
  - AWS S3 (будущее, через Storage Adapter)
  - Local storage (dev)
- **Storage Library**: @aws-sdk/client-s3 (для R2 и S3)
- **Authentication**: JWT
- **API**: RESTful API

### Database
- **DBMS**: PostgreSQL 15+
- **Migrations**: Prisma Migrate

### Browser Extension
- **Manifest**: Manifest V3
- **Framework**: Vanilla JS / React (опционально)
- **Communication**: postMessage API
- **Content Scripts**: Инжекция скриптов на страницы Haygen для перехвата результатов
- **Background Service Worker**: Обработка сообщений между порталом и расширением
- **Storage API**: Локальное хранение данных задачи (taskId, промпт, ассеты)

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: 
  - **Текущее**: Railway (FE + BE)
  - **Будущее**: AWS (EC2/ECS для BE, S3 + CloudFront для FE)
- **File Storage**: 
  - **Текущее**: Cloudflare R2 (бесплатный tier)
  - **Будущее**: AWS S3

---

## ⚠️ Риски и митигация

### Риск 1: Зависимость от внешних сервисов (Haygen)

**Проблема:**
- Изменения в интерфейсе Haygen (может сломать перехват результатов)
- Недоступность сервиса
- Изменения в структуре URL или параметров

**Митигация:**
- Абстракция интеграции через интерфейс `ContentGenerator`
- Регулярное тестирование интеграции с Haygen
- Fallback: возможность ручной загрузки результатов пользователем
- Мониторинг изменений в интерфейсе Haygen
- Версионирование логики перехвата результатов

### Риск 2: Сложность интеграции через Browser Extension

**Проблема:**
- Сложность перехвата результатов из Haygen (нет API)
- Изменения в DOM структуре Haygen могут сломать перехват
- Проблемы с авторизацией пользователя в Haygen
- Кросс-браузерная совместимость
- Пользователь может закрыть вкладку до сохранения результата

**Митигация:**
- Несколько стратегий перехвата (DOM наблюдение, инжекция кнопки, clipboard)
- Регулярное обновление селекторов для перехвата результатов
- Четкий протокол коммуникации через postMessage
- Документация процесса интеграции
- Тестирование на Chrome и Edge
- Fallback: возможность ручной загрузки результатов (пользователь копирует ссылку и вставляет в портал)
- Уведомления пользователю о необходимости сохранить результат

### Риск 3: Производительность при большом количестве задач

**Проблема:**
- Медленная загрузка таблицы
- Проблемы с рендерингом

**Митигация:**
- Пагинация на бэкенде
- Виртуализация таблицы на фронтенде
- Индексы в БД
- Кэширование на уровне API

### Риск 4: Безопасность файлов и данных

**Проблема:**
- Несанкционированный доступ к файлам
- Утечка данных пользователей

**Митигация:**
- Аутентификация через JWT
- Авторизация на уровне API (проверка user_id)
- Шифрование файлов в хранилище
- Валидация типов файлов и размеров
- Rate limiting на API

### Риск 5: Масштабируемость динамических полей

**Проблема:**
- Сложность запросов при большом количестве полей
- Проблемы с производительностью

**Митигация:**
- Использование JSONB для гибкого хранения
- Индексы на часто используемые поля
- Денормализация критичных данных (если необходимо)

### Риск 6: Миграция между хранилищами (R2 → S3)

**Проблема:**
- Необходимость миграции файлов при переключении хранилища
- Изменение URL файлов
- Простой системы во время миграции

**Митигация:**
- Storage Adapter обеспечивает единый интерфейс
- Миграция файлов через скрипт (одноразовая операция)
- Обновление URL в БД после миграции
- Возможность работы с обоими хранилищами параллельно (dual-write) во время миграции

### Риск 7: Миграция с Railway на AWS

**Проблема:**
- Различия в конфигурации окружения
- Изменение инфраструктуры
- Необходимость обновления CI/CD

**Митигация:**
- Использование переменных окружения для всех конфигураций
- Docker-контейнеризация для портабельности
- Документация процесса миграции
- Постепенная миграция (сначала BE, потом FE)

---

## 📈 План развития (Post-MVP)

### Фаза 2: Дополнительные типы контента
- Интеграция с NanoBanana (изображения)
- Интеграция с Haygen ImageToVideo (говорящая голова)
- Генерация текста
- Генерация презентаций

### Фаза 3: Расширенная функциональность
- Шаблоны задач
- Автоматизация генерации (scheduled tasks)
- Командная работа (collaboration)
- Версионирование контента

### Фаза 4: Аналитика и оптимизация
- Метрики использования
- A/B тестирование промптов
- Оптимизация затрат на генерацию

---

## ✅ Acceptance Criteria для MVP

### Функциональные требования

1. **Управление задачами:**
   - ✅ Создание задачи с названием и типом контента
   - ✅ Редактирование задачи
   - ✅ Удаление задачи
   - ✅ Просмотр списка задач в таблице

2. **Динамические поля:**
   - ✅ Добавление полей типов: text, file, url, checkbox
   - ✅ Редактирование значений полей
   - ✅ Удаление полей
   - ✅ Изменение порядка полей (drag & drop)

3. **Генерация видеоролика через Haygen:**
   - ✅ Генерация промпта на основе полей задачи
   - ✅ Подготовка публичных URL для ассетов
   - ✅ Redirect пользователя на Haygen с передачей данных (через URL/расширение)
   - ✅ Browser Extension перехватывает результаты при сохранении/поделиться в Haygen
   - ✅ Получение публичной ссылки (share link) и ссылки на скачивание (download link)
   - ✅ Сохранение результатов в задаче (публичная ссылка + опционально скачанный файл)
   - ✅ Fallback: возможность ручной загрузки результата, если расширение не сработало

4. **Ручное выполнение задач:**
   - ✅ Загрузка файла результата в хранилище
   - ✅ Добавление ссылки на результат
   - ✅ Комбинированная загрузка (ссылка + файл)
   - ✅ Сохранение результата с пометкой источника

5. **Мобильная адаптация:**
   - ✅ Адаптивный интерфейс для экранов < 768px
   - ✅ Удобная навигация на мобильных устройствах
   - ✅ Оптимизация загрузки

### Технические требования

1. **Производительность:**
   - Загрузка таблицы < 1 сек (до 100 задач)
   - Загрузка формы задачи < 500 мс

2. **Безопасность:**
   - Аутентификация пользователей
   - Авторизация на уровне API
   - Валидация всех входных данных

3. **Надежность:**
   - Обработка ошибок интеграции
   - Retry механизм для внешних API
   - Логирование ошибок

4. **Хранилище файлов:**
   - Абстракция Storage Adapter для переключения между R2 и S3
   - Конфигурация через переменные окружения
   - Поддержка загрузки файлов до 100MB (настраиваемо)
   - Генерация публичных URL для ассетов (для передачи в Haygen)

5. **Browser Extension:**
   - Установка и активация расширения
   - Перехват результатов из Haygen (публичная ссылка + ссылка на скачивание)
   - Коммуникация с порталом через postMessage API
   - Обработка ошибок и fallback сценарии

---

## 📝 Примечания

- Документ является живым и будет обновляться по мере развития проекта
- Приоритет: простота и функциональность MVP
- Избегание оверкодинга и оверинжиниринга
- Фокус на пользовательском опыте

---

---

## 🔄 План миграции (Railway → AWS, R2 → S3)

### Этап 1: Подготовка (текущее состояние)
- ✅ Развертывание на Railway
- ✅ Использование Cloudflare R2 для файлов
- ✅ Storage Adapter для абстракции

### Этап 2: Миграция хранилища (R2 → S3)
1. **Подготовка S3:**
   - Создание S3 bucket в AWS
   - Настройка CORS и политик доступа
   - Получение credentials

2. **Миграция файлов:**
   - Создание скрипта миграции (R2 → S3)
   - Копирование всех существующих файлов
   - Проверка целостности данных

3. **Обновление конфигурации:**
   - Изменение `STORAGE_PROVIDER=s3` в переменных окружения
   - Обновление URL файлов в БД
   - Тестирование на staging окружении

4. **Переключение:**
   - Обновление production окружения
   - Мониторинг работы системы

### Этап 3: Миграция инфраструктуры (Railway → AWS)
1. **Подготовка AWS:**
   - Настройка VPC, Security Groups
   - Создание RDS для PostgreSQL
   - Настройка ECS/EKS или EC2

2. **Миграция БД:**
   - Создание дампа БД на Railway
   - Восстановление на AWS RDS
   - Проверка целостности данных

3. **Развертывание приложения:**
   - Обновление CI/CD для AWS
   - Развертывание Backend на AWS
   - Развертывание Frontend на S3 + CloudFront

4. **Переключение DNS:**
   - Обновление DNS записей
   - Мониторинг работы системы
   - Отключение Railway после проверки

### Рекомендации
- Миграция должна происходить поэтапно
- Обязательное тестирование на staging перед production
- Резервное копирование данных перед миграцией
- Возможность отката на предыдущую инфраструктуру

---

**Версия документа**: 1.1  
**Дата создания**: 2024-01-15  
**Последнее обновление**: 2024-01-15

