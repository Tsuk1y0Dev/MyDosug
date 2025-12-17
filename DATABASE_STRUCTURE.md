# Структура базы данных MyDosug

## Обзор

База данных спроектирована для поддержки планирования активностей, управления пользователями, местоположениями и маршрутами. Используется реляционная модель данных с PostgreSQL в качестве основной СУБД.

---

## Таблицы

### 1. users (Пользователи)

Основная таблица для хранения информации о пользователях.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Индексы
    INDEX idx_users_email (email),
    INDEX idx_users_created_at (created_at)
);
```

**Важные поля:**
- `password_hash` - хранится хеш пароля (bcrypt/argon2), НИКОГДА не храните пароли в открытом виде
- `email_verified` - флаг подтверждения email (для безопасности)
- `is_active` - возможность мягкого удаления/блокировки пользователя

**Рекомендации:**
- Используйте UUID для id (безопасность, масштабируемость)
- Регулярно обновляйте `updated_at` через триггеры
- Храните `last_login` для аналитики и безопасности

---

### 2. user_settings (Настройки пользователя)

Расширенные настройки пользователя, отдельная таблица для нормализации.

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Настройки по умолчанию
    default_start_point_type VARCHAR(20) DEFAULT 'current', -- 'home', 'work', 'current', 'custom'
    default_start_point_address TEXT,
    default_start_point_lat DECIMAL(10, 8),
    default_start_point_lng DECIMAL(11, 8),
    default_budget INTEGER DEFAULT 2000,
    default_transport_mode VARCHAR(20) DEFAULT 'walking', -- 'walking', 'car', 'public'
    
    -- Настройки уведомлений
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Настройки доступности
    accessibility_mode BOOLEAN DEFAULT false,
    wheelchair_accessible_preference BOOLEAN DEFAULT false,
    
    -- Язык и регион
    language VARCHAR(10) DEFAULT 'ru',
    timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id),
    INDEX idx_user_settings_user_id (user_id)
);
```

**Важные поля:**
- `default_start_point_*` - координаты и адрес точки старта по умолчанию
- `default_transport_mode` - влияет на расчет времени в пути
- `timezone` - важно для корректного отображения времени

---

### 3. places (Места/Локации)

Основная таблица для хранения информации о местах (рестораны, парки, музеи и т.д.).

```sql
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Основная информация
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id VARCHAR(50) NOT NULL, -- Ссылка на категорию
    subcategory_id VARCHAR(50), -- Подкатегория
    
    -- Адрес и координаты
    address TEXT NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Россия',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    postal_code VARCHAR(20),
    
    -- Контактная информация
    phone VARCHAR(20),
    email VARCHAR(255),
    website TEXT,
    
    -- Рабочие часы (JSON для гибкости)
    working_hours JSONB, -- {"monday": "10:00-22:00", "tuesday": "10:00-22:00", ...}
    
    -- Рейтинг и цены
    rating DECIMAL(3, 2) DEFAULT 0.0, -- 0.0 - 5.0
    rating_count INTEGER DEFAULT 0,
    price_level INTEGER CHECK (price_level BETWEEN 1 AND 4), -- 1-4 ($)
    average_bill INTEGER, -- Средний чек в рублях
    
    -- Медиа
    image_url TEXT,
    image_urls TEXT[], -- Массив URL изображений
    
    -- Особенности
    features JSONB, -- {"wheelchair": true, "vegetarian": true, "outdoor": false, "childFriendly": true}
    
    -- Настройки продолжительности посещения
    duration_settings JSONB, -- {"baseDuration": 90, "modifiers": {...}}
    
    -- Метаданные
    verified BOOLEAN DEFAULT false, -- Проверено модератором
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id), -- Кто добавил место
    
    -- Индексы
    INDEX idx_places_category (category_id),
    INDEX idx_places_location (latitude, longitude),
    INDEX idx_places_rating (rating DESC),
    INDEX idx_places_city (city),
    INDEX idx_places_verified (verified),
    
    -- Полнотекстовый поиск
    FULLTEXT INDEX idx_places_search (name, description, address)
);
```

