export interface RegisterResponse {
	token: string;
	messag?: string;
}

export interface ApiError {
	message: string;
	errors?: Record<string, string[]>;
}
