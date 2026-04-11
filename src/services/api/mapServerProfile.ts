import type { StartPoint } from "../../types/planner";
import type { Place } from "../../types/planner";
import type { UserProfile, SavedLocation } from '../../types/userProfile';
import type { TimelineEvent } from "../../types/timeline";
import {
	parseTimelineEventsField,
	prunePastTimelineEvents,
} from "../timeline/timelineStorage";

/** Минимальная Place из id OSM для избранного с сервера. */
export function placeStubFromOsmId(id: string): Place {
	return {
		id,
		name: id,
		type: "walking",
		address: "",
		description: "",
		priceLevel: 2,
		rating: 0,
		distance: 0,
		travelTime: 0,
		durationSettings: {
			baseDuration: 60,
			modifiers: {
				company: {
					solo: 1,
					couple: 1,
					friends: 1,
					kids: 1,
					colleagues: 1,
				},
				mood: {
					relax: 1,
					educational: 1,
					fun: 1,
					romantic: 1,
					active: 1,
				},
			},
		},
		image: "",
		workingHours: "",
		features: {
			wheelchair: false,
			vegetarian: false,
			outdoor: false,
			childFriendly: false,
		},
		coordinates: { lat: 0, lng: 0 },
	};
}

function parseJsonField(raw: unknown): any {
	if (raw == null) return undefined;
	if (typeof raw === "object") return raw;
	if (typeof raw === "string") {
		const t = raw.trim();
		if (!t) return undefined;
		try {
			return JSON.parse(t);
		} catch {
			return undefined;
		}
	}
	return undefined;
}

function isTruthySetting(v: unknown): boolean {
	return String(v) === "true" || v === true;
}

/** По умолчанию false, если ключа нет или не «true». */
function settingBoolFalseByDefault(settings: Record<string, unknown>, keys: string[]): boolean {
	for (const k of keys) {
		const v = settings[k];
		if (v === undefined || v === null) continue;
		if (String(v) === "false" || v === false) return false;
		if (isTruthySetting(v)) return true;
	}
	return false;
}

/** Уведомления: по умолчанию true, пока явно не «false». */
function notificationsFromSettings(settings: Record<string, unknown>): boolean {
	for (const k of ["notificationsEnabled", "notifications"]) {
		const v = settings[k];
		if (v === undefined || v === null) continue;
		if (String(v) === "false" || v === false) return false;
		if (String(v) === "true" || v === true) return true;
	}
	return true;
}

function parseLocationsArray(raw: unknown): any[] {
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		const p = parseJsonField(raw);
		return Array.isArray(p) ? p : [];
	}
	return [];
}

function mapServerLocations(raw: unknown): SavedLocation[] {
	const arr = parseLocationsArray(raw);
	return arr.map((item: any, index: number) => {
		const desc = item?.description;
		return {
			id: `server_loc_${index}`,
			serverIndex: index,
			type: "other" as const,
			name: String(item?.name ?? `Локация ${index + 1}`),
			icon: "📍",
			...(desc != null && String(desc).trim() !== ""
				? { description: String(desc) }
				: {}),
			coords: {
				lat: Number(item?.lat ?? item?.latitude ?? 0),
				lng: Number(item?.long ?? item?.lng ?? item?.lon ?? 0),
			},
		};
	});
}

function parseFavoriteIds(root: any, server: any): string[] {
	const favRaw = root?.favorites ?? server?.favorites;
	if (Array.isArray(favRaw)) {
		return favRaw.map((x) => String(x));
	}
	if (typeof favRaw === "string") {
		const p = parseJsonField(favRaw);
		if (Array.isArray(p)) return p.map((x) => String(x));
	}
	return [];
}

function defaultStartPointFromSettings(
	settings: Record<string, unknown>,
): StartPoint {
	const raw = settings.defaultStartPoint;
	const parsed = parseJsonField(raw);
	if (parsed && typeof parsed === "object" && parsed !== null && "type" in parsed) {
		return parsed as StartPoint;
	}
	return {
		type: "current",
		address: "",
		label: "Текущая позиция",
	} as StartPoint;
}

