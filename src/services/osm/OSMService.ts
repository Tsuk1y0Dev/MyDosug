import { CatalogPlace } from "../../data/mockPlaces";

export type OSMTagFilter = {
	key: string;
	value?: string;
};

export interface OSMSearchParams {
	center: { lat: number; lng: number };
	radiusMeters: number;
	tags: OSMTagFilter[];
}

type OverpassElement = {
	id: number;
	type: "node" | "way" | "relation";
	lat?: number;
	lon?: number;
	center?: {
		lat: number;
		lon: number;
	};
	tags?: Record<string, string>;
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const buildFilterString = (tags: OSMTagFilter[]): string => {
	if (!tags.length) {
		return "";
	}
	return tags
		.map((t) => {
			if (!t.value) {
				return `["${t.key}"]`;
			}
			return `["${t.key}"="${t.value}"]`;
		})
		.join("");
};

const buildQuery = (params: OSMSearchParams): string => {
	const filter = buildFilterString(params.tags);
	const { lat, lng } = params.center;
	const radius = params.radiusMeters;

	return `
[out:json][timeout:25];
(
  node${filter}(around:${radius},${lat},${lng});
  way${filter}(around:${radius},${lat},${lng});
);
out center 50;
`;
};

const toCatalogPlace = (el: OverpassElement): CatalogPlace | null => {
	const tags = el.tags || {};

	const coordsSource =
		el.type === "node"
			? el.lat != null && el.lon != null
				? { lat: el.lat, lng: el.lon }
				: null
			: el.center
			? { lat: el.center.lat, lng: el.center.lon }
			: null;

	if (!coordsSource) {
		return null;
	}

	const name = tags.name || tags.ref || "Объект на карте";

	const street = tags["addr:street"] || "";
	const housenumber = tags["addr:housenumber"] || "";
	const city = tags["addr:city"] || "";
	const addressParts = [city, street, housenumber].filter(Boolean);
	const address = addressParts.join(", ");

	const amenity = tags.amenity || tags.shop || "place";
	const cuisine = tags.cuisine || "";

	const description =
		tags.description ||
		tags["internet_access:fee"] ||
		[amenity, cuisine].filter(Boolean).join(" • ");

	const accessibilityWheelchair = tags.wheelchair === "yes";
	const accessibilityElevator =
		tags["building:levels"] != null && Number(tags["building:levels"]) > 1;
	const accessibilityStepFree = tags["entrance:step_free"] === "yes";
	const accessibilityToilet = tags["toilets:wheelchair"] === "yes";
	const parkingNearby =
		tags.parking === "yes" || tags["parking:lane"] != null || tags["parking:condition"] != null;
	const publicTransportNearby =
		tags.public_transport === "station" ||
		tags.highway === "bus_stop" ||
		tags.railway === "station";

	const place: CatalogPlace = {
		id: `osm-${el.type}-${el.id}`,
		categoryId: amenity,
		subCategoryId: cuisine || amenity,
		title: name,
		description: description || name,
		coords: coordsSource,
		rating: 4.2,
		address,
		accessibility: {
			wheelchairAccessible: accessibilityWheelchair,
			stepFreeEntrance: accessibilityStepFree,
			elevatorOrRamp: accessibilityElevator,
			accessibleToilet: accessibilityToilet,
			tactileGuides: false,
			brailleSigns: false,
			audioAssistance: false,
			parkingNearby,
			publicTransportNearby,
		},
	};

	return place;
};

export const OSMService = {
	async search(params: OSMSearchParams): Promise<CatalogPlace[]> {
		const query = buildQuery(params);

		const response = await fetch(OVERPASS_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
			},
			body: `data=${encodeURIComponent(query)}`,
		});

		if (!response.ok) {
			throw new Error(`Overpass error: ${response.status}`);
		}

		const json = await response.json();
		const elements: OverpassElement[] = Array.isArray(json.elements) ? json.elements : [];

		const mapped = elements
			.map((el) => toCatalogPlace(el))
			.filter((p): p is CatalogPlace => p != null);

		const byId = new Map<string, CatalogPlace>();
		for (const place of mapped) {
			if (!byId.has(place.id)) {
				byId.set(place.id, place);
			}
		}

		return Array.from(byId.values());
	},
};

