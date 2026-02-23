export type TravelMode = 'walking' | 'driving' | 'transit';

export interface RouteEvent {
  id: string;
  placeId?: string;
  customTitle?: string;
  coords: {
    lat: number;
    lng: number;
  };
  arrivalTime: string; // HH:mm
  duration: number; // minutes
  travelModeToNext: TravelMode;
}

export interface RouteSegmentGeometry {
  polyline: string;
}

export interface RouteSegment {
  fromEventId: string;
  toEventId: string;
  distanceMeters: number;
  durationMinutes: number;
  travelMode: TravelMode;
  geometry: RouteSegmentGeometry;
}

export interface RouteOrigin {
  id: string;
  label: string;
  coords: {
    lat: number;
    lng: number;
  };
}

export interface DayRouteState {
  origin: RouteOrigin | null;
  events: RouteEvent[];
  segments: RouteSegment[];
  cachedPolyline: string | null;
}