**Важные поля:**
- `working_hours` - JSON для хранения расписания по дням недели
- `features` - JSON для гибкого хранения особенностей места
- `duration_settings` - настройки расчета времени посещения
- `verified` - важно для модерации контента
- Используйте `GEOGRAPHY` тип для координат в PostgreSQL для точных геопространственных запросов

**Рекомендации:**
- Используйте PostGIS для геопространственных запросов (расстояние, поиск в радиусе)
- Регулярно обновляйте рейтинг на основе отзывов
- Кэшируйте популярные места

---

### 4. place_reviews (Отзывы о местах)

Отзывы и оценки пользователей о местах.

```sql
CREATE TABLE place_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    photos TEXT[], -- Массив URL фотографий
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    helpful_count INTEGER DEFAULT 0, -- Сколько пользователей нашли отзыв полезным
    
    -- Модерация
    is_approved BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false,
    
    UNIQUE(place_id, user_id), -- Один отзыв от пользователя на место
    INDEX idx_reviews_place (place_id),
    INDEX idx_reviews_user (user_id),
    INDEX idx_reviews_rating (rating)
);
```

**Важные поля:**
- `UNIQUE(place_id, user_id)` - предотвращает дублирование отзывов
- `is_approved` - модерация контента
- `helpful_count` - для сортировки полезных отзывов

---

### 5. routes (Маршруты)

Сохраненные маршруты пользователей.

```sql
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Информация о маршруте
    name VARCHAR(255),
    description TEXT,
    date DATE, -- Дата планируемого маршрута
    
    -- Точка старта
    start_point_type VARCHAR(20),
    start_point_address TEXT,
    start_point_lat DECIMAL(10, 8),
    start_point_lng DECIMAL(11, 8),
    
    -- Статистика
    total_duration INTEGER, -- В минутах
    total_cost DECIMAL(10, 2),
    activity_count INTEGER DEFAULT 0,
    
    -- Метаданные
    is_public BOOLEAN DEFAULT false, -- Публичный маршрут для других пользователей
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_routes_user (user_id),
    INDEX idx_routes_date (date),
    INDEX idx_routes_public (is_public)
);
```

**Важные поля:**
- `is_public` - возможность делиться маршрутами
- `date` - для фильтрации по датам

---

### 6. route_activities (Активности в маршруте)

Связь между маршрутами и местами с временными интервалами.

```sql
CREATE TABLE route_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    
    -- Временные интервалы
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    order_index INTEGER NOT NULL, -- Порядок в маршруте
    
    -- Логистика
    travel_time_from_previous INTEGER DEFAULT 0, -- Время в пути от предыдущего места (минуты)
    travel_distance_from_previous DECIMAL(10, 2), -- Расстояние в метрах
    
    -- Метаданные
    notes TEXT, -- Заметки пользователя
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_route_activities_route (route_id),
    INDEX idx_route_activities_place (place_id),
    INDEX idx_route_activities_order (route_id, order_index)
);
```

**Важные поля:**
- `order_index` - критично для правильной последовательности
- `travel_time_from_previous` - для расчета логистики

---

### 7. user_favorites (Избранное)

Избранные места пользователей.

```sql
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, place_id), -- Одно место может быть в избранном только один раз
    INDEX idx_favorites_user (user_id),
    INDEX idx_favorites_place (place_id)
);
```

**Важные поля:**
- `UNIQUE(user_id, place_id)` - предотвращает дублирование

---

### 8. activity_categories (Категории активностей)

Справочник категорий и подкатегорий.

```sql
CREATE TABLE activity_categories (
    id VARCHAR(50) PRIMARY KEY, -- 'food', 'entertainment', etc.
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10), -- Эмодзи или иконка
    parent_id VARCHAR(50) REFERENCES activity_categories(id), -- NULL для категорий, ID для подкатегорий
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    
    INDEX idx_categories_parent (parent_id)
);
```

**Важные поля:**
- `parent_id` - NULL для основных категорий, ссылка на родителя для подкатегорий
- Иерархическая структура через self-reference

---

### 9. user_schedules (Расписание пользователя)

Активности в расписании пользователя (календарь).

```sql
CREATE TABLE user_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Информация об активности
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50), -- 'custom', 'place', 'route'
    
    -- Связи
    place_id UUID REFERENCES places(id) ON DELETE SET NULL, -- NULL для кастомных активностей
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    
    -- Временные интервалы
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE NOT NULL,
    
    -- Локация
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_schedules_user (user_id),
    INDEX idx_schedules_date (date),
    INDEX idx_schedules_time (start_time, end_time)
);
```

