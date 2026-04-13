import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useAuth } from "../services/auth/AuthContext";
import { MainNavigator } from "./MainNavigator";
import { RootStackParamList } from "./types";

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
	const { isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="Main" component={MainNavigator} />
		</Stack.Navigator>
	);
};
