export type ActivityType =
  | 'food'
  | 'entertainment'
  | 'sports'
  | 'culture'
  | 'walking'
  | 'shopping'
  | 'education'
  | 'nature'
  | 'custom';

export type MoodType = 'relax' | 'educational' | 'fun' | 'romantic' | 'active';

export type CompanyType = 'solo' | 'couple' | 'friends' | 'kids' | 'colleagues';

export type TransportMode = 'walking' | 'car' | 'public' | 'cycling';

export interface Place {
  id: string;
  name: string;
  type: ActivityType;
  address: string;
  description: string;
  priceLevel: number;
  averageBill?: number;
  rating: number;
  distance: number;
  travelTime: number;
  durationSettings?: {
    baseDuration: number;
    modifiers?: Record<string, any>;
  };
  image?: string;
  website?: string;
  workingHours?: string;
  features: {
    wheelchair: boolean;
    vegetarian: boolean;
    outdoor: boolean;
    childFriendly: boolean;
  };
  coordinates: { lat: number; lng: number };
}

export interface RouteActivity {
  id: string;
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeFromPrevious: number;
  order: number;
}

export interface RoutePlan {
  id: string;
  activities: RouteActivity[];
  totalDuration: number;
  totalCost: number;
  startPoint?: { type: string; address: string };
}

export interface StartPoint {
  type: 'home' | 'work' | 'current' | 'custom';
  address: string;
  label?: string;
}
