import { SearchCriteria } from "../../types/searchCriteria";

export interface OSMPlace {
	id: string;
	title: string;
	description: string;
	address?: string;
	categoryId?: string;
	subCategoryId?: string;
	coords: {
		lat: number;
		lng: number;
	};
	rating: number;
	accessibility: {
		wheelchairAccessible: boolean;
		elevatorOrRamp: boolean;
		stepFreeEntrance: boolean;
		accessibleToilet: boolean;
		parkingNearby: boolean;
		publicTransportNearby: boolean;
	};
	tags: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OverpassElement = {
	id: number;
	lat: number;
	lon: number;
	tags?: Record<string, string>;
};

const CATEGORY_AMENITIES: Record<string, string[]> = {
	food: ["restaurant", "cafe", "fast_food", "bar", "pub"],
	entertainment: ["cinema", "theatre", "nightclub"],
	sports: ["sports_centre", "gym", "stadium"],
	culture: ["museum", "theatre", "arts_centre"],
	walking: ["park", "garden"],
	shopping: ["mall", "supermarket", "department_store"],
	health: ["pharmacy", "clinic", "hospital"],
	transport: ["bus_station", "train_station", "tram_stop"],
};

const SUBCATEGORY_AMENITIES: Record<string, string[]> = {
	restaurant: ["restaurant"],
	cafe: ["cafe"],
	fastfood: ["fast_food"],
	bar: ["bar", "pub"],
	bakery: ["bakery", "cafe"],
	mall: ["mall"],
	hypermarket: ["supermarket"],
	pharmacy_24: ["pharmacy"],
	cinema: ["cinema"],
};

const buildOverpassQuery = (
	center: { lat: number; lng: number },
	radius: number,
	criteria?: SearchCriteria,
) => {
	const { lat, lng } = center;

	const amenityFilters: string[] = [];

	const categoryId = criteria?.categoryId;
	const subCategoryId = criteria?.subCategoryId;

	let amenities: string[] =
		(subCategoryId && SUBCATEGORY_AMENITIES[subCategoryId]) ||
		(categoryId && CATEGORY_AMENITIES[categoryId]) ||
		[];

	if (!amenities.length) {
		amenities = ["cafe", "restaurant", "fast_food", "bar", "pub"];
	}

	const amenityExpr =
		amenities.length === 1
			? `node["amenity"="${amenities[0]}"]`
			: `node["amenity"~"${amenities.join("|")}"]`;

	amenityFilters.push(`${amenityExpr}(around:${radius},${lat},${lng});`);

	const wifiRequested =
		criteria?.filters?.wifi === true ||
		criteria?.subCategoryId === "wifi_place" ||
		criteria?.goal === "work";

	const wifiFilter = wifiRequested ? `["internet_access"="wlan"]` : "";

	const amenityBlocks = amenityFilters
		.map((base) => base.replace("];", `${wifiFilter}];`))
		.join("\n");

	return `
    [out:json][timeout:60];
    (
      ${amenityBlocks}
    );
    out body;
  `;
};

const mapElementToPlace = (el: OverpassElement): OSMPlace => {
	const tags = el.tags ?? {};
	const title =
		tags.name || tags["name:ru"] || tags["operator"] || tags.brand || "Место";

	const address =
		tags["addr:full"] ||
		[tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") ||
		undefined;

	const categoryId = tags.amenity;
	const subCategoryId = tags.cuisine;

	const wheelchairAccessible = tags.wheelchair === "yes";
	const parkingNearby = tags.parking === "yes" || tags["parking:lane"] != null;
	const publicTransportNearby =
		tags.public_transport === "platform" || tags.highway === "bus_stop";

	const rawRating = tags["rating"] || tags["stars"];
	const parsedRating = rawRating ? Number(rawRating) : NaN;
	const rating =
		!Number.isNaN(parsedRating) && parsedRating > 0
			? Math.max(3.5, Math.min(5, parsedRating))
			: 3.8 + Math.random() * 0.7;

	return {
		id: String(el.id),
		title,
		description: tags.description || "Место из OpenStreetMap",
		address,
		categoryId,
		subCategoryId,
		coords: {
			lat: el.lat,
			lng: el.lon,
		},
		rating,
		accessibility: {
			wheelchairAccessible,
			elevatorOrRamp: false,
			stepFreeEntrance: false,
			accessibleToilet: false,
			parkingNearby,
			publicTransportNearby,
		},
		tags,
	};
};

export const OSMService = {
	async searchAround(
		center: { lat: number; lng: number },
		radius: number,
		criteria?: SearchCriteria,
	): Promise<OSMPlace[]> {
		const query = buildOverpassQuery(center, radius, criteria);

		const response = await fetch(OVERPASS_URL, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain;charset=UTF-8",
			},
			body: query,
		});

		if (!response.ok) {
			throw new Error(`Overpass API error: ${response.status}`);
		}

		const json = await response.json();
		const elements: OverpassElement[] = Array.isArray(json.elements)
			? json.elements
			: [];

		return elements
			.filter((el) => typeof el.lat === "number" && typeof el.lon === "number")
			.map(mapElementToPlace);
	},
};
