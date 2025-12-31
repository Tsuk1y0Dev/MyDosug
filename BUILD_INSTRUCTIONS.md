# Инструкции по сборке APK

## Предварительные требования

1. Установите Expo CLI глобально:
```bash
npm install -g expo-cli
```

2. Установите EAS CLI для сборки:
```bash
npm install -g eas-cli
```

3. Войдите в свой Expo аккаунт:
```bash
eas login
```

## Настройка проекта

1. **Исправление ошибки "Invalid UUID appId":**
   - Если вы видите ошибку `Invalid UUID appId`, см. файл `EAS_BUILD_FIX.md`
   - Или создайте новый проект: `npx eas-cli init`
   - Это автоматически создаст правильный projectId в `app.json`

2. Получите API ключ для Yandex Maps:
   - Зарегистрируйтесь на https://developer.tech.yandex.ru/
   - Выберите "JavaScript API и HTTP Геокодер"
   - Получите API ключ
   - Замените `YOUR_API_KEY` в файле `src/components/maps/YandexMap.tsx`
   - Подробные инструкции: см. `YANDEX_API_SETUP.md`

## Сборка APK

### Вариант 1: EAS Build (Рекомендуется)

```bash
# Настройка проекта (первый раз)
eas build:configure

# Сборка APK для Android
eas build --platform android --profile preview

# Или для production
eas build --platform android --profile production
```

### Вариант 2: Локальная сборка

```bash
# Установите зависимости
npm install

# Запустите сборку
npx expo build:android
```

## Установка APK

После сборки APK файл будет доступен для скачивания. Установите его на Android устройство:

1. Включите "Установка из неизвестных источников" в настройках Android
2. Скачайте APK файл
3. Откройте файл и следуйте инструкциям установки

## Примечания

- Для production сборки потребуется подпись приложения
- Настройте keystore для подписи в `eas.json` или используйте автоматическую подпись от Expo
- Убедитесь, что все зависимости установлены: `npm install`

