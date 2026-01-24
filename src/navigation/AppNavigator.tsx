import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useAuth } from "../services/auth/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { RootStackParamList } from "./types";

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
	const { user, isLoading } = useAuth();

	// Показываем главный экран даже без авторизации (гостевой режим)
	// Пользователь может использовать приложение, но избранное не будет работать
	if (isLoading) {
		return null; // Можно показать загрузку
	}

	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="Main" component={MainNavigator} />
			{!user && (
				<Stack.Screen
					name="Auth"
					component={AuthNavigator}
					options={{ presentation: "modal" }}
				/>
			)}
		</Stack.Navigator>
	);
};

