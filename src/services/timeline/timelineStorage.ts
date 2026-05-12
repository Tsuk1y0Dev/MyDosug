import type { TimelineEvent } from "../../types/timeline";

export const TIMELINE_SERVER_META = "\n__MDT__:";

function tryParseJsonArray(raw: string): unknown[] | null {
	let current: unknown = raw;
	for (let i = 0; i < 3; i += 1) {
		if (Array.isArray(current)) return current;
		if (typeof current !== "string") return null;
		const t = current.trim();
		if (!t) return null;
		try {
			current = JSON.parse(t);
		} catch {
			return null;
		}
	}
	return Array.isArray(current) ? current : null;
}

export function timelineEventToServerEventPayload(
	e: TimelineEvent,
): Record<string, string | number> {
	const date = new Date(Math.floor(e.timestamp) * 1000);
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	const durationMinutes = Math.max(
		1,
		Math.floor((Number(e.duration ?? 3600) || 3600) / 60),
	);
	const meta = JSON.stringify({
		ts: Math.floor(e.timestamp),
		sid: e.id,
	});
	const note = (e.note ?? "").trim();
	const description = `${note}${TIMELINE_SERVER_META}${meta}`;

	return {
		pid: e.id,
		coords: "",
		arrival_time: `${hh}:${mm}`,
		duration: durationMinutes,
		travel_time: 0,
		title: e.title,
		description,
	};
}

function parseCalendarDayString(s: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]) - 1;
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
		return null;
	return new Date(y, mo, d);
}

function timestampFromArrivalOnDay(
	arrivalTime: string,
	day: Date,
): number | null {
	const parts = arrivalTime.trim().split(":");
	if (parts.length < 2) return null;
	const hh = parseInt(parts[0], 10);
	const mm = parseInt(parts[1], 10);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	const local = new Date(
		day.getFullYear(),
		day.getMonth(),
		day.getDate(),
		hh,
		mm,
		0,
		0,
	);
	return Math.floor(local.getTime() / 1000);
}

export function normalizeTimelineRow(
	row: unknown,
	fallbackCalendarDay: Date = new Date(),
): TimelineEvent | null {
	if (!row || typeof row !== "object") return null;
	const o = row as Record<string, unknown>;

	if (typeof o.pid === "string" || typeof o.pid === "number") {
		const pid = String(o.pid);
		const title =
			typeof o.title === "string" && o.title.trim() !== ""
				? o.title.trim()
				: "Событие";
		const desc = typeof o.description === "string" ? o.description : "";
		let timestamp: number | undefined;
		let sidFromMeta: string | undefined;
		let noteClean = desc.trim();
		const metaIdx = desc.lastIndexOf(TIMELINE_SERVER_META);
		if (metaIdx >= 0) {
			noteClean = desc.slice(0, metaIdx).trimEnd();
			try {
				const meta = JSON.parse(
					desc.slice(metaIdx + TIMELINE_SERVER_META.length),
				) as { ts?: unknown; sid?: unknown };
				if (typeof meta.ts === "number" && Number.isFinite(meta.ts)) {
					timestamp = Math.floor(meta.ts);
				}
				if (typeof meta.sid === "string" && meta.sid.trim()) {
					sidFromMeta = meta.sid.trim();
				}
			} catch {
			}
		}
		let calendarDay = fallbackCalendarDay;
		if (typeof o.date === "string") {
			const parsed = parseCalendarDayString(o.date);
			if (parsed) calendarDay = parsed;
		}
		if (
			(timestamp == null || !Number.isFinite(timestamp)) &&
			typeof o.arrival_time === "string" &&
			o.arrival_time.trim() !== ""
		) {
			const ts = timestampFromArrivalOnDay(o.arrival_time, calendarDay);
			if (ts != null) timestamp = ts;
		}
		if (timestamp == null || !Number.isFinite(timestamp)) return null;
		const id = sidFromMeta ?? pid;
		const durMin = Number(o.duration);
		const durationSec =
			Number.isFinite(durMin) && durMin > 0 ? Math.round(durMin * 60) : 3600;
		const ev: TimelineEvent = {
			id,
			timestamp,
			title,
			duration: durationSec,
		};
		if (noteClean.length > 0) ev.note = noteClean;
		return ev;
	}

	if (
		typeof o.id === "string" &&
		typeof o.title === "string" &&
		(typeof o.timestamp === "number" || typeof o.timestamp === "string")
	) {
		const ts = Math.floor(Number(o.timestamp));
		if (!Number.isFinite(ts)) return null;
		const e: TimelineEvent = { id: o.id, timestamp: ts, title: o.title };
		if (typeof o.duration === "number") e.duration = o.duration;
		if (typeof o.note === "string") e.note = o.note;
		return e;
	}

	if (typeof o.date === "string" && o.event != null) {
		const tsMs = Date.parse(`${o.date}T12:00:00`);
		const ts = Number.isFinite(tsMs) ? Math.floor(tsMs / 1000) : 0;
		return {
			id: `legacy_${o.date}`,
			timestamp: ts,
			title: String(o.event),
		};
	}

	return null;
}

export function parseTimelineEventsArray(
	arr: unknown,
	fallbackCalendarDay: Date = new Date(),
): TimelineEvent[] {
	if (!Array.isArray(arr)) return [];
	const out: TimelineEvent[] = [];
	for (const row of arr) {
		const e = normalizeTimelineRow(row, fallbackCalendarDay);
		if (e) out.push(e);
	}
	return sortTimelineEvents(out);
}

export function parseTimelineEventsField(
	raw: unknown,
	fallbackCalendarDay: Date = new Date(),
): TimelineEvent[] {
	if (raw == null) return [];
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		const arr = tryParseJsonArray(trimmed);
		return arr
			? parseTimelineEventsArray(arr, fallbackCalendarDay)
			: [];
	}
	if (Array.isArray(raw))
		return parseTimelineEventsArray(raw, fallbackCalendarDay);
	return [];
}

export function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
	return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

export function startOfLocalDaySeconds(d: Date = new Date()): number {
	return Math.floor(
		new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000,
	);
}

export function prunePastTimelineEvents(
	events: TimelineEvent[],
	now: Date = new Date(),
): TimelineEvent[] {
	const cutoff = startOfLocalDaySeconds(now);
	return events.filter((e) => e.timestamp >= cutoff);
}

export function getEventsByDate(
	events: TimelineEvent[],
	date: Date,
): TimelineEvent[] {
	const y = date.getFullYear();
	const m = date.getMonth();
	const d = date.getDate();
	const startSec = Math.floor(new Date(y, m, d, 0, 0, 0, 0).getTime() / 1000);
	const endSec = Math.floor(
		new Date(y, m, d, 23, 59, 59, 999).getTime() / 1000,
	);
	return events
		.filter((e) => e.timestamp >= startSec && e.timestamp <= endSec)
		.sort((a, b) => a.timestamp - b.timestamp);
}
