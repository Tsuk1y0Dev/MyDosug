import type { TimelineEvent } from "../../types/timeline";

function tryParseJsonArray(raw: string): unknown[] | null {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v : null;
	} catch {
		return null;
	}
}

/** Одна запись из API → нормализованное событие (новый или legacy-формат). */
export function normalizeTimelineRow(row: unknown): TimelineEvent | null {
	if (!row || typeof row !== "object") return null;
	const o = row as Record<string, unknown>;

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

export function parseTimelineEventsArray(arr: unknown): TimelineEvent[] {
	if (!Array.isArray(arr)) return [];
	const out: TimelineEvent[] = [];
	for (const row of arr) {
		const e = normalizeTimelineRow(row);
		if (e) out.push(e);
	}
	return sortTimelineEvents(out);
}

/** Поле timeline_events с API (строка JSON или массив). */
export function parseTimelineEventsField(raw: unknown): TimelineEvent[] {
	if (raw == null) return [];
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		const arr = tryParseJsonArray(trimmed);
		return arr ? parseTimelineEventsArray(arr) : [];
	}
	if (Array.isArray(raw)) return parseTimelineEventsArray(raw);
	return [];
}

export function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
	return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

/** Начало локального календарного дня в секундах (Unix). */
export function startOfLocalDaySeconds(d: Date = new Date()): number {
	return Math.floor(
		new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000,
	);
}

/** Оставить только «сегодня» и будущее (по локальному календарю). */
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
