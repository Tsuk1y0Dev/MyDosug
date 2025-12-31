/**
 * Конфигурация приложения
 */

export const config = {
  // API
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.mydosug.ru/api',
  
  // Настройки таймлайна
  timeline: {
    startHour: 6,
    endHour: 22,
    hourHeight: 80,
  },
  
  // Настройки поиска
  search: {
    defaultRadius: 5000, // метры
    defaultLimit: 20,
  },
  
  // Настройки маршрутов
  routes: {
    defaultTransportType: 'walking' as const,
    walkingSpeed: 5, // км/ч
    cyclingSpeed: 15,
    carSpeed: 50,
    publicTransportSpeed: 30,
  },
  
  // Настройки пользователя по умолчанию
  user: {
    defaultMaxWalkingMinutes: 15,
    defaultTransportMode: 'walking' as const,
  },
  
  // Версия приложения
  version: '1.0.0',
};

