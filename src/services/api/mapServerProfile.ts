import type { StartPoint } from "../../types/planner";
import type { Place } from "../../types/planner";
import type { UserProfile, SavedLocation } from "../../types/userProfile";
import type { TimelineEvent } from "../../types/timeline";
import {
	parseTimelineEventsField,
	prunePastTimelineEvents,
} from "../timeline/timelineStorage";

function favoriteStubDisplayName(canonicalId: string): string {
	const raw = canonicalId.replace(/^u_/, "").replace(/^osm_/, "");
	const m = /^(node|way|relation)-(\d+)$/i.exec(raw);
	if (m) return `Место на карте (${m[1]} ${m[2]})`;
	if (raw && raw !== canonicalId) return raw;
	return canonicalId || "Избранное";
}

export function placeStubFromOsmId(rawId: string): Place {
	const id = normalizeFavoriteId(rawId);
	return {
		id,
		name: favoriteStubDisplayName(id),
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

export function normalizeFavoriteId(rawId: string): string {
	const id = String(rawId || "").trim();
	if (!id) return "";
	if (id.startsWith("osm_") || id.startsWith("u_")) return id;
	if (id.startsWith("place-") || id.startsWith("custom-")) return `u_${id}`;
	return `osm_${id}`;
}

function parseJsonField(raw: unknown): any {
	let current: unknown = raw;
	for (let i = 0; i < 3; i += 1) {
		if (current == null) return undefined;
		if (typeof current === "object") return current;
		if (typeof current !== "string") return undefined;
		const t = current.trim();
		if (!t) return undefined;
		try {
			current = JSON.parse(t);
		} catch {
			return undefined;
		}
	}
	return typeof current === "object" ? current : undefined;
}

function isTruthySetting(v: unknown): boolean {
	return String(v) === "true" || v === true;
}

function settingBoolFalseByDefault(
	settings: Record<string, unknown>,
	keys: string[],
): boolean {
	for (const k of keys) {
		const v = settings[k];
		if (v === undefined || v === null) continue;
		if (String(v) === "false" || v === false) return false;
		if (isTruthySetting(v)) return true;
	}
	return false;
}

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
		if (favRaw.includes(",")) {
			return favRaw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}
	}
	return [];
}

function defaultStartPointFromSettings(
	settings: Record<string, unknown>,
): StartPoint {
	const raw = settings.defaultStartPoint;
	const parsed = parseJsonField(raw);
	if (
		parsed &&
		typeof parsed === "object" &&
		parsed !== null &&
		"type" in parsed
	) {
		return parsed as StartPoint;
	}
	return {
		type: "current",
		address: "",
		label: "Текущая позиция",
	} as StartPoint;
}

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
	const timelineEvents = prunePastTimelineEvents(
		parseTimelineEventsField(teRaw),
	);

	const dietRestrict = String(settings.diet_restrict ?? "").toLowerCase();
	const vegetarian =
		dietRestrict.includes("vegetarian") ||
		dietRestrict.includes("vegan") ||
		settingBoolFalseByDefault(settings, ["vegan", "vegetarian"]);

	const accessNeeds = String(settings.access_needs ?? "").toLowerCase();
	const wheelchairAccessible =
		accessNeeds.includes("wheelchair") ||
		settingBoolFalseByDefault(settings, [
			"wheelchair",
			"wheelchairAccessible",
		]);

	const locSource =
		root?.saved_locations ??
		root?.locations ??
		server?.saved_locations ??
		server?.locations;
	const savedLocations = mapServerLocations(locSource);

	const transportRaw = settings.pref_transport ?? settings.transport;
	const pref = String(transportRaw ?? "walking").toLowerCase();
	const defaultTransportMode: UserProfile["defaultTransportMode"] =
		pref === "car" || pref === "driving"
			? "car"
			: pref === "public" || pref === "transit"
				? "public"
				: "walking";

	const profile: UserProfile = {
		id: String(root?.id ?? fallbackId),
		name,
		email,
		defaultStartPoint: (() => {
			const base = defaultStartPointFromSettings(settings);
			const t = String(settings.default_start_loc_type ?? "").toLowerCase();
			if (t === "current") return { ...base, type: "current" as const };
			if (t === "address" || t === "saved" || t === "custom")
				return { ...base, type: "custom" as const };
			return base;
		})(),
		defaultTransportMode,
		notificationsEnabled: notificationsFromSettings(settings),
		vegetarian,
		wheelchairAccessible,
		averageWalkingTime:
			Number(settings.max_walk_time ?? settings.averageWalkingTime ?? 15) ||
			15,
		savedLocations,
		accessibilitySettings: {
			needsRamp:
				accessNeeds.includes("ramp") ||
				settingBoolFalseByDefault(settings, ["needsRamp"]),
			needsElevator:
				accessNeeds.includes("elevator") ||
				settingBoolFalseByDefault(settings, ["needsElevator"]),
		},
	};

	return { profile, favoriteIds, timelineEvents };
}

/**
 * Settings object for POST /user/profile `data.settings` — keys must match
 * UserHandler.php::$settingsKeys (PHP validates these keys).
 */
export function buildServerApiSettings(
	profile: UserProfile,
): Record<string, string> {
	const sp = profile.defaultStartPoint;
	const startType =
		sp?.type === "current" ? "current" : "saved";

	const transport =
		profile.defaultTransportMode === "car"
			? "car"
			: profile.defaultTransportMode === "public"
				? "public"
				: "walking";

	const needs: string[] = [];
	if (profile.wheelchairAccessible) needs.push("wheelchair");
	if (profile.accessibilitySettings.needsRamp) needs.push("ramp");
	if (profile.accessibilitySettings.needsElevator) needs.push("elevator");
	const accessNeeds = needs.length ? needs.join(",") : "none";

	/** Только поля профиля для `users.settings` (не бюджет планировщика и т.п.). */
	return {
		max_walk_time: String(
			Math.max(1, Math.min(180, profile.averageWalkingTime || 15)),
		),
		pref_transport: transport,
		diet_restrict: profile.vegetarian ? "vegetarian" : "none",
		access_needs: accessNeeds,
		default_start_loc_type: startType,
	};
}

/** Body `data` for POST /user/profile (updSettings): only `name` + `settings` per PHP). */
export function buildProfilePostPayload(
	profile: UserProfile,
	_favoriteIds: string[],
	_timelineEvents: TimelineEvent[],
): Record<string, unknown> {
	return buildProfileSettingsPayload(profile);
}

export function buildProfileSettingsPayload(
	profile: UserProfile,
): Record<string, unknown> {
	return {
		name: profile.name,
		settings: buildServerApiSettings(profile),
	};
}
