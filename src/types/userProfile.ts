import type { StartPoint } from "./planner";

export type SavedLocationType = "home" | "office" | "hotel" | "other";

export interface SavedLocation {
	id: string;
	serverIndex?: number;
	type: SavedLocationType;
	name: string;
	icon: string;
	description?: string;
	coords: {
		lat: number;
		lng: number;
	};
}

export interface AccessibilitySettings {
	needsRamp: boolean;
	needsElevator: boolean;
}

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	defaultStartPoint: StartPoint;
	defaultTransportMode: "walking" | "car" | "public";
	notificationsEnabled: boolean;
	vegetarian: boolean;
	wheelchairAccessible: boolean;
	averageWalkingTime: number;
	savedLocations: SavedLocation[];
	accessibilitySettings: AccessibilitySettings;
}