**Важные поля:**
- `date` + `start_time` + `end_time` - для проверки конфликтов
- `activity_type` - различает кастомные активности и активности из мест

---

### 10. search_history (История поиска)

История поисковых запросов пользователей (для рекомендаций).

```sql
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL для гостей
    
    -- Параметры поиска
    query_text TEXT,
    category_id VARCHAR(50),
    filters JSONB, -- Сохраненные фильтры поиска
    
    -- Результаты
    results_count INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_search_history_user (user_id),
    INDEX idx_search_history_created (created_at)
);
```

**Важные поля:**
- `user_id` может быть NULL для гостевых поисков
- Используется для улучшения рекомендаций

---

## Связи между таблицами

```
users
  ├── user_settings (1:1)
  ├── routes (1:N)
  ├── user_favorites (1:N)
  ├── user_schedules (1:N)
  ├── place_reviews (1:N)
  └── search_history (1:N)

places
  ├── place_reviews (1:N)
  ├── user_favorites (N:M через user_favorites)
  ├── route_activities (N:M через route_activities)
  └── user_schedules (1:N)

routes
  ├── route_activities (1:N)
  └── user_schedules (1:N)

activity_categories
  └── places (1:N через category_id)
```

---

## Индексы и оптимизация

### Критически важные индексы:

1. **Геопространственные запросы:**
   ```sql
   CREATE INDEX idx_places_geography ON places USING GIST (
     ST_MakePoint(longitude, latitude)
   );
   ```

2. **Поиск по категориям:**
   ```sql
   CREATE INDEX idx_places_category_subcategory ON places(category_id, subcategory_id);
   ```

3. **Временные запросы:**
   ```sql
   CREATE INDEX idx_schedules_datetime ON user_schedules(date, start_time, end_time);
   ```

4. **Полнотекстовый поиск:**
   ```sql
   CREATE INDEX idx_places_fts ON places USING GIN (
     to_tsvector('russian', name || ' ' || COALESCE(description, '') || ' ' || address)
   );
   ```

---

## Миграции и версионирование

Используйте систему миграций (например, Flyway, Liquibase):

1. **v1.0.0** - Базовая структура (users, places, routes)
2. **v1.1.0** - Добавление категорий и подкатегорий
3. **v1.2.0** - Система отзывов
4. **v2.0.0** - Расширенные настройки пользователя

---

## Безопасность

1. **Пароли:** Всегда используйте хеширование (bcrypt, argon2)
2. **SQL Injection:** Используйте параметризованные запросы
3. **XSS:** Санитизация всех пользовательских данных
4. **CORS:** Правильная настройка для API
5. **Rate Limiting:** Ограничение запросов для предотвращения злоупотреблений

---

## Рекомендации по масштабированию

1. **Партиционирование:** Разделите `user_schedules` по датам
2. **Кэширование:** Redis для популярных мест и маршрутов
3. **CDN:** Для изображений мест
4. **Read Replicas:** Для чтения данных (поиск, просмотр)
5. **Очереди:** Для тяжелых операций (расчет маршрутов, отправка уведомлений)

---

## Примеры запросов

### Поиск мест в радиусе:
```sql
SELECT * FROM places
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint(37.6173, 55.7558)::geography,
  5000 -- 5 км в метрах
)
AND category_id = 'food'
ORDER BY rating DESC
LIMIT 20;
```

### Получение маршрута с активностями:
```sql
SELECT 
  r.*,
  json_agg(
    json_build_object(
      'place', p.*,
      'start_time', ra.start_time,
      'end_time', ra.end_time,
      'order', ra.order_index
    ) ORDER BY ra.order_index
  ) as activities
FROM routes r
LEFT JOIN route_activities ra ON r.id = ra.route_id
LEFT JOIN places p ON ra.place_id = p.id
WHERE r.id = $1
GROUP BY r.id;
```

---

## Примечания

- Все временные метки в UTC, конвертация в локальное время на клиенте
- Используйте транзакции для атомарных операций
- Регулярно делайте бэкапы
- Мониторьте производительность запросов
- Используйте connection pooling

