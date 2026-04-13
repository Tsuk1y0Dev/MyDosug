const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL || "https://chess.electroscope.ru/api";

export interface ApiResponse<T> {
	data: T;
	message?: string;
	error?: string;
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

export async function mockRequest<T>(data: T): Promise<ApiResponse<T>> {
	return { data };
}

class ApiClient {
	private baseURL: string;
	private token: string | null = null;

	constructor(baseURL: string = API_BASE_URL) {
		this.baseURL = baseURL;
	}

	setToken(token: string | null) {
		this.token = token;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<ApiResponse<T>> {
		const url = `${this.baseURL}${endpoint}`;

		const headers = new Headers({
			"Content-Type": "application/json",
		});
		const optHeaders = options.headers;
		if (optHeaders instanceof Headers) {
			optHeaders.forEach((value, key) => headers.set(key, value));
		} else if (optHeaders && typeof optHeaders === "object") {
			Object.entries(optHeaders as Record<string, string>).forEach(([k, v]) => {
				if (v != null) headers.set(k, String(v));
			});
		}
		if (this.token) {
			headers.set("Authorization", `Bearer ${this.token}`);
		}

		try {
			const response = await fetch(url, {
				...options,
				headers,
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: "Unknown error" }));
				throw {
					message: errorData.message || "Request failed",
					code: errorData.code,
					status: response.status,
				} as ApiError;
			}

			const data = await response.json();
			return { data };
		} catch (error) {
			if (error && typeof error === "object" && "status" in error) {
				throw error;
			}
			throw {
				message: error instanceof Error ? error.message : "Network error",
				code: "NETWORK_ERROR",
			} as ApiError;
		}
	}

	async get<T>(
		endpoint: string,
		params?: Record<string, any>,
	): Promise<ApiResponse<T>> {
		const queryString = params
			? "?" + new URLSearchParams(params).toString()
			: "";
		return this.request<T>(endpoint + queryString, { method: "GET" });
	}

	async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: "POST",
			body: JSON.stringify(data),
		});
	}

	async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(data),
		});
	}

	async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: "DELETE" });
	}
}

export const apiClient = new ApiClient();
