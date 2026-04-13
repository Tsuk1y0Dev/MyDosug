export const config = {
	apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.mydosug.ru/api",

	timeline: {
		startHour: 6,
		endHour: 22,
		hourHeight: 80,
	},

	search: {
		defaultRadius: 5000, // метры
		defaultLimit: 20,
	},

	routes: {
		defaultTransportType: "walking" as const,
		walkingSpeed: 5, // км/ч
		cyclingSpeed: 15,
		carSpeed: 50,
		publicTransportSpeed: 30,
	},

	user: {
		defaultMaxWalkingMinutes: 15,
		defaultTransportMode: "walking" as const,
	},

	version: "1.0.0",
};
