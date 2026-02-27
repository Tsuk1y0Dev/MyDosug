import { apiClient, mockRequest, ApiResponse } from './client';
import { Place } from '../../types/planner';
import { OSMService } from '../osm/OSMService';

export interface PlaceResponse {
  id: number;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  opens_at?: string;
  closes_at?: string;
  works_on_weekends: boolean;
  price_level: 1 | 2 | 3 | 4 | 5;
  avg_price_per_person?: number;
  category_id: number;
  features: {
    vegetarian?: boolean;
    wifi?: boolean;
    disabled_access?: boolean;
    outdoor?: boolean;
    child_friendly?: boolean;
    parking?: boolean;
    [key: string]: boolean | undefined;
  };
  average_duration: number;
  min_people?: number;
  max_people?: number;
  average_rating: number;
  user_ratings_total: number;
  main_photo_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  parent_id?: number;
  path: string;
  level: number;
  is_leaf: boolean;
  display_order: number;
}

export interface PlacesSearchRequest {
  category_id?: number;
  price_min?: number;
  price_max?: number;
  people_count?: number;
  features?: {
    vegetarian?: boolean;
    wifi?: boolean;
    disabled_access?: boolean;
    outdoor?: boolean;
    child_friendly?: boolean;
    [key: string]: boolean | undefined;
  };
  max_travel_time?: number; // минуты от текущей точки
  mood?: 'romantic' | 'family' | 'friends' | 'solo' | 'work';
  open_now?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // метры
  limit?: number;
  offset?: number;
}

export interface PlacesSearchResponse {
  places: PlaceResponse[];
  total: number;
  limit: number;
  offset: number;
}

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Еда',
    icon: '🍽️',
    level: 0,
    is_leaf: false,
    path: '1',
    display_order: 1,
  },
  {
    id: 2,
    name: 'Развлечения',
    icon: '🎭',
    level: 0,
    is_leaf: false,
    path: '2',
    display_order: 2,
  },
  {
    id: 3,
    name: 'Спорт',
    icon: '⚽',
    level: 0,
    is_leaf: false,
    path: '3',
    display_order: 3,
  },
  {
    id: 4,
    name: 'Культура',
    icon: '🎨',
    level: 0,
    is_leaf: false,
    path: '4',
    display_order: 4,
  },
  {
    id: 5,
    name: 'Прогулка',
    icon: '🚶',
    level: 0,
    is_leaf: false,
    path: '5',
    display_order: 5,
  },
  {
    id: 6,
    name: 'Шопинг',
    icon: '🛍️',
    level: 0,
    is_leaf: false,
    path: '6',
    display_order: 6,
  },
];

