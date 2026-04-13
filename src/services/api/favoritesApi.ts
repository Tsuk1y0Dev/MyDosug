import { apiClient, mockRequest, ApiResponse } from "./client";

export interface Favorite {
	id: number;
	user_id: number;
	place_id: number;
	type: string;
	sort_order: number;
	folder?: string;
	tags?: string[];
	notes?: string;
}

export interface CreateFavoriteRequest {
	place_id: number;
	type?: string;
	folder?: string;
	tags?: string[];
	notes?: string;
}

export interface UpdateFavoriteRequest {
	sort_order?: number;
	folder?: string;
	tags?: string[];
	notes?: string;
}

const mockFavorites: Favorite[] = [];
let mockFavoriteIdCounter = 1;

export const favoritesApi = {
	async getFavorites(): Promise<ApiResponse<Favorite[]>> {
		return mockRequest<Favorite[]>(mockFavorites);
	},

	async createFavorite(
		data: CreateFavoriteRequest,
	): Promise<ApiResponse<Favorite>> {
		const existing = mockFavorites.find((f) => f.place_id === data.place_id);
		if (existing) {
			throw {
				message: "Место уже в избранном",
				code: "ALREADY_EXISTS",
				status: 400,
			};
		}

		const newFavorite: Favorite = {
			id: mockFavoriteIdCounter++,
			user_id: 1,
			place_id: data.place_id,
			type: data.type || "default",
			sort_order: mockFavorites.length,
			folder: data.folder,
			tags: data.tags,
			notes: data.notes,
		};

		mockFavorites.push(newFavorite);

		return mockRequest<Favorite>(newFavorite);
	},

	async updateFavorite(
		id: number,
		data: UpdateFavoriteRequest,
	): Promise<ApiResponse<Favorite>> {
		const index = mockFavorites.findIndex((f) => f.id === id);
		if (index === -1) {
			throw { message: "Избранное не найдено", code: "NOT_FOUND", status: 404 };
		}

		mockFavorites[index] = { ...mockFavorites[index], ...data };

		return mockRequest<Favorite>(mockFavorites[index]);
	},

	async deleteFavorite(id: number): Promise<ApiResponse<void>> {
		const index = mockFavorites.findIndex((f) => f.id === id);
		if (index === -1) {
			throw { message: "Избранное не найдено", code: "NOT_FOUND", status: 404 };
		}

		mockFavorites.splice(index, 1);

		return mockRequest<void>(undefined);
	},
};
