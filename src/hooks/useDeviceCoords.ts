import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";

export type DeviceCoords = { lat: number; lng: number };

export type UseDeviceCoordsResult = {
	coords: DeviceCoords | null;
	refresh: () => Promise<void>;
	refreshing: boolean;
};

async function readPosition(): Promise<DeviceCoords | null> {
	try {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") return null;
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

export function useDeviceCoords(): UseDeviceCoordsResult {
	const [coords, setCoords] = useState<DeviceCoords | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const c = await readPosition();
			if (!cancelled && c) setCoords(c);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		try {
			const c = await readPosition();
			if (c) setCoords(c);
		} finally {
			setRefreshing(false);
		}
	}, []);

	return { coords, refresh, refreshing };
}
