import type { OSMPlace } from "../services/osm/OSMService";
import type { GoalType, SearchCriteria } from "../types/searchCriteria";

export function isPlaceholderOsmTitle(title: string): boolean {
	const t = title.trim().toLowerCase();
	return t === "место" || t === "place";
}

export function filterOsmPlaces<T extends Pick<OSMPlace, "title">>(
	places: T[],
): T[] {
	return places.filter((p) => !isPlaceholderOsmTitle(p.title));
}

function tagBlob(p: OSMPlace): string {
	const t = p.tags ?? {};
	return [
		t.amenity,
		t.shop,
		t.leisure,
		t.tourism,
		t.natural,
		t.landuse,
		t.highway,
		t.sport,
		t.cuisine,
		t.diet,
	].join(" ");
}

function matchesGoal(place: OSMPlace, goal: GoalType): boolean {
	const t = place.tags ?? {};
	const a = t.amenity ?? "";
	const leisure = t.leisure ?? "";
	const tourism = t.tourism ?? "";
	const blob = tagBlob(place).toLowerCase();

	switch (goal) {
		case "work":
			return (
				t.internet_access === "wlan" ||
				t.internet_access === "yes" ||
				["cafe", "library", "coworking", "internet_cafe"].includes(a) ||
				blob.includes("wifi")
			);
		case "relax":
			return (
				["cafe", "spa", "pub"].includes(a) ||
				leisure.includes("park") ||
				leisure.includes("garden") ||
				tourism === "attraction"
			);
		case "fun":
			return (
				["cinema", "nightclub", "bar", "theatre"].includes(a) ||
				leisure.includes("stadium")
			);
		case "romantic":
			return (
				a === "restaurant" ||
				tourism === "viewpoint" ||
				tourism === "zoo" ||
				leisure.includes("park")
			);
		case "active":
			return (
				["sports_centre", "gym", "stadium", "swimming_pool"].includes(a) ||
				/(pool|pitch|track|fitness|ice_rink)/i.test(leisure) ||
				/(football|basketball|tennis|hiking|cycling)/i.test(t.sport ?? "")
			);
		case "educational":
			return (
				["museum", "library", "arts_centre", "planetarium"].includes(a) ||
				tourism === "museum" ||
				tourism === "gallery"
			);
		default:
			return true;
	}
}

export function matchesExtendedSearchCriteria(
	place: OSMPlace,
	criteria: SearchCriteria,
): boolean {
	if (criteria.goal && !matchesGoal(place, criteria.goal)) return false;

	const f = criteria.filters ?? {};
	const t = place.tags ?? {};

	if (f.outdoor) {
		const ok =
			/(park|garden|forest|wood|beach|pitch|track|nature|viewpoint|zoo|protected_area|playground)/i.test(
				`${t.leisure ?? ""} ${t.natural ?? ""} ${t.tourism ?? ""} ${t.landuse ?? ""}`,
			);
		if (!ok) return false;
	}

	if (f.childFriendly) {
		const ok =
			t.playground === "yes" ||
			t.amenity === "kindergarten" ||
			/(playground|family|kids|children)/i.test(tagBlob(place));
		if (!ok) return false;
	}

	if (f.vegetarian) {
		const diet = (t.diet ?? "").toLowerCase();
		const cuisine = (t.cuisine ?? "").toLowerCase();
		const ok =
			diet.includes("vegetarian") ||
			diet.includes("vegan") ||
			cuisine.includes("vegetarian") ||
			cuisine.includes("vegan") ||
			cuisine.includes("indian");
		if (!ok) return false;
	}

	return true;
}
