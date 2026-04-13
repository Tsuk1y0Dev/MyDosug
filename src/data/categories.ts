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
		id: "food",
		name: "Еда и напитки",
		icon: "🍽️",
		subcategories: [
			{
				id: "restaurant",
				name: "Рестораны",
				icon: "🍴",
				description: "Классические рестораны различной кухни",
			},
			{
				id: "cafe",
				name: "Кафе",
				icon: "☕",
				description: "Кофейни, кафе и bistro-форматы",
			},
			{
				id: "fastfood",
				name: "Фастфуд",
				icon: "🍔",
				description: "Бургерные, пиццерии, быстрого питания",
			},
			{
				id: "bar",
				name: "Бары и пабы",
				icon: "🍺",
				description: "Бары, пабы и винные бары",
			},
			{
				id: "bakery",
				name: "Пекарни и кондитерские",
				icon: "🥖",
				description: "Пекарни, булочные и небольшие кондитерские",
			},
			{
				id: "dessert",
				name: "Десерты и сладости",
				icon: "🍰",
				description: "Кондитерские, десертные и gelato-точки",
			},
			{
				id: "coffee_to_go",
				name: "Кофе с собой",
				icon: "🥤",
				description: "Маленькие кофейни и окошки формата to go",
			},
			{
				id: "canteen",
				name: "Столовые и бизнес-ланчи",
				icon: "🍲",
				description: "Быстрый и недорогой обед рядом с работой",
			},
			{
				id: "delivery",
				name: "Доставка еды",
				icon: "📦",
				description: "Сервисы и заведения с удобной доставкой",
			},
		],
	},
	{
		id: "entertainment",
		name: "Развлечения",
		icon: "🎭",
		subcategories: [
			{
				id: "cinema",
				name: "Кинотеатры",
				icon: "🎬",
				description: "Кинотеатры и кинозалы",
			},
			{
				id: "theater",
				name: "Театры",
				icon: "🎪",
				description: "Драматические, музыкальные и детские театры",
			},
			{
				id: "concert",
				name: "Концертные площадки",
				icon: "🎵",
				description: "Концертные залы и клубы с живой музыкой",
			},
			{
				id: "club",
				name: "Ночные клубы",
				icon: "🎤",
				description: "Клубы, бары с танцполом и DJ",
			},
			{
				id: "karaoke",
				name: "Караоке",
				icon: "🎙️",
				description: "Караоке-бары и отдельные комнаты",
			},
			{
				id: "bowling",
				name: "Боулинг",
				icon: "🎳",
				description: "Боулинг-клубы и развлекательные центры",
			},
			{
				id: "arcade",
				name: "Игровые залы",
				icon: "🎮",
				description: "Аркадные автоматы, VR и симуляторы",
			},
			{
				id: "quest",
				name: "Квесты",
				icon: "🧩",
				description: "Квесты в реальности и перформанс-квесты",
			},
			{
				id: "kids_center",
				name: "Детские развлекательные центры",
				icon: "🎠",
				description: "Игровые комнаты и семейные центры",
			},
			{
				id: "viewpoint_entertainment",
				name: "Смотровые площадки и панорамные виды",
				icon: "👁️",
				description: "Площадки с обзорами на город, в ТРЦ и парках",
			},
		],
	},
	{
		id: "sports",
		name: "Спорт и актив",
		icon: "⚽",
		subcategories: [
			{
				id: "gym",
				name: "Тренажерные залы",
				icon: "💪",
				description: "Фитнес-клубы и тренажерные залы",
			},
			{
				id: "pool",
				name: "Бассейны",
				icon: "🏊",
				description: "Плавательные бассейны и аквазоны",
			},
			{
				id: "yoga",
				name: "Йога и стретчинг",
				icon: "🧘",
				description: "Йога-студии и студии растяжки",
			},
			{
				id: "skating",
				name: "Катки и роллердромы",
				icon: "⛸️",
				description: "Открытые и крытые катки, роллердромы",
			},
			{
				id: "equipment_rent",
				name: "Прокат снаряжения",
				icon: "🎿",
				description: "Прокат лыж, коньков, велосипедов и другого снаряжения",
			},
			{
				id: "team_sports",
				name: "Командные виды спорта",
				icon: "🏀",
				description: "Залы и площадки для футбола, баскетбола, волейбола",
			},
			{
				id: "outdoor_active",
				name: "Активный отдых на природе",
				icon: "🥾",
				description: "Треки, склоны, сопки и зоны для пеших прогулок",
			},
		],
	},
	{
		id: "culture",
		name: "Культура и искусство",
		icon: "🎨",
		subcategories: [
			{
				id: "museum",
				name: "Музеи",
				icon: "🏛️",
				description: "Художественные и исторические музеи",
			},
			{
				id: "gallery",
				name: "Галереи",
				icon: "🖼️",
				description: "Художественные галереи",
			},
			{
				id: "exhibition",
				name: "Выставки",
				icon: "📸",
				description: "Временные выставки",
			},
			{
				id: "library",
				name: "Библиотеки",
				icon: "📚",
				description: "Публичные библиотеки",
			},
			{
				id: "monument",
				name: "Памятники",
				icon: "🗿",
				description: "Исторические памятники",
			},
			{
				id: "architecture",
				name: "Архитектура",
				icon: "🏛️",
				description: "Архитектурные достопримечательности",
			},
		],
	},
	{
		id: "walking",
		name: "Прогулки и отдых",
		icon: "🚶",
		subcategories: [
			{
				id: "park",
				name: "Парки",
				icon: "🌳",
				description: "Городские парки и зелёные зоны",
			},
			{
				id: "square",
				name: "Скверы и бульвары",
				icon: "🌲",
				description: "Скверы, бульвары и небольшие зоны отдыха",
			},
			{
				id: "embankment",
				name: "Набережные",
				icon: "🌊",
				description: "Набережные рек и водоёмов",
			},
			{
				id: "viewpoint",
				name: "Смотровые площадки",
				icon: "👁️",
				description: "Сопки и природные точки с панорамным видом",
			},
			{
				id: "botanical",
				name: "Ботанические и зоосады",
				icon: "🌺",
				description: "Ботанические сады и зооуголки",
			},
			{
				id: "zoo",
				name: "Зоопарки",
				icon: "🦁",
				description: "Зоологические парки и контактные зоопарки",
			},
			{
				id: "city_walk",
				name: "Городские прогулочные маршруты",
				icon: "🚶‍♂️",
				description: "Маршруты по центру города и историческим улицам",
			},
		],
	},
	{
		id: "shopping",
		name: "Шопинг",
		icon: "🛍️",
		subcategories: [
			{
				id: "mall",
				name: "ТРЦ",
				icon: "🏬",
				description: "Крупные торгово-развлекательные центры",
			},
			{
				id: "hypermarket",
				name: "Продуктовые гипермаркеты",
				icon: "🛒",
				description: "Крупные продуктовые магазины и гипермаркеты",
			},
			{
				id: "souvenir",
				name: "Магазины сувениров",
				icon: "🎁",
				description: "Сувениры, подарки и локальные бренды",
			},
			{
				id: "clothes",
				name: "Одежда и обувь",
				icon: "👗",
				description: "Магазины одежды, обуви и аксессуаров",
			},
			{
				id: "electronics",
				name: "Электроника",
				icon: "📱",
				description: "Магазины техники и электроники",
			},
			{
				id: "sport_shop",
				name: "Спортивные магазины",
				icon: "🏈",
				description: "Снаряжение и одежда для спорта и активного отдыха",
			},
			{
				id: "bookstore",
				name: "Книжные магазины",
				icon: "📖",
				description: "Книжные, комикс-шопы и образовательные магазины",
			},
			{
				id: "market",
				name: "Рынки и ярмарки",
				icon: "🧺",
				description: "Фермерские рынки и сезонные ярмарки",
			},
		],
	},
	{
		id: "education",
		name: "Образование",
		icon: "📚",
		subcategories: [
			{
				id: "workshop",
				name: "Мастер-классы",
				icon: "🎓",
				description: "Обучающие мастер-классы",
			},
			{
				id: "lecture",
				name: "Лекции",
				icon: "📝",
				description: "Публичные лекции",
			},
			{
				id: "course",
				name: "Курсы",
				icon: "📖",
				description: "Обучающие курсы",
			},
			{
				id: "seminar",
				name: "Семинары",
				icon: "💼",
				description: "Бизнес-семинары",
			},
		],
	},
	{
		id: "nature",
		name: "Природа",
		icon: "🌳",
		subcategories: [
			{
				id: "forest",
				name: "Леса и таёжные массивы",
				icon: "🌲",
				description: "Лесные массивы рядом с городом",
			},
			{
				id: "lake",
				name: "Озёра и водоёмы",
				icon: "🏞️",
				description: "Озёра, водохранилища и реки",
			},
			{
				id: "mountain",
				name: "Горы и сопки",
				icon: "⛰️",
				description: "Сопки и возвышенности с маршрутами",
			},
			{
				id: "beach",
				name: "Пляжи",
				icon: "🏖️",
				description: "Пляжные зоны у воды",
			},
			{
				id: "reserve",
				name: "Заповедники и ООПТ",
				icon: "🦌",
				description: "Охраняемые природные территории",
			},
			{
				id: "viewpoint_nature",
				name: "Природные смотровые точки",
				icon: "🔭",
				description: "Видовые точки с панорамой на город и природу",
			},
		],
	},
	{
		id: "services",
		name: "Услуги и быт",
		icon: "🧺",
		subcategories: [
			{
				id: "laundry",
				name: "Прачечные",
				icon: "🧼",
				description: "Самообслуживание и прачечные полного цикла",
			},
			{
				id: "dry_cleaner",
				name: "Химчистки",
				icon: "🧴",
				description: "Химчистка одежды, текстиля и спецодежды",
			},
			{
				id: "clothes_repair",
				name: "Ремонт одежды",
				icon: "🪡",
				description: "Ателье и мелкий ремонт одежды",
			},
			{
				id: "shoe_repair",
				name: "Ремонт обуви",
				icon: "👞",
				description: "Мастерские по ремонту обуви",
			},
			{
				id: "copy_center",
				name: "Копицентры и печать",
				icon: "🖨️",
				description: "Печать документов, фото, баннеров и сканирование",
			},
		],
	},
	{
		id: "health",
		name: "Здоровье",
		icon: "⚕️",
		subcategories: [
			{
				id: "pharmacy_24",
				name: "Круглосуточные аптеки",
				icon: "💊",
				description: "Аптеки с круглосуточным режимом работы",
			},
			{
				id: "dentistry",
				name: "Стоматологии",
				icon: "🦷",
				description: "Стоматологические клиники и кабинеты",
			},
			{
				id: "private_clinic",
				name: "Частные клиники",
				icon: "🏥",
				description: "Многопрофильные и специализированные клиники",
			},
			{
				id: "optics",
				name: "Оптики",
				icon: "👓",
				description: "Магазины оптики и проверки зрения",
			},
			{
				id: "spa",
				name: "Спа и релакс",
				icon: "💆",
				description: "Спа-центры, бани и сауны с упором на отдых после смены",
			},
		],
	},
	{
		id: "transport",
		name: "Транспорт",
		icon: "🚉",
		subcategories: [
			{
				id: "airport",
				name: "Аэропорт",
				icon: "✈️",
				description: "Аэропорт и прилегающая инфраструктура",
			},
			{
				id: "train_station",
				name: "ЖД вокзалы",
				icon: "🚆",
				description: "Железнодорожные вокзалы и станции",
			},
			{
				id: "bus_station",
				name: "Автовокзалы",
				icon: "🚌",
				description: "Автовокзалы и крупные автостанции",
			},
			{
				id: "car_rental",
				name: "Аренда авто",
				icon: "🚗",
				description: "Прокат и каршеринг автомобилей",
			},
			{
				id: "tire_service",
				name: "Шиномонтаж",
				icon: "🛞",
				description: "Шиномонтажи и сервисы быстрой помощи машине",
			},
		],
	},
];

/**
 * Получить категорию по ID
 */
export const getCategoryById = (id: string): Category | undefined => {
	return activityCategories.find((cat) => cat.id === id);
};

/**
 * Получить подкатегорию по ID категории и подкатегории
 */
export const getSubcategoryById = (
	categoryId: string,
	subcategoryId: string,
): Subcategory | undefined => {
	const category = getCategoryById(categoryId);
	return category?.subcategories.find((sub) => sub.id === subcategoryId);
};

/**
 * Получить все подкатегории для категории
 */
export const getSubcategoriesByCategory = (
	categoryId: string,
): Subcategory[] => {
	const category = getCategoryById(categoryId);
	return category?.subcategories || [];
};
