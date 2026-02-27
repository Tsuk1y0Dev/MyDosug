export type RoutingMode = 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';

export interface RoutingLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoutingResult {
  legs: RoutingLeg[];
}

const ROUTING_URL = 'https://api.routing.yandex.net/v2/route';

const getApiKey = () =>
  process.env.EXPO_PUBLIC_YANDEX_ROUTING_API_KEY ||
  process.env.YANDEX_ROUTING_API_KEY ||
  '';

const buildWaypoints = (points: { lat: number; lng: number }[]) =>
  points.map(p => `${p.lat},${p.lng}`).join('|');

export const YandexRoutingService = {
  async getRoute(
    points: { lat: number; lng: number }[],
    mode: RoutingMode = 'driving'
  ): Promise<RoutingResult | null> {
    if (points.length < 2) return null;
    const apikey = getApiKey();
    if (!apikey) return null;

    const params = new URLSearchParams();
    params.set('waypoints', buildWaypoints(points));
    params.set('mode', mode);
    params.set('apikey', apikey);
    params.set('traffic', 'disabled');

    const response = await fetch(`${ROUTING_URL}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const routes = Array.isArray(json.routes) ? json.routes : [];
    const active = routes[0];
    if (!active || !Array.isArray(active.legs)) {
      return null;
    }

    const legs: RoutingLeg[] = active.legs.map((leg: any) => {
      const distanceMeters =
        typeof leg.distance?.value === 'number' ? leg.distance.value : 0;
      const durationSeconds =
        typeof leg.duration?.value === 'number' ? leg.duration.value : 0;
      return { distanceMeters, durationSeconds };
    });

    return { legs };
  },
};

