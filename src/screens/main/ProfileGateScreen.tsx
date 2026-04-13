import React from "react";
import { useAuth } from "../../services/auth/AuthContext";
import { AuthNavigator } from "../../navigation/AuthNavigator";
import { ProfileScreen } from "./ProfileScreen";

export const ProfileGateScreen = () => {
	const { user } = useAuth();
	if (!user) {
		return <AuthNavigator />;
	}
	return <ProfileScreen />;
};
