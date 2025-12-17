export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export const activityCategories: Category[] = [
  {
    id: 'food',
    name: 'Еда и напитки',
    icon: '🍽️',
    subcategories: [
      { id: 'restaurant', name: 'Рестораны', icon: '🍴', description: 'Рестораны различной кухни' },
      { id: 'cafe', name: 'Кафе', icon: '☕', description: 'Кофейни и кафе' },
      { id: 'fastfood', name: 'Фастфуд', icon: '🍔', description: 'Быстрое питание' },
      { id: 'bar', name: 'Бары', icon: '🍺', description: 'Бары и пабы' },
      { id: 'bakery', name: 'Пекарни', icon: '🥖', description: 'Хлебобулочные изделия' },
      { id: 'dessert', name: 'Десерты', icon: '🍰', description: 'Кондитерские и сладости' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Развлечения',
    icon: '🎭',
    subcategories: [
      { id: 'cinema', name: 'Кинотеатры', icon: '🎬', description: 'Просмотр фильмов' },
      { id: 'theater', name: 'Театры', icon: '🎪', description: 'Театральные постановки' },
      { id: 'concert', name: 'Концерты', icon: '🎵', description: 'Музыкальные мероприятия' },
      { id: 'club', name: 'Клубы', icon: '🎤', description: 'Ночные клубы и дискотеки' },
      { id: 'karaoke', name: 'Караоке', icon: '🎙️', description: 'Караоке-бары' },
      { id: 'bowling', name: 'Боулинг', icon: '🎳', description: 'Боулинг-клубы' },
      { id: 'arcade', name: 'Игровые залы', icon: '🎮', description: 'Аркадные игры' },
    ],
  },
  {
    id: 'sports',
    name: 'Спорт и фитнес',
    icon: '⚽',
    subcategories: [
      { id: 'gym', name: 'Тренажерные залы', icon: '💪', description: 'Фитнес-клубы' },
      { id: 'pool', name: 'Бассейны', icon: '🏊', description: 'Плавательные бассейны' },
      { id: 'yoga', name: 'Йога', icon: '🧘', description: 'Йога-студии' },
      { id: 'tennis', name: 'Теннис', icon: '🎾', description: 'Теннисные корты' },
      { id: 'football', name: 'Футбол', icon: '⚽', description: 'Футбольные поля' },
      { id: 'basketball', name: 'Баскетбол', icon: '🏀', description: 'Баскетбольные площадки' },
      { id: 'cycling', name: 'Велоспорт', icon: '🚴', description: 'Велосипедные маршруты' },
    ],
  },
  {
    id: 'culture',
    name: 'Культура и искусство',
    icon: '🎨',
    subcategories: [
      { id: 'museum', name: 'Музеи', icon: '🏛️', description: 'Художественные и исторические музеи' },
      { id: 'gallery', name: 'Галереи', icon: '🖼️', description: 'Художественные галереи' },
      { id: 'exhibition', name: 'Выставки', icon: '📸', description: 'Временные выставки' },
      { id: 'library', name: 'Библиотеки', icon: '📚', description: 'Публичные библиотеки' },
      { id: 'monument', name: 'Памятники', icon: '🗿', description: 'Исторические памятники' },
      { id: 'architecture', name: 'Архитектура', icon: '🏛️', description: 'Архитектурные достопримечательности' },
    ],
  },
  {
    id: 'walking',
    name: 'Прогулки и отдых',
    icon: '🚶',
    subcategories: [
      { id: 'park', name: 'Парки', icon: '🌳', description: 'Городские парки' },
      { id: 'square', name: 'Скверы', icon: '🌲', description: 'Городские скверы' },
      { id: 'embankment', name: 'Набережные', icon: '🌊', description: 'Набережные рек и озер' },
      { id: 'viewpoint', name: 'Смотровые площадки', icon: '👁️', description: 'Обзорные площадки' },
      { id: 'botanical', name: 'Ботанические сады', icon: '🌺', description: 'Ботанические сады' },
      { id: 'zoo', name: 'Зоопарки', icon: '🦁', description: 'Зоологические парки' },
    ],
  },
  {
    id: 'shopping',
    name: 'Шопинг',
    icon: '🛍️',
    subcategories: [
      { id: 'mall', name: 'Торговые центры', icon: '🏬', description: 'Крупные торговые центры' },
      { id: 'market', name: 'Рынки', icon: '🏪', description: 'Рыночные площади' },
      { id: 'boutique', name: 'Бутики', icon: '👗', description: 'Магазины одежды' },
      { id: 'electronics', name: 'Электроника', icon: '📱', description: 'Магазины техники' },
      { id: 'bookstore', name: 'Книжные', icon: '📖', description: 'Книжные магазины' },
      { id: 'souvenir', name: 'Сувениры', icon: '🎁', description: 'Сувенирные лавки' },
    ],
  },
  {
    id: 'education',
    name: 'Образование',
    icon: '📚',
    subcategories: [
      { id: 'workshop', name: 'Мастер-классы', icon: '🎓', description: 'Обучающие мастер-классы' },
      { id: 'lecture', name: 'Лекции', icon: '📝', description: 'Публичные лекции' },
      { id: 'course', name: 'Курсы', icon: '📖', description: 'Обучающие курсы' },
      { id: 'seminar', name: 'Семинары', icon: '💼', description: 'Бизнес-семинары' },
    ],
  },
  {
    id: 'nature',
    name: 'Природа',
    icon: '🌳',
    subcategories: [
      { id: 'forest', name: 'Леса', icon: '🌲', description: 'Лесные массивы' },
      { id: 'lake', name: 'Озера', icon: '🏞️', description: 'Озера и водоемы' },
      { id: 'mountain', name: 'Горы', icon: '⛰️', description: 'Горные маршруты' },
      { id: 'beach', name: 'Пляжи', icon: '🏖️', description: 'Пляжные зоны' },
      { id: 'reserve', name: 'Заповедники', icon: '🦌', description: 'Природные заповедники' },
    ],
  },
];

/**
 * Получить категорию по ID
 */
export const getCategoryById = (id: string): Category | undefined => {
  return activityCategories.find(cat => cat.id === id);
};

/**
 * Получить подкатегорию по ID категории и подкатегории
 */
export const getSubcategoryById = (categoryId: string, subcategoryId: string): Subcategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories.find(sub => sub.id === subcategoryId);
};

/**
 * Получить все подкатегории для категории
 */
export const getSubcategoriesByCategory = (categoryId: string): Subcategory[] => {
  const category = getCategoryById(categoryId);
  return category?.subcategories || [];
};

