import { Place, ActivityType, MoodType, CompanyType } from '../types/planner';

export const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'Ресторан "Сибирь"',
    type: 'food',
    address: 'ул. Ленина, 55',
    description: 'Ресторан с сибирской и европейской кухней, уютная атмосфера',
    priceLevel: 3,
    averageBill: 2000,
    rating: 4.5,
    distance: 800,
    travelTime: 10,
    durationSettings: {
      baseDuration: 90,
      modifiers: {
        company: {
          solo: 0.7,
          couple: 1.2,
          friends: 1.5,
          kids: 0.8,
          colleagues: 1.1
        },
        mood: {
          relax: 1.3,
          educational: 1.1,
          fun: 1.4,
          romantic: 1.5,
          active: 0.8
        }
      }
    },
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    website: 'https://sibir-restaurant.ru',
    workingHours: '11:00-23:00',
    features: {
      wheelchair: true,
      vegetarian: true,
      outdoor: false,
      childFriendly: true,
    },
    coordinates: { lat: 52.0339, lng: 113.5010 },
  },
  {
    id: '2',
    name: 'Парк ОДОРА',
    type: 'walking',
    address: 'ул. Амурская, 141',
    description: 'Центральный парк культуры и отдыха, отличное место для прогулок',
    priceLevel: 1,
    averageBill: 0,
    rating: 4.7,
    distance: 1500,
    travelTime: 18,
    durationSettings: {
      baseDuration: 120,
      modifiers: {
        company: { solo: 0.7, couple: 1.2, friends: 1.5, kids: 0.8, colleagues: 1.1 },
        mood: { relax: 1.3, educational: 1.1, fun: 1.4, romantic: 1.5, active: 0.8 }
      }
    },
    image: 'https://images.unsplash.com/photo-1572017932228-19de42fdb4a9?w=400',
    workingHours: 'круглосуточно',
    features: {
      wheelchair: true,
      vegetarian: false,
      outdoor: true,
      childFriendly: true,
    },
    coordinates: { lat: 52.0250, lng: 113.4950 },
  },
  {
    id: '3',
    name: 'Краеведческий музей',
    type: 'culture',
    address: 'ул. Бабушкина, 113',
    description: 'Музей истории и культуры Забайкалья',
    priceLevel: 2,
    averageBill: 300,
    rating: 4.4,
    distance: 1200,
    travelTime: 15,
    durationSettings: {
      baseDuration: 105,
      modifiers: {
        company: { solo: 0.7, couple: 1.2, friends: 1.5, kids: 0.8, colleagues: 1.1 },
        mood: { relax: 1.3, educational: 1.1, fun: 1.4, romantic: 1.5, active: 0.8 }
      }
    },
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400',
    website: 'https://chita-museum.ru',
    workingHours: '10:00-18:00',
    features: {
      wheelchair: true,
      vegetarian: false,
      outdoor: false,
      childFriendly: true,
    },
    coordinates: { lat: 52.0280, lng: 113.4980 },
  },
  {
    id: '4',
    name: 'Кофейня "Кофе Хаус"',
    type: 'food',
    address: 'ул. Ленина, 78',
    description: 'Уютная кофейня с ароматным кофе и свежей выпечкой',
    priceLevel: 2,
    averageBill: 600,
    rating: 4.6,
    distance: 500,
    travelTime: 6,
    durationSettings: {
      baseDuration: 45,
      modifiers: {
        company: { solo: 0.7, couple: 1.2, friends: 1.5, kids: 0.8, colleagues: 1.1 },
        mood: { relax: 1.3, educational: 1.1, fun: 1.4, romantic: 1.5, active: 0.8 }
      }
    },
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    workingHours: '08:00-21:00',
    features: {
      wheelchair: true,
      vegetarian: true,
      outdoor: false,
      childFriendly: true,
    },
    coordinates: { lat: 52.0320, lng: 113.5020 },
  },
  {
    id: '5',
    name: 'ТЦ "Макси"',
    type: 'shopping',
    address: 'ул. Амурская, 100',
    description: 'Торговый центр с широким ассортиментом магазинов',
    priceLevel: 3,
    averageBill: 4000,
    rating: 4.2,
    distance: 2000,
    travelTime: 20,
    durationSettings: {
      baseDuration: 180,
      modifiers: {
        company: { solo: 0.7, couple: 1.2, friends: 1.5, kids: 0.8, colleagues: 1.1 },
        mood: { relax: 1.3, educational: 1.1, fun: 1.4, romantic: 1.5, active: 0.8 }
      }
    },
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    website: 'https://maxi-mall.ru',
    workingHours: '09:00-21:00',
    features: {
      wheelchair: true,
      vegetarian: false,
      outdoor: false,
      childFriendly: true,
    },
    coordinates: { lat: 52.0300, lng: 113.5050 },
  },
  {
    id: '6',
    name: 'Фитнес-клуб "Атлант"',
    type: 'sports',
    address: 'ул. Чкалова, 120',
    description: 'Современный фитнес-клуб с тренажерным залом и групповыми занятиями',
    priceLevel: 3,
    averageBill: 1200,
    rating: 4.5,
    distance: 1800,
    travelTime: 18,
    durationSettings: {
      baseDuration: 90,
      modifiers: {
        company: { solo: 0.7, couple: 1.2, friends: 1.5, kids: 0.8, colleagues: 1.1 },
        mood: { relax: 1.3, educational: 1.1, fun: 1.4, romantic: 1.5, active: 0.8 }
      }
    },
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    website: 'https://atlant-fitness.ru',
    workingHours: '06:00-23:00',
    features: {
      wheelchair: true,
      vegetarian: false,
      outdoor: false,
      childFriendly: false,
    },
    coordinates: { lat: 52.0270, lng: 113.5030 },
  },
];

