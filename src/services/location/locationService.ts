import * as Location from "expo-location";

export type Coordinates = { lat: number; lng: number };

export async function getCurrentCoordinates(): Promise<Coordinates | null> {
	try {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") {
			return null;
		}
		const pos = await Location.getCurrentPositionAsync({
			accuracy: Location.Accuracy.Balanced,
		});
		return {
			lat: pos.coords.latitude,
			lng: pos.coords.longitude,
		};
	} catch {
		return null;
	}
}
