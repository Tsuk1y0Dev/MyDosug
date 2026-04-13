import { apiClient, mockRequest, ApiResponse } from "./client";

export interface RoutePoint {
	latitude: number;
	longitude: number;
	address?: string;
}

export interface CalculateRouteRequest {
	from: RoutePoint;
	to: RoutePoint;
	transport_type?: "walking" | "cycling" | "car" | "public";
}

export interface RouteSegment {
	distance: number; // метры
	duration: number; // секунды
	polyline: string; // полилиния от Яндекс.Карт
	instructions?: string[];
}

export interface CalculateRouteResponse {
	segments: RouteSegment[];
	total_distance: number; // метры
	total_duration: number; // секунды
	polyline: string;
}

export interface RouteMatrixRequest {
	origins: RoutePoint[];
	destinations: RoutePoint[];
	transport_type?: "walking" | "cycling" | "car" | "public";
}

export interface RouteMatrixResponse {
	matrix: Array<{
		from_index: number;
		to_index: number;
		distance: number; // метры
		duration: number; // секунды
	}>;
}

export interface GeocodeRequest {
	address: string;
}

export interface GeocodeResponse {
	latitude: number;
	longitude: number;
	address: string;
	formatted_address: string;
}

export const routesApi = {
	async calculateRoute(
		data: CalculateRouteRequest,
	): Promise<ApiResponse<CalculateRouteResponse>> {
		const R = 6371000;
		const lat1 = (data.from.latitude * Math.PI) / 180;
		const lat2 = (data.to.latitude * Math.PI) / 180;
		const deltaLat = ((data.to.latitude - data.from.latitude) * Math.PI) / 180;
		const deltaLon =
			((data.to.longitude - data.from.longitude) * Math.PI) / 180;

		const a =
			Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
			Math.cos(lat1) *
				Math.cos(lat2) *
				Math.sin(deltaLon / 2) *
				Math.sin(deltaLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = R * c;

		const speeds: Record<string, number> = {
			walking: 5, // км/ч
			cycling: 15,
			car: 50,
			public: 30,
		};

		const speed = speeds[data.transport_type || "walking"] || 5;
		const duration = (distance / 1000 / speed) * 3600; // секунды

		const mockPolyline = `mock_polyline_${data.from.latitude}_${data.from.longitude}_${data.to.latitude}_${data.to.longitude}`;

		return mockRequest<CalculateRouteResponse>({
			segments: [
				{
					distance: Math.round(distance),
					duration: Math.round(duration),
					polyline: mockPolyline,
					instructions: [
						`Начать движение от ${data.from.address || "точки отправления"}`,
						`Следовать к ${data.to.address || "точке назначения"}`,
					],
				},
			],
			total_distance: Math.round(distance),
			total_duration: Math.round(duration),
			polyline: mockPolyline,
		});
	},

	async getRouteMatrix(
		data: RouteMatrixRequest,
	): Promise<ApiResponse<RouteMatrixResponse>> {
		const matrix: RouteMatrixResponse["matrix"] = [];

		data.origins.forEach((origin, originIndex) => {
			data.destinations.forEach((destination, destIndex) => {
				const R = 6371000;
				const lat1 = (origin.latitude * Math.PI) / 180;
				const lat2 = (destination.latitude * Math.PI) / 180;
				const deltaLat =
					((destination.latitude - origin.latitude) * Math.PI) / 180;
				const deltaLon =
					((destination.longitude - origin.longitude) * Math.PI) / 180;

				const a =
					Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
					Math.cos(lat1) *
						Math.cos(lat2) *
						Math.sin(deltaLon / 2) *
						Math.sin(deltaLon / 2);
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
				const distance = R * c;

				const speeds: Record<string, number> = {
					walking: 5,
					cycling: 15,
					car: 50,
					public: 30,
				};

				const speed = speeds[data.transport_type || "walking"] || 5;
				const duration = (distance / 1000 / speed) * 3600;

				matrix.push({
					from_index: originIndex,
					to_index: destIndex,
					distance: Math.round(distance),
					duration: Math.round(duration),
				});
			});
		});

		return mockRequest<RouteMatrixResponse>({ matrix });
	},

	async geocode(data: GeocodeRequest): Promise<ApiResponse<GeocodeResponse>> {
		return mockRequest<GeocodeResponse>({
			latitude: 52.0339,
			longitude: 113.501,
			address: data.address,
			formatted_address: data.address,
		});
	},
};