/**
 * Ответ GET /user/profile: обычно { data: { email, name, settings (строка JSON), saved_locations (строка), ... } }.
 */
export function mapServerProfileToUserProfile(
	server: any,
	fallbackEmail: string,
	fallbackId: string,
): {
	profile: UserProfile;
	favoriteIds: string[];
	timelineEvents: TimelineEvent[];
} {
	const root = server?.data ?? server?.user ?? server;
	const name = String(root?.name ?? server?.name ?? "");
	const email = String(root?.email ?? server?.email ?? fallbackEmail);

	let settings: Record<string, unknown> = {};
	const settingsRaw = root?.settings ?? server?.settings;
	const parsedSettings = parseJsonField(settingsRaw);
	if (parsedSettings && typeof parsedSettings === "object") {
		settings = parsedSettings as Record<string, unknown>;
	}

	const favoriteIds = parseFavoriteIds(root, server);

	const teRaw = root?.timeline_events ?? server?.timeline_events;
	const timelineEvents = prunePastTimelineEvents(parseTimelineEventsField(teRaw));

	const vegetarian =
		settingBoolFalseByDefault(settings, ["vegan", "vegetarian"]);
	const wheelchairAccessible = settingBoolFalseByDefault(settings, [
		"wheelchair",
		"wheelchairAccessible",
	]);

	const locSource =
		root?.saved_locations ??
		root?.locations ??
		server?.saved_locations ??
		server?.locations;
	const savedLocations = mapServerLocations(locSource);

	const transportRaw = settings.transport;
	const defaultTransportMode: UserProfile["defaultTransportMode"] =
		transportRaw === "car"
			? "car"
			: transportRaw === "public"
				? "public"
				: "walking";

	const profile: UserProfile = {
		id: String(root?.id ?? fallbackId),
		name,
		email,
		defaultStartPoint: defaultStartPointFromSettings(settings),
		defaultTransportMode,
		notificationsEnabled: notificationsFromSettings(settings),
		vegetarian,
		wheelchairAccessible,
		averageWalkingTime: Number(settings.averageWalkingTime ?? 15) || 15,
		savedLocations,
		accessibilitySettings: {
			needsRamp: settingBoolFalseByDefault(settings, ["needsRamp"]),
			needsElevator: settingBoolFalseByDefault(settings, ["needsElevator"]),
		},
	};

	return { profile, favoriteIds, timelineEvents };
}

/**
 * Все пользовательские настройки — строки (как ждёт json_decode + хранение в БД).
 */
export function buildSettingsObject(profile: UserProfile): Record<string, string> {
	const base: Record<string, string> = {
		vegetarian: profile.vegetarian ? "true" : "false",
		vegan: profile.vegetarian ? "true" : "false",
		wheelchairAccessible: profile.wheelchairAccessible ? "true" : "false",
		wheelchair: profile.wheelchairAccessible ? "true" : "false",
		needsRamp: profile.accessibilitySettings.needsRamp ? "true" : "false",
		needsElevator: profile.accessibilitySettings.needsElevator ? "true" : "false",
		notificationsEnabled: profile.notificationsEnabled ? "true" : "false",
		notifications: profile.notificationsEnabled ? "true" : "false",
		transport: profile.defaultTransportMode,
		averageWalkingTime: String(profile.averageWalkingTime),
		defaultStartPoint: JSON.stringify(profile.defaultStartPoint),
	};
	return base;
}

/** Тело поля `data` для POST /user/profile (favorites и timeline — JSON-строки для PHP/MySQL). */
export function buildProfilePostPayload(
	profile: UserProfile,
	favoriteIds: string[],
	timelineEvents: TimelineEvent[],
): Record<string, unknown> {
	return {
		name: profile.name,
		settings: JSON.stringify(buildSettingsObject(profile)),
		favorites: JSON.stringify(favoriteIds),
		timeline_events: JSON.stringify(timelineEvents),
	};
}
