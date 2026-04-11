import type { Place, ActivityType } from "../types/planner";
import type { OSMPlace } from "../services/osm/OSMService";
import type { RouteEvent } from "../types/route";
import { formatOsmBudgetCaption, formatOsmOpeningCaption } from "./osmPlaceCaption";

const defaultDurationSettings: Place["durationSettings"] = {
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
};

export function osmPlaceToPlace(p: OSMPlace): Place {
	const type: ActivityType =
		p.categoryId && p.categoryId !== "health" && p.categoryId !== "transport"
			? (p.categoryId as ActivityType)
			: "entertainment";

	return {
		id: p.id,
		name: p.title,
		type,
		address: p.address ?? "",
		description: p.description,
		priceLevel: 2,
		rating: p.rating,
		distance: 0,
		travelTime: 0,
		durationSettings: defaultDurationSettings,
		image: "",
		workingHours: formatOsmOpeningCaption(p),
		features: {
			wheelchair: p.accessibility.wheelchairAccessible,
			vegetarian: false,
			outdoor: false,
			childFriendly: false,
		},
		coordinates: p.coords,
	};
}

export function buildUserCreatedPlace(
	id: string,
	name: string,
	coords: { lat: number; lng: number },
	description: string,
): Place {
	return {
		id,
		name,
		type: "custom",
		address: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
		description,
		priceLevel: 2,
		rating: 0,
		distance: 0,
		travelTime: 0,
		durationSettings: defaultDurationSettings,
		image: "",
		workingHours: "",
		features: {
			wheelchair: false,
			vegetarian: false,
			outdoor: false,
			childFriendly: false,
		},
		coordinates: coords,
	};
}

/** Для избранного с таймлайна (OSM или своё место) */
export function routeEventToPlace(ev: RouteEvent): Place {
	const id = ev.placeId || ev.id;
	const name = ev.customTitle?.trim() || "Точка маршрута";
	const desc =
		[
			ev.description,
			ev.address,
			ev.openingHours ? `Часы: ${ev.openingHours}` : "",
			ev.budgetNote ? `Бюджет: ${ev.budgetNote}` : "",
		]
			.filter(Boolean)
			.join("\n") || "";
	return buildUserCreatedPlace(id, name, ev.coords, desc);
}
