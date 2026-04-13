import type { OSMPlace } from "../services/osm/OSMService";

const DAY_ABBREV: Record<string, number> = {
	su: 0,
	mo: 1,
	tu: 2,
	we: 3,
	th: 4,
	fr: 5,
	sa: 6,
};

const DAY_NAMES_RU = [
	"воскресенье",
	"понедельник",
	"вторник",
	"среда",
	"четверг",
	"пятница",
	"субботу",
];

function parseHHMM(s: string): number | null {
	const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h > 24 || min > 59) return null;
	if (h === 24 && min > 0) return null;
	if (h === 24 && min === 0) return 24 * 60;
	return h * 60 + min;
}

function formatHHMM(total: number): string {
	if (total >= 24 * 60) return "24:00";
	const h = Math.floor(total / 60) % 24;
	const m = total % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function expandDayRange(a: number, b: number): number[] {
	const out: number[] = [];
	let d = a;
	for (let k = 0; k < 7; k++) {
		out.push(d);
		if (d === b) break;
		d = d + 1;
		if (d > 6) d = 0;
	}
	return out;
}

function parseDayTokens(spec: string): number[] {
	const set = new Set<number>();
	const parts = spec
		.split(/\s*,\s*/)
		.map((s) => s.trim())
		.filter(Boolean);
	for (const p of parts) {
		const dash = p.match(/^([a-z]{2})\s*-\s*([a-z]{2})$/i);
		if (dash) {
			const d0 = DAY_ABBREV[dash[1].toLowerCase()];
			const d1 = DAY_ABBREV[dash[2].toLowerCase()];
			if (d0 !== undefined && d1 !== undefined) {
				for (const x of expandDayRange(d0, d1)) set.add(x);
			}
			continue;
		}
		const one = p.match(/^([a-z]{2})$/i);
		if (one) {
			const d = DAY_ABBREV[one[1].toLowerCase()];
			if (d !== undefined) set.add(d);
		}
	}
	return [...set];
}

type Interval = { start: number; end: number; overnight: boolean };

function parseIntervals(
	raw: string,
): Array<{ days: number[]; interval: Interval }> {
	const out: Array<{ days: number[]; interval: Interval }> = [];
	const chunks = raw
		.split(/;/)
		.map((c) => c.trim())
		.filter(Boolean);

	for (const chunk of chunks) {
		const timeTail = chunk.match(
			/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/,
		);
		if (!timeTail) continue;
		const start = parseHHMM(timeTail[1]);
		const end = parseHHMM(timeTail[2]);
		if (start === null || end === null) continue;

		const dayPart = chunk.slice(0, chunk.lastIndexOf(timeTail[0])).trim();
		if (!dayPart) continue;

		const days = parseDayTokens(dayPart);
		if (days.length === 0) continue;

		const endEq1440 = end >= 24 * 60;
		const overnight = !endEq1440 && end < start;

		out.push({
			days,
			interval: { start, end, overnight },
		});
	}
	return out;
}

function isOpenNowInRule(
	r: { days: number[]; interval: Interval },
	jsDay: number,
	nowMin: number,
): { closing: string } | null {
	const { interval: iv } = r;
	const prev = (jsDay + 6) % 7;

	if (r.days.includes(jsDay)) {
		if (iv.end >= 24 * 60) {
			if (nowMin >= iv.start && nowMin < 24 * 60) {
				return { closing: "24:00" };
			}
		} else if (!iv.overnight) {
			if (nowMin >= iv.start && nowMin < iv.end) {
				return { closing: formatHHMM(iv.end) };
			}
		} else if (nowMin >= iv.start) {
			return { closing: formatHHMM(iv.end) };
		}
	}
	if (iv.overnight && r.days.includes(prev) && nowMin < iv.end) {
		return { closing: formatHHMM(iv.end) };
	}
	return null;
}

export function getOpeningSummaryToday(
	place: OSMPlace,
	now = new Date(),
): string {
	const raw = place.openingHoursRaw?.trim();
	if (!raw) return "Часы не указаны";

	const jsDay = now.getDay();
	const nowMin = now.getHours() * 60 + now.getMinutes();
	const rules = parseIntervals(raw);
	if (rules.length === 0) {
		return raw.length > 48 ? `${raw.slice(0, 45)}…` : raw;
	}

	for (const r of rules) {
		const hit = isOpenNowInRule(r, jsDay, nowMin);
		if (hit) return `Сегодня открыто до ${hit.closing}`;
	}

	let nextStart: number | null = null;
	for (const r of rules) {
		if (!r.days.includes(jsDay)) continue;
		const iv = r.interval;
		if (!iv.overnight && iv.end < 24 * 60 && nowMin < iv.start) {
			nextStart = nextStart === null ? iv.start : Math.min(nextStart, iv.start);
		}
		if (iv.overnight && nowMin < iv.start && nowMin >= iv.end) {
			nextStart = nextStart === null ? iv.start : Math.min(nextStart, iv.start);
		}
	}
	if (nextStart !== null) {
		return `Откроется в ${formatHHMM(nextStart)}`;
	}

	for (let add = 1; add <= 6; add++) {
		const d = (jsDay + add) % 7;
		for (const r of rules) {
			if (r.days.includes(d)) {
				return `Закрыто · далее в ${DAY_NAMES_RU[d]} с ${formatHHMM(r.interval.start)}`;
			}
		}
	}

	return "Сегодня закрыто";
}

export function formatOpeningHoursDetailRu(place: OSMPlace): string {
	const raw = place.openingHoursRaw?.trim();
	if (!raw) return "Время работы в данных не указано.";
	const rules = parseIntervals(raw);
	if (rules.length === 0) return raw;

	const byDay: Record<number, string[]> = {};
	for (let d = 0; d < 7; d++) byDay[d] = [];
	for (const r of rules) {
		const iv = r.interval;
		const endLabel = iv.end >= 24 * 60 ? "24:00" : formatHHMM(iv.end);
		const label = `${formatHHMM(iv.start)}–${endLabel}${iv.overnight ? " (ночь)" : ""}`;
		for (const d of r.days) {
			byDay[d].push(label);
		}
	}

	const order = [1, 2, 3, 4, 5, 6, 0];
	const names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
	const lines: string[] = [];
	for (const d of order) {
		if (byDay[d].length) {
			lines.push(`${names[d]}: ${[...new Set(byDay[d])].join(", ")}`);
		}
	}
	return lines.join("\n");
}

export function extractPlacePhone(place: OSMPlace): string | null {
	const t = place.tags ?? {};
	const p = t.phone || t["contact:phone"] || t["phone:mobile"] || t.mobile;
	if (!p || !String(p).trim()) return null;
	return String(p).trim();
}

export function extractPlaceWebsite(place: OSMPlace): string | null {
	const t = place.tags ?? {};
	const w = t.website || t["contact:website"] || t.url;
	if (!w || !String(w).trim()) return null;
	return String(w).trim();
}

export function getMinutesUntilClosingToday(
	place: OSMPlace,
	now = new Date(),
): number | null {
	const raw = place.openingHoursRaw?.trim();
	if (!raw) return null;
	const jsDay = now.getDay();
	const nowMin = now.getHours() * 60 + now.getMinutes();
	const rules = parseIntervals(raw);
	for (const r of rules) {
		const hit = isOpenNowInRule(r, jsDay, nowMin);
		if (!hit) continue;
		const iv = r.interval;
		if (iv.end >= 24 * 60) return 24 * 60 - nowMin;
		if (!iv.overnight) return iv.end - nowMin;
		return iv.end - nowMin;
	}
	return null;
}

export function isOpenAtMinutesFromRaw(
	openingHoursRaw: string | undefined,
	onDate: Date,
	minutesFromMidnight: number,
): boolean | null {
	if (!openingHoursRaw?.trim()) return null;
	return isPlaceOpenAtLocalMinutes(
		{ openingHoursRaw } as OSMPlace,
		onDate,
		minutesFromMidnight,
	);
}

export function isPlaceOpenAtLocalMinutes(
	place: OSMPlace,
	onDate: Date,
	minutesFromMidnight: number,
): boolean | null {
	const raw = place.openingHoursRaw?.trim();
	if (!raw) return null;
	const jsDay = onDate.getDay();
	const rules = parseIntervals(raw);
	for (const r of rules) {
		if (!r.days.includes(jsDay)) continue;
		const iv = r.interval;
		if (iv.end >= 24 * 60) {
			if (minutesFromMidnight >= iv.start && minutesFromMidnight < 24 * 60)
				return true;
			continue;
		}
		if (!iv.overnight) {
			if (minutesFromMidnight >= iv.start && minutesFromMidnight < iv.end)
				return true;
		} else {
			if (minutesFromMidnight >= iv.start || minutesFromMidnight < iv.end)
				return true;
		}
	}
	return false;
}
