import { apiClient, ApiResponse } from "./client";

export interface RegisterRequest {
	email: string;
	password: string;
	name: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface AuthResponse {
	token: string;
	refreshToken: string;
	user: {
		id: number;
		email: string;
		name: string;
		avatar_url?: string;
	};
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

export interface RefreshTokenResponse {
	token: string;
	refreshToken: string;
}

// Регистрация
export const authApi = {
	async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
		return apiClient.post<AuthResponse>("/auth/register", data);
	},

	async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
		return apiClient.post<AuthResponse>("/auth/login", data);
	},

	async refreshToken(
		data: RefreshTokenRequest,
	): Promise<ApiResponse<RefreshTokenResponse>> {
		return apiClient.post<RefreshTokenResponse>("/auth/refresh", data);
	},
};
