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
	type?: string; // node/way/relation
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
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

	const categoryId = criteria?.categoryId;
	const subCategoryId = criteria?.subCategoryId;

	// Важно: Wi‑Fi фильтр в OSM встречается как `internet_access=wlan`.
	const wifiRequested =
		criteria?.filters?.wifi === true ||
		criteria?.subCategoryId === "wifi_place" ||
		criteria?.goal === "work";

	const CATEGORY_EXPRESSIONS: Record<string, string[]> = {
		food: [`nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|bakery"]`],
		entertainment: [`nwr["amenity"~"cinema|theatre|nightclub"]`],
		sports: [`nwr["amenity"~"sports_centre|gym|stadium"]`],
		culture: [
			`nwr["amenity"~"museum|arts_centre|gallery|library"]`,
			`nwr["tourism"~"museum|artwork|attraction"]`,
		],
		walking: [
			`nwr["leisure"~"park|garden"]`,
			`nwr["tourism"~"attraction|viewpoint|zoo"]`,
		],
		shopping: [
			`nwr["shop"~"mall|supermarket|department_store|clothes|electronics|books|bookshop|gift|marketplace|sport"]`,
		],
		education: [
			`nwr["amenity"~"school|college|university"]`,
			`nwr["amenity"="library"]`,
		],
		nature: [
			`nwr["natural"~"wood|water|peak|beach|bay"]`,
			`nwr["landuse"="forest"]`,
		],
		services: [
			`nwr["amenity"~"laundry|dry_cleaning|community_centre"]`,
			`nwr["shop"="copyshop"]`,
			`nwr["craft"~"tailor|shoe_repair"]`,
		],
		health: [
			`nwr["amenity"~"pharmacy|clinic|hospital|dentist|spa"]`,
			`nwr["shop"="optician"]`,
		],
		transport: [
			`nwr["amenity"~"bus_station|train_station|tram_stop"]`,
			`nwr["railway"="station"]`,
			`nwr["aeroway"~"aerodrome|terminal"]`,
			`nwr["amenity"="car_rental"]`,
		],
		for_employee: [
			`nwr["amenity"="coworking"]`,
			`nwr["office"]`,
			`nwr["amenity"="hotel"]`,
		],
	};

	const SUBCATEGORY_EXPRESSIONS: Record<string, string[]> = {
		// Food subcategories
		restaurant: [`nwr["amenity"="restaurant"]`],
		cafe: [`nwr["amenity"="cafe"]`],
		fastfood: [`nwr["amenity"="fast_food"]`],
		bar: [`nwr["amenity"~"bar|pub"]`],
		bakery: [`nwr["amenity"~"bakery|cafe"]`],

		// Work / for_employee
		wifi_place: [`nwr["amenity"~"restaurant|cafe|fast_food|hotel|office"]`],
		coworking: [`nwr["amenity"="coworking"]`],

		// Shopping
		mall: [`nwr["shop"="mall"]`],
		hypermarket: [`nwr["shop"="supermarket"]`],
		clothes: [`nwr["shop"="clothes"]`],
		electronics: [`nwr["shop"="electronics"]`],
		sport_shop: [`nwr["shop"="sports"]`],
		bookstore: [`nwr["shop"~"books|bookshop"]`],
		market: [`nwr["shop"~"marketplace|convenience|supermarket"]`],
		souvenir: [`nwr["shop"="gift"]`],

		// Health
		pharmacy_24: [`nwr["amenity"="pharmacy"]`],
		dentistry: [`nwr["amenity"="dentist"]`],
		private_clinic: [`nwr["amenity"="clinic"]`],
		spa: [`nwr["amenity"="spa"]`],
		optics: [`nwr["shop"="optician"]`],

		// Transport
		bus_station: [`nwr["amenity"="bus_station"]`],
		train_station: [`nwr["amenity"="train_station"]`],
		airport: [`nwr["aeroway"="aerodrome"]`],
		car_rental: [`nwr["amenity"="car_rental"]`],
		tire_service: [`nwr["craft"~"tyres|car_repair"]`],

		// Walking
		park: [`nwr["leisure"="park"]`],
		viewpoint: [`nwr["tourism"="viewpoint"]`],
		zoo: [`nwr["tourism"="zoo"]`],
		botanical: [`nwr["leisure"="botanical_garden"]`],

		// Services (subset)
		laundry: [`nwr["amenity"="laundry"]`],
		dry_cleaner: [`nwr["amenity"="dry_cleaning"]`],
		copy_center: [`nwr["shop"="copyshop"]`],
	};

	const ALL_EXPRESSIONS = Object.values(CATEGORY_EXPRESSIONS).flat();

	const expressions: string[] = (() => {
		if (subCategoryId && SUBCATEGORY_EXPRESSIONS[subCategoryId]) {
			return SUBCATEGORY_EXPRESSIONS[subCategoryId];
		}
		if (categoryId && CATEGORY_EXPRESSIONS[categoryId]) {
			return CATEGORY_EXPRESSIONS[categoryId];
		}
		if (categoryId === "food" && subCategoryId) {
			return [`nwr["cuisine"="${subCategoryId}"]`];
		}
		return ALL_EXPRESSIONS;
	})();

	const elementBlocks = expressions
		.map((expr) => {
			const exprWithWifi = wifiRequested
				? `${expr}["internet_access"="wlan"]`
				: expr;
			return `${exprWithWifi}(around:${radius},${lat},${lng});`;
		})
		.join("\n");

	return `
    [out:json][timeout:600];
    (
      ${elementBlocks}
    );
    out body center;
  `;
};

const mapElementToPlace = (el: OverpassElement): OSMPlace | null => {
	const tags = el.tags ?? {};
	const title =
		tags.name || tags["name:ru"] || tags["operator"] || tags.brand || "Место";

	const address =
		tags["addr:full"] ||
		[tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") ||
		undefined;

	const categoryId = tags.amenity;
	const subCategoryId = tags.cuisine;

	const lat = typeof el.lat === "number" ? el.lat : el.center?.lat;
	const lon = typeof el.lon === "number" ? el.lon : el.center?.lon;
	if (typeof lat !== "number" || typeof lon !== "number") return null;

	const wheelchairAccessible =
		tags.wheelchair === "yes" || tags["wheelchair:access"] === "yes";
	const elevatorOrRamp =
		tags.ramp === "yes" ||
		tags["ramp:wheelchair"] === "yes" ||
		tags["wheelchair:access"] === "yes";
	const stepFreeEntrance =
		tags["step_free"] === "yes" ||
		tags["step-free"] === "yes" ||
		tags["wheelchair:entrance"] === "yes" ||
		wheelchairAccessible;
	const accessibleToilet =
		tags["toilets:wheelchair"] === "yes" ||
		tags["toilet:wheelchair"] === "yes" ||
		tags["toilets:access"] === "yes" ||
		tags["toilets:disabled"] === "yes" ||
		tags["toilets:disabled:wheelchair"] === "yes";
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
		id: `${el.type ?? "node"}-${el.id}`,
		title,
		description: tags.description || "Место из OpenStreetMap",
		address,
		categoryId,
		subCategoryId,
		coords: {
			lat,
			lng: lon,
		},
		rating,
		accessibility: {
			wheelchairAccessible,
			elevatorOrRamp,
			stepFreeEntrance,
			accessibleToilet,
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

		return elements.map(mapElementToPlace).filter(Boolean) as OSMPlace[];
	},
};
