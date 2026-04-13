import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useEffect,
	useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiClient } from "../api/client";
import { authApi } from "../api/authApi";

type User = {
	id: string;
	name: string;
	email: string;
};

type AuthContextType = {
	user: User | null;
	isLoading: boolean;
	updateLocalUser: (updates: Partial<Pick<User, "name" | "email">>) => void;
	login: (
		email: string,
		password: string,
	) => Promise<{ success: boolean; error?: string }>;
	register: (
		email: string,
		password: string,
		name: string,
	) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = "@mydosug_token";
const STORAGE_USER_KEY = "@mydosug_user";

type AuthProviderProps = {
	children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadSession();
	}, []);

	const loadSession = async () => {
		try {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token) {
				setUser(null);
				return;
			}

			apiClient.setToken(token);

			const storedUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
			if (storedUser) {
				setUser(JSON.parse(storedUser) as User);
			} else {
				setUser({ id: "", name: "", email: "" });
			}
		} catch (e) {
			console.warn("Auth session load error:", e);
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	const persistSession = async (token: string, userData: User) => {
		await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
		await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
		apiClient.setToken(token);
		setUser(userData);
	};

	const updateLocalUser = useCallback(
		(updates: Partial<Pick<User, "name" | "email">>) => {
			setUser((prev) => {
				if (!prev) return prev;
				const next = { ...prev, ...updates };
				void AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(next));
				return next;
			});
		},
		[],
	);

	const login = async (
		email: string,
		password: string,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			const res = await authApi.login({ email, password });
			const authData = res.data as any;

			const token =
				authData.token ??
				authData.access_token ??
				authData.accessToken ??
				authData.data?.token;

			if (!token) {
				return { success: false, error: "Бэкенд не вернул токен" };
			}

			const apiUser = authData.user ?? authData.me ?? authData.data?.user;
			const userData: User = {
				id: String(apiUser?.id ?? ""),
				name: apiUser?.name ?? "",
				email: apiUser?.email ?? email,
			};

			await persistSession(token, userData);
			return { success: true };
		} catch (e: any) {
			return { success: false, error: e?.message || "Ошибка при входе" };
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (
		email: string,
		password: string,
		name: string,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			const res = await authApi.register({ email, password, name });
			const authData = res.data as any;

			const token =
				authData.token ??
				authData.access_token ??
				authData.accessToken ??
				authData.data?.token;

			if (!token) {
				return { success: false, error: "Бэкенд не вернул токен" };
			}

			const apiUser = authData.user ?? authData.me ?? authData.data?.user;
			const userData: User = {
				id: String(apiUser?.id ?? ""),
				name: apiUser?.name ?? name,
				email: apiUser?.email ?? email,
			};

			await persistSession(token, userData);
			return { success: true };
		} catch (e: any) {
			return {
				success: false,
				error: e?.message || "Ошибка при регистрации",
			};
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async (): Promise<void> => {
		try {
			console.log("Logging out...");
			await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
			await AsyncStorage.removeItem(STORAGE_USER_KEY);
			apiClient.setToken(null);
			setUser(null);
			console.log("Logout done, user is now null");
		} catch (error) {
			console.error("Error logging out:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				updateLocalUser,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
