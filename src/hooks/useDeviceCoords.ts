import { useState, useEffect } from "react";
import * as Location from "expo-location";

export type DeviceCoords = { lat: number; lng: number };

/**
 * Текущие координаты устройства (после разрешения). Без Читы и прочих запасных точек.
 */
export function useDeviceCoords(): DeviceCoords | null {
	const [coords, setCoords] = useState<DeviceCoords | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted" || cancelled) return;
				const pos = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});
				if (cancelled) return;
				setCoords({
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				});
			} catch {
				// остаётся null
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return coords;
}