export const mockStartPoints = [
  { type: 'home' as const, address: 'ул. Ленина, 25', label: '🏠 Дом' },
  { type: 'work' as const, address: 'ул. Амурская, 50', label: '💼 Работа' },
  { type: 'current' as const, address: 'Текущее местоположение', label: '📍 Текущее' },
];

export const activityTypes: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'food', label: '🍽️ Еда', icon: '🍽️' },
  { value: 'entertainment', label: '🎭 Развлечения', icon: '🎭' },
  { value: 'sports', label: '⚽ Спорт', icon: '⚽' },
  { value: 'culture', label: '🎨 Культура', icon: '🎨' },
  { value: 'walking', label: '🚶 Прогулка', icon: '🚶' },
  { value: 'shopping', label: '🛍️ Шопинг', icon: '🛍️' },
  { value: 'education', label: '📚 Образование', icon: '📚' },
  { value: 'nature', label: '🌳 Природа', icon: '🌳' },
  { value: 'custom', label: '✏️ Своя активность', icon: '✏️' },
];

export const moodTypes: { value: MoodType; label: string; icon: string; color: string }[] = [
  { value: 'relax', label: 'Релакс', icon: '', color: '#10b981' },
  { value: 'educational', label: 'Познавательно', icon: '', color: '#3b82f6' },
  { value: 'fun', label: 'Весело', icon: '', color: '#f59e0b' },
  { value: 'romantic', label: 'Романтично', icon: '', color: '#ec4899' },
  { value: 'active', label: 'Активно', icon: '', color: '#ef4444' },
];

export const companyTypes: { value: CompanyType; label: string; icon: string }[] = [
  { value: 'solo', label: 'Один', icon: ' ' },
  { value: 'couple', label: ' Пара', icon: '' },
  { value: 'friends', label: ' Друзья', icon: '' },
  { value: 'kids', label: ' Дети', icon: '' },
  { value: 'colleagues', label: ' Коллеги', icon: '' },
];
