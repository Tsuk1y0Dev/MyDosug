import type { RouteEvent, RouteOrigin, RouteSegment } from "../types/route";
import { minutesToTime, timeToMinutes } from "./timingUtils";

/** Начало «дня плана» в минутах от полуночи (00:00). */
const DAY_START_MINUTES = 0;

function haversineKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Грубая оценка езды между точками (город). */
export function estimateDriveMinutesBetween(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
): number {
	const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
	const speedKmh = 32;
	return Math.max(3, Math.min(180, Math.round((km / speedKmh) * 60)));
}

function clampToDayMinutes(total: number): number {
	return Math.max(0, Math.min(total, 23 * 60 + 59));
}

export type RouteInsertTiming = {
	/** Рекомендуемое время прибытия HH:mm */
	suggestedArrival: string;
	/** Минимально допустимые минуты от полуночи для прибытия */
	minArrivalMinutes: number;
	/** Подпись для сообщения о конфликте */
	blockingLabel: string;
};

/**
 * Расчёт минимального времени прибытия и подсказки для новой точки,
 * вставляемой в позицию insertIndex (0 = первой в списке).
 */
export function getRouteInsertTiming(args: {
	events: RouteEvent[];
	segments: RouteSegment[];
	origin: RouteOrigin | null;
	insertIndex: number;
	newCoords: { lat: number; lng: number };
	/** Не раньше текущего времени (для «сегодня»), минуты от полуночи. */
	floorMinutes?: number;
}): RouteInsertTiming {
	const { events, origin, insertIndex, newCoords, floorMinutes = 0 } = args;
	const floor = clampToDayMinutes(Math.max(0, floorMinutes));
	const useOriginLeg =
		origin != null && origin.id !== "from_first_stop";

	if (insertIndex <= 0) {
		if (useOriginLeg && origin) {
			const travel = estimateDriveMinutesBetween(origin.coords, newCoords);
			const min = clampToDayMinutes(
				Math.max(DAY_START_MINUTES + travel, floor),
			);
			return {
				suggestedArrival: minutesToTime(min),
				minArrivalMinutes: min,
				blockingLabel: origin.label || "Старт маршрута",
			};
		}
		const min = clampToDayMinutes(Math.max(DAY_START_MINUTES, floor));
		return {
			suggestedArrival: minutesToTime(min),
			minArrivalMinutes: min,
			blockingLabel: "начала дня",
		};
	}

	const prev = events[insertIndex - 1];
	const prevTitle = prev.customTitle?.trim() || "Предыдущая точка";
	const prevEnd = timeToMinutes(prev.arrivalTime) + prev.duration;
	const travel = estimateDriveMinutesBetween(prev.coords, newCoords);
	/** Минимум без «логистики»: не раньше окончания предыдущей точки. */
	const minNoTravel = clampToDayMinutes(Math.max(prevEnd, floor));
	const suggested = clampToDayMinutes(Math.max(prevEnd + travel, floor));
	return {
		suggestedArrival: minutesToTime(suggested),
		minArrivalMinutes: minNoTravel,
		blockingLabel: prevTitle,
	};
}
