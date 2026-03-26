import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
	id: string;
	name: string;
	email: string;
};

type AuthContextType = {
	user: User | null;
	isLoading: boolean;
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

const STORAGE_KEY = "@mydosug_user";
const USERS_KEY = "@mydosug_users";

type AuthProviderProps = {
	children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Загружаем сохраненного пользователя при старте
	useEffect(() => {
		loadUser();
	}, []);

	const loadUser = async () => {
		try {
			const userData = await AsyncStorage.getItem(STORAGE_KEY);
			if (userData) {
				setUser(JSON.parse(userData));
			}
		} catch (error) {
			console.error("Error loading user:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const saveUser = async (userData: User) => {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
			setUser(userData);
		} catch (error) {
			console.error("Error saving user:", error);
		}
	};

	const login = async (
		email: string,
		password: string,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			// Получаем список пользователей
			const usersData = await AsyncStorage.getItem(USERS_KEY);
			const users: Array<{ email: string; password: string; user: User }> =
				usersData ? JSON.parse(usersData) : [];

			// Ищем пользователя
			const foundUser = users.find(
				(u) => u.email === email && u.password === password,
			);

			if (!foundUser) {
				setIsLoading(false);
				return { success: false, error: "Неверный email или пароль" };
			}

			await saveUser(foundUser.user);
			setIsLoading(false);
			return { success: true };
		} catch (error) {
			setIsLoading(false);
			return { success: false, error: "Ошибка при входе" };
		}
	};

	const register = async (
		email: string,
		password: string,
		name: string,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			// Валидация
			if (!email || !password || !name) {
				setIsLoading(false);
				return { success: false, error: "Заполните все поля" };
			}

			if (password.length < 6) {
				setIsLoading(false);
				return {
					success: false,
					error: "Пароль должен быть не менее 6 символов",
				};
			}

			// Проверяем, существует ли пользователь
			const usersData = await AsyncStorage.getItem(USERS_KEY);
			const users: Array<{ email: string; password: string; user: User }> =
				usersData ? JSON.parse(usersData) : [];

			if (users.find((u) => u.email === email)) {
				setIsLoading(false);
				return {
					success: false,
					error: "Пользователь с таким email уже существует",
				};
			}

			// Создаем нового пользователя
			const newUser: User = {
				id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				name: name,
				email: email,
			};

			// Сохраняем пользователя в список
			users.push({ email, password, user: newUser });
			await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

			// Автоматически входим
			await saveUser(newUser);
			setIsLoading(false);
			return { success: true };
		} catch (error) {
			setIsLoading(false);
			return { success: false, error: "Ошибка при регистрации" };
		}
	};

	const logout = async (): Promise<void> => {
		try {
			await AsyncStorage.removeItem(STORAGE_KEY);
			setUser(null);
		} catch (error) {
			console.error("Error logging out:", error);
		}
	};

	return (
		<AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
