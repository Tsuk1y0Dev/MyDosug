import { apiClient, mockRequest, ApiResponse } from "./client";

export interface UserProfile {
	id: number;
	email: string;
	name: string;
	avatar_url?: string;
	max_walking_minutes: number;
	preferred_transport: "walking" | "car" | "public";
	dietary_restrictions: string[];
	accessibility_needs: string[];
	budget_preference: "low" | "medium" | "high";
	has_children: boolean;
	children_ages: number[];
	default_start_location_type: "home" | "work" | "current" | "custom";
}

export interface UpdateProfileRequest {
	name?: string;
	avatar_url?: string;
	max_walking_minutes?: number;
	preferred_transport?: "walking" | "car" | "public";
	dietary_restrictions?: string[];
	accessibility_needs?: string[];
	budget_preference?: "low" | "medium" | "high";
	has_children?: boolean;
	children_ages?: number[];
	default_start_location_type?: "home" | "work" | "current" | "custom";
}

export interface SavedLocation {
	id: number;
	user_id: number;
	name: string;
	type: "home" | "work" | "study" | "gym" | "custom";
	address: string;
	latitude: number;
	longitude: number;
	icon?: string;
	is_default_start: boolean;
}

export interface CreateSavedLocationRequest {
	name: string;
	type: "home" | "work" | "study" | "gym" | "custom";
	address: string;
	latitude: number;
	longitude: number;
	icon?: string;
	is_default_start?: boolean;
}

export interface UserLocationAddData {
	lat: number;
	long: number;
	name: string;
	description?: string;
}

export type UserLocationUpdateData = Partial<
	Omit<UserLocationAddData, "lat" | "long" | "name">
> & {
	lat: number;
	long: number;
	name?: string;
};

let mockProfile: UserProfile | null = null;
const mockSavedLocations: SavedLocation[] = [];
let mockLocationIdCounter = 1;

export const userApi = {
	async getProfile(): Promise<ApiResponse<UserProfile>> {
		if (!mockProfile) {
			mockProfile = {
				id: 1,
				email: "user@example.com",
				name: "Пользователь",
				max_walking_minutes: 15,
				preferred_transport: "walking",
				dietary_restrictions: [],
				accessibility_needs: [],
				budget_preference: "medium",
				has_children: false,
				children_ages: [],
				default_start_location_type: "current",
			};
		}

		return mockRequest<UserProfile>(mockProfile);
	},

	async updateProfile(
		data: UpdateProfileRequest,
	): Promise<ApiResponse<UserProfile>> {
		if (!mockProfile) {
			await this.getProfile();
		}

		if (mockProfile) {
			mockProfile = { ...mockProfile, ...data };
		}

		return mockRequest<UserProfile>(mockProfile!);
	},

	async getSavedLocations(): Promise<ApiResponse<SavedLocation[]>> {
		return mockRequest<SavedLocation[]>(mockSavedLocations);
	},

	async createSavedLocation(
		data: CreateSavedLocationRequest,
	): Promise<ApiResponse<SavedLocation>> {
		const newLocation: SavedLocation = {
			id: mockLocationIdCounter++,
			user_id: 1,
			...data,
			is_default_start: data.is_default_start ?? false,
		};

		mockSavedLocations.push(newLocation);

		return mockRequest<SavedLocation>(newLocation);
	},

	async updateSavedLocation(
		id: number,
		data: Partial<CreateSavedLocationRequest>,
	): Promise<ApiResponse<SavedLocation>> {
		const index = mockSavedLocations.findIndex((loc) => loc.id === id);
		if (index === -1) {
			throw { message: "Локация не найдена", code: "NOT_FOUND", status: 404 };
		}

		mockSavedLocations[index] = { ...mockSavedLocations[index], ...data };

		return mockRequest<SavedLocation>(mockSavedLocations[index]);
	},

	async deleteSavedLocation(id: number): Promise<ApiResponse<void>> {
		const index = mockSavedLocations.findIndex((loc) => loc.id === id);
		if (index === -1) {
			throw { message: "Локация не найдена", code: "NOT_FOUND", status: 404 };
		}

		mockSavedLocations.splice(index, 1);

		return mockRequest<void>(undefined);
	},

	async addUserLocation(
		token: string,
		data: UserLocationAddData,
	): Promise<ApiResponse<any>> {
		return apiClient.post<any>("/user/locations/add", { token, data });
	},

	async updateUserLocation(
		token: string,
		id: number,
		data: UserLocationAddData,
	): Promise<ApiResponse<any>> {
		return apiClient.post<any>("/user/locations/update", { token, id, data });
	},

	async removeUserLocation(
		token: string,
		id: number,
	): Promise<ApiResponse<void>> {
		return apiClient.post<void>("/user/locations/remove", { token, id });
	},
};
