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

export function timelinePlaceIdFromRouteEvent(ev: RouteEvent): string {
	const raw = (ev.placeId ?? ev.id).trim();
	if (raw.startsWith("osm_") || raw.startsWith("u_")) return raw;
	if (raw.startsWith("ev-") || raw.startsWith("custom")) return `u_${raw}`;
	return `osm_${raw}`;
}

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

/** Build planner stops from server/user timeline rows for a calendar day. */
export function timelineEventsToRouteEvents(
	events: TimelineEvent[],
): RouteEvent[] {
	return events.map((e, index) => {
		const d = new Date(Math.floor(e.timestamp) * 1000);
		const hh = String(d.getHours()).padStart(2, "0");
		const mm = String(d.getMinutes()).padStart(2, "0");
		const durMin = Math.max(
			1,
			Math.round((Number(e.duration ?? 3600) || 3600) / 60),
		);
		return {
			id: `tl_${Math.floor(e.timestamp)}_${String(e.id).replace(/[^a-zA-Z0-9_-]/g, "_")}_${index}`,
			placeId: e.id,
			customTitle: e.title,
			coords: { lat: 0, lng: 0 },
			arrivalTime: `${hh}:${mm}`,
			duration: durMin,
			travelModeToNext: "walking",
			...(e.note?.trim() ? { description: e.note.trim() } : {}),
		};
	});
}