const convertPlaceToResponse = (place: Place, id: number): PlaceResponse => {
  return {
    id,
    name: place.name,
    description: place.description,
    address: place.address,
    latitude: place.coordinates.lat,
    longitude: place.coordinates.lng,
    website: place.website,
    opens_at: place.workingHours.includes('-') ? place.workingHours.split('-')[0] : undefined,
    closes_at: place.workingHours.includes('-') ? place.workingHours.split('-')[1] : undefined,
    works_on_weekends: true,
    price_level: place.priceLevel,
    avg_price_per_person: place.averageBill,
    category_id: getCategoryIdByType(place.type),
    features: {
      vegetarian: place.features.vegetarian,
      disabled_access: place.features.wheelchair,
      outdoor: place.features.outdoor,
      child_friendly: place.features.childFriendly,
    },
    average_duration: place.durationSettings.baseDuration,
    average_rating: place.rating,
    user_ratings_total: Math.floor(Math.random() * 100) + 10,
    main_photo_url: place.image,
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

const getCategoryIdByType = (type: Place['type']): number => {
  const mapping: Record<Place['type'], number> = {
    food: 1,
    entertainment: 2,
    sports: 3,
    culture: 4,
    walking: 5,
    shopping: 6,
    education: 4,
    nature: 5,
    custom: 1,
  };
  return mapping[type] || 1;
};

export const placesApi = {
  /**
   * Поиск мест
   * POST /api/places/search
   */
  async searchPlaces(data: PlacesSearchRequest): Promise<ApiResponse<PlacesSearchResponse>> {
    const centerLat = data.latitude ?? 52.0339;
    const centerLng = data.longitude ?? 113.501;
    const radius = data.radius ?? 2000;

    const osmPlaces = await OSMService.searchAround(
      { lat: centerLat, lng: centerLng },
      radius
    );

    let results = osmPlaces.map((p, index) =>
      convertPlaceToResponse(
        {
          id: String(index + 1),
          name: p.title,
          type: 'food',
          address: p.address || '',
          description: p.description,
          priceLevel: 2,
          averageBill: undefined,
          rating: p.rating,
          distance: 0,
          travelTime: 0,
          durationSettings: {
            baseDuration: 60,
            modifiers: {
              company: {
                solo: 1,
                couple: 1,
                friends: 1,
                kids: 1,
                colleagues: 1,
              },
              mood: {
                relax: 1,
                educational: 1,
                fun: 1,
                romantic: 1,
                active: 1,
              },
            },
          },
          image: '',
          website: undefined,
          workingHours: '',
          features: {
            wheelchair: p.accessibility.wheelchairAccessible,
            vegetarian: false,
            outdoor: p.accessibility.parkingNearby,
            childFriendly: false,
          },
          coordinates: {
            lat: p.coords.lat,
            lng: p.coords.lng,
          },
        } as Place,
        index + 1
      )
    );

    if (data.price_min !== undefined) {
      results = results.filter(p => (p.avg_price_per_person || 0) >= data.price_min!);
    }
    if (data.price_max !== undefined) {
      results = results.filter(p => (p.avg_price_per_person || 0) <= data.price_max!);
    }
    if (data.price_min !== undefined) {
      results = results.filter(p => (p.avg_price_per_person || 0) >= data.price_min!);
    }
    if (data.price_max !== undefined) {
      results = results.filter(p => (p.avg_price_per_person || 0) <= data.price_max!);
    }
    if (data.features) {
      Object.entries(data.features).forEach(([key, value]) => {
        if (value !== undefined) {
          results = results.filter(p => p.features[key] === value);
        }
      });
    }
    if (data.people_count !== undefined) {
      results = results.filter(p => {
        const min = p.min_people || 1;
        const max = p.max_people || 100;
        return data.people_count! >= min && data.people_count! <= max;
      });
    }

    const total = results.length;
    const limit = data.limit || 20;
    const offset = data.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return mockRequest<PlacesSearchResponse>({
      places: paginatedResults,
      total,
      limit,
      offset,
    });
  },

  async getPlace(id: number): Promise<ApiResponse<PlaceResponse>> {
    const center = { lat: 52.0339, lng: 113.501 };
    const osmPlaces = await OSMService.searchAround(center, 2000);
    const raw = osmPlaces[id - 1];
    if (!raw) {
      throw { message: 'Место не найдено', code: 'NOT_FOUND', status: 404 };
    }

    const place: Place = {
      id: String(id),
      name: raw.title,
      type: 'food',
      address: raw.address || '',
      description: raw.description,
      priceLevel: 2,
      averageBill: undefined,
      rating: raw.rating,
      distance: 0,
      travelTime: 0,
      durationSettings: {
        baseDuration: 60,
        modifiers: {
          company: {
            solo: 1,
            couple: 1,
            friends: 1,
            kids: 1,
            colleagues: 1,
          },
          mood: {
            relax: 1,
            educational: 1,
            fun: 1,
            romantic: 1,
            active: 1,
          },
        },
      },
      image: '',
      website: undefined,
      workingHours: '',
      features: {
        wheelchair: raw.accessibility.wheelchairAccessible,
        vegetarian: false,
        outdoor: raw.accessibility.parkingNearby,
        childFriendly: false,
      },
      coordinates: {
        lat: raw.coords.lat,
        lng: raw.coords.lng,
      },
    };

    return mockRequest<PlaceResponse>(convertPlaceToResponse(place, id));
  },

  async getCategories(parentId?: number): Promise<ApiResponse<Category[]>> {
    let categories = mockCategories;
    
    if (parentId !== undefined) {
      categories = categories.filter(cat => cat.parent_id === parentId);
    } else {
      categories = categories.filter(cat => cat.level === 0);
    }

    return mockRequest<Category[]>(categories);
  },
};

