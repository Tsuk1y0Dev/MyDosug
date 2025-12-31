# Исправление ошибки сборки EAS

## Проблема

Ошибка: `Invalid UUID appId`

Это означает, что формат projectId в `app.json` неверный или проект не существует в вашем аккаунте EAS.

## Решение

### Вариант 1: Создать новый проект в EAS

1. Убедитесь, что вы вошли в EAS:
```bash
npx eas-cli login
```

2. Инициализируйте проект заново:
```bash
npx eas-cli init
```

3. Это создаст новый projectId и обновит `app.json` автоматически

### Вариант 2: Использовать существующий projectId

Если у вас уже есть проект на https://expo.dev:

1. Войдите на https://expo.dev
2. Откройте ваш проект
3. Скопируйте **Project ID** (не Owner ID!)
4. Формат должен быть: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 символов с дефисами)
5. Вставьте в `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "ваш-project-id-здесь"
  }
}
```

### Вариант 3: Удалить projectId (для локальной сборки)

Если вы хотите собирать APK локально без EAS:

1. Удалите или закомментируйте секцию `extra.eas` в `app.json`
2. Используйте локальную сборку:
```bash
npx expo build:android
```

## Проверка

После исправления проверьте:
```bash
npx eas-cli build:configure
```

Если ошибка исчезла, можно собирать:
```bash
npx eas-cli build --platform android --profile preview
```

## Важно

- Project ID должен быть в формате UUID (36 символов)
- Убедитесь, что вы используете правильный аккаунт EAS
- Project ID уникален для каждого проекта

