import type { RouteEvent } from "../types/route";
import type { TimelineEvent } from "../types/timeline";
import { sortTimelineEvents } from "../services/timeline/timelineStorage";

function startOfLocalDaySec(d: Date): number {
	return Math.floor(
		new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000,
	);
}

function endOfLocalDaySec(d: Date): number {
	return startOfLocalDaySec(d) + 86400 - 1;
}

/** ID для API: osm_* из OpenStreetMap, u_* для кастомных. */
export function timelinePlaceIdFromRouteEvent(ev: RouteEvent): string {
	const raw = (ev.placeId ?? ev.id).trim();
	if (raw.startsWith("osm_") || raw.startsWith("u_")) return raw;
	if (raw.startsWith("ev-") || raw.startsWith("custom")) return `u_${raw}`;
	return `osm_${raw}`;
}

/** События маршрута на календарный день → записи timeline_events. */
export function routeEventsToTimelineEvents(
	events: RouteEvent[],
	day: Date,
): TimelineEvent[] {
	const y = day.getFullYear();
	const m = day.getMonth();
	const d = day.getDate();
	return events.map((ev) => {
		const [hh, mm] = ev.arrivalTime.split(":").map(Number);
		const startLocal = new Date(y, m, d, hh, mm, 0, 0);
		const timestamp = Math.floor(startLocal.getTime() / 1000);
		return {
			id: timelinePlaceIdFromRouteEvent(ev),
			timestamp,
			duration: Math.max(60, ev.duration * 60),
			title: ev.customTitle?.trim() || "Точка маршрута",
		};
	});
}

/** Удаляем события, попавшие на этот календарный день, добавляем из маршрута. */
export function mergeRouteIntoTimeline(
	existing: TimelineEvent[],
	routeEvents: RouteEvent[],
	day: Date,
): TimelineEvent[] {
	const lo = startOfLocalDaySec(day);
	const hi = endOfLocalDaySec(day);
	const kept = existing.filter((e) => e.timestamp < lo || e.timestamp > hi);
	const fromRoute = routeEventsToTimelineEvents(routeEvents, day);
	return sortTimelineEvents([...kept, ...fromRoute]);
}
