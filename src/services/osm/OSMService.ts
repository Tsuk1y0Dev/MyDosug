import { SearchCriteria } from "../../types/searchCriteria";
import {
	isPlaceholderOsmTitle,
	filterOsmPlaces,
} from "../../utils/osmPlaceFilters";

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
	openingHoursRaw?: string;
}

const PUBLIC_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const LOCAL_OVERPASS_URL = "http://192.168.1.186:54321/api/interpreter";

let lastOverpassRequestAt = 0;
const MIN_OVERPASS_INTERVAL_MS = 700;
const MAX_RETRIES = 10;
const RETRY_BASE_DELAY_MS = 800;
const LOCAL_PROBE_CACHE_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status === 504;
const canUseAbortController = typeof AbortController !== "undefined";

let localProbe: { available: boolean; checkedAt: number } | null = null;

async function probeLocalOverpass(): Promise<boolean> {
	const now = Date.now();
	if (localProbe && now - localProbe.checkedAt < LOCAL_PROBE_CACHE_MS) {
		return localProbe.available;
	}
	const mark = (available: boolean) => {
		localProbe = { available, checkedAt: Date.now() };
		return available;
	};
	const probeQuery = `[out:json][timeout:5];node(0,0,0,0);out ids 1;`;
	try {
		if (canUseAbortController) {
			const controller = new AbortController();
			const t = setTimeout(() => controller.abort(), 1200);
			try {
				const res = await fetch(LOCAL_OVERPASS_URL, {
					method: "POST",
					headers: { "Content-Type": "text/plain;charset=UTF-8" },
					body: probeQuery,
					signal: controller.signal,
				});
				return mark(res.ok);
			} finally {
				clearTimeout(t);
			}
		}
		const res = await fetch(LOCAL_OVERPASS_URL, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=UTF-8" },
			body: probeQuery,
		});
		return mark(res.ok);
	} catch {
		return mark(false);
	}
}

type OverpassElement = {
	id: number;
	type?: string;
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

	const categoryIds = criteria?.categoryIds ?? [];
	const subCategoryIds = criteria?.subCategoryIds ?? [];

	const wifiRequested =
		criteria?.filters?.wifi === true ||
		subCategoryIds.includes("wifi_place") ||
		criteria?.goal === "work";

	const CATEGORY_EXPRESSIONS: Record<string, string[]> = {
		food: [`nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|bakery"]`],
		entertainment: [`nwr["amenity"~"cinema|theatre|nightclub"]`],
		sports: [
			`nwr["amenity"~"sports_centre|gym|stadium"]`,
			`nwr["leisure"~"fitness_centre|sports_centre|swimming_pool|ice_rink|yoga_studio"]`,
			`nwr["sport"~"hockey|football|basketball|volleyball|tennis|handball|rugby|ice_skating|roller_skating"]`,
		],
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
	};

	const SUBCATEGORY_EXPRESSIONS: Record<string, string[]> = {
		restaurant: [`nwr["amenity"="restaurant"]`],
		cafe: [`nwr["amenity"="cafe"]`],
		fastfood: [`nwr["amenity"="fast_food"]`],
		bar: [`nwr["amenity"~"bar|pub"]`],
		bakery: [`nwr["amenity"~"bakery|cafe"]`],

		mall: [`nwr["shop"="mall"]`],
		hypermarket: [`nwr["shop"="supermarket"]`],
		clothes: [`nwr["shop"="clothes"]`],
		electronics: [`nwr["shop"="electronics"]`],
		sport_shop: [`nwr["shop"="sports"]`],
		bookstore: [`nwr["shop"~"books|bookshop"]`],
		market: [`nwr["shop"~"marketplace|convenience|supermarket"]`],
		souvenir: [`nwr["shop"="gift"]`],

		gym: [
			`nwr["amenity"~"gym|fitness_centre"]`,
			`nwr["leisure"~"fitness_centre"]`,
		],
		pool: [
			`nwr["leisure"~"swimming_pool|pool"]`,
			`nwr["amenity"~"swimming_pool"]`,
		],
		yoga: [
			`nwr["amenity"~"yoga|yoga_studio"]`,
			`nwr["leisure"~"yoga|yoga_studio"]`,
		],
		skating: [
			`nwr["leisure"~"ice_rink|roller_rink"]`,
			`nwr["sport"~"ice_skating|roller_skating"]`,
		],
		equipment_rent: [
			`nwr["amenity"~"sports_rental|rental"]`,
			`nwr["shop"~"sports|outdoor"]`,
			`nwr["craft"="rental"]`,
		],
		team_sports: [
			`nwr["sport"~"football|basketball|volleyball|rugby|handball|ice_hockey"]`,
			`nwr["leisure"~"sports_centre|stadium"]`,
		],
		outdoor_active: [
			`nwr["sport"~"hiking|cycling|running|climbing"]`,
			`nwr["leisure"~"track|park"]`,
			`nwr["highway"~"path|footway|cycleway"]`,
		],

		pharmacy_24: [`nwr["amenity"="pharmacy"]`],
		dentistry: [`nwr["amenity"="dentist"]`],
		private_clinic: [`nwr["amenity"="clinic"]`],
		spa: [`nwr["amenity"="spa"]`],
		optics: [`nwr["shop"="optician"]`],

		bus_station: [`nwr["amenity"="bus_station"]`],
		train_station: [`nwr["amenity"="train_station"]`],
		airport: [`nwr["aeroway"="aerodrome"]`],
		car_rental: [`nwr["amenity"="car_rental"]`],
		tire_service: [`nwr["craft"~"tyres|car_repair"]`],

		park: [`nwr["leisure"="park"]`],
		viewpoint: [`nwr["tourism"="viewpoint"]`],
		zoo: [`nwr["tourism"="zoo"]`],
		botanical: [`nwr["leisure"="botanical_garden"]`],

		laundry: [`nwr["amenity"="laundry"]`],
		dry_cleaner: [`nwr["amenity"="dry_cleaning"]`],
		copy_center: [`nwr["shop"="copyshop"]`],
	};

	const ALL_EXPRESSIONS = Object.values(CATEGORY_EXPRESSIONS).flat();

	const expressionsSet = new Set<string>();
	for (const catId of categoryIds) {
		for (const expr of CATEGORY_EXPRESSIONS[catId] ?? []) {
			expressionsSet.add(expr);
		}
	}

	for (const subId of subCategoryIds) {
		if (SUBCATEGORY_EXPRESSIONS[subId]) {
			for (const expr of SUBCATEGORY_EXPRESSIONS[subId]) {
				expressionsSet.add(expr);
			}
		} else if (categoryIds.includes("food")) {
			expressionsSet.add(`nwr["cuisine"="${subId}"]`);
		}
	}

	const expressions: string[] =
		expressionsSet.size > 0 ? Array.from(expressionsSet) : ALL_EXPRESSIONS;

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

const AMENITY_LABELS: Record<string, string> = {
	restaurant: "Ресторан",
	cafe: "Кафе",
	fast_food: "Фастфуд",
	bar: "Бар",
	pub: "Паб",
	cinema: "Кинотеатр",
	theatre: "Театр",
	museum: "Музей",
	library: "Библиотека",
	park: "Парк",
	gym: "Спортзал",
	pharmacy: "Аптека",
	hospital: "Больница",
	place_of_worship: "Храм / культовое место",
};

function buildOsmDescription(tags: Record<string, string>): string {
	const bits: string[] = [];
	const amenity = tags.amenity;
	const shop = tags.shop;
	const leisure = tags.leisure;
	const tourism = tags.tourism;

	if (amenity) {
		bits.push(
			AMENITY_LABELS[amenity]
				? `${AMENITY_LABELS[amenity]} (${amenity})`
				: `Тип: ${amenity}`,
		);
	}
	if (shop) bits.push(`Магазин: ${shop}`);
	if (leisure) bits.push(`Досуг: ${leisure}`);
	if (tourism) bits.push(tourism);
	if (tags.cuisine) bits.push(`Кухня: ${tags.cuisine}`);

	if (bits.length) return bits.join(" · ");
	return "Данные из сообщества OpenStreetMap (без описания в базе).";
}

const mapElementToPlace = (el: OverpassElement): OSMPlace | null => {
	const tags = el.tags ?? {};
	const fromAmenity =
		tags.amenity && AMENITY_LABELS[tags.amenity]
			? AMENITY_LABELS[tags.amenity]
			: tags.amenity
				? `${tags.amenity}`
				: undefined;
	const titleRaw =
		tags.name ||
		tags["name:ru"] ||
		tags.operator ||
		tags.brand ||
		(tags.shop ? `Магазин (${tags.shop})` : undefined) ||
		fromAmenity ||
		"Место";

	const title = titleRaw.trim();
	if (isPlaceholderOsmTitle(title)) return null;

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

	const openingRaw = tags.opening_hours?.trim();

	return {
		id: `${el.type ?? "node"}-${el.id}`,
		title,
		description: buildOsmDescription(tags),
		address,
		categoryId,
		subCategoryId,
		coords: {
			lat,
			lng: lon,
		},
		rating,
		openingHoursRaw: openingRaw || undefined,
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
		let lastError: any = null;
		const localAvailable = await probeLocalOverpass();
		let forcePublicOnly = false;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			const now = Date.now();
			const elapsed = now - lastOverpassRequestAt;
			if (elapsed < MIN_OVERPASS_INTERVAL_MS) {
				await sleep(MIN_OVERPASS_INTERVAL_MS - elapsed);
			}
			lastOverpassRequestAt = Date.now();

			try {
				const endpoints =
					localAvailable && !forcePublicOnly
						? [LOCAL_OVERPASS_URL, PUBLIC_OVERPASS_URL]
						: [PUBLIC_OVERPASS_URL];
				let response: Response | null = null;
				let lastEndpointError: any = null;

				for (const endpoint of endpoints) {
					try {
						response = await fetch(endpoint, {
							method: "POST",
							headers: {
								"Content-Type": "text/plain;charset=UTF-8",
								"User-Agent": "MyDosugApp/1.0 (matpol050110@gmail.com)",
							},
							body: query,
						});
						if (endpoint === LOCAL_OVERPASS_URL && !response.ok) {
							forcePublicOnly = true;
							localProbe = { available: false, checkedAt: Date.now() };
						}
						if (response.ok || endpoint === PUBLIC_OVERPASS_URL) break;
					} catch (e) {
						lastEndpointError = e;
						if (endpoint === LOCAL_OVERPASS_URL) {
							forcePublicOnly = true;
							localProbe = { available: false, checkedAt: Date.now() };
							continue;
						}
						throw e;
					}
				}

				if (!response) {
					throw lastEndpointError || new Error("Overpass endpoint unavailable");
				}

				if (response.ok) {
					const json = await response.json();
					const elements: OverpassElement[] = Array.isArray(json.elements)
						? json.elements
						: [];

					const raw = elements
						.map(mapElementToPlace)
						.filter(Boolean) as OSMPlace[];
					return filterOsmPlaces(raw);
				}

				if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
					const delay =
						RETRY_BASE_DELAY_MS * Math.pow(3, attempt) +
						Math.round(Math.random() * 250);
					await sleep(delay);
					continue;
				}

				const err: any = new Error(`Overpass API error: ${response.status}`);
				err.status = response.status;
				throw err;
			} catch (e: any) {
				lastError = e;

				if (attempt < MAX_RETRIES) {
					const delay = RETRY_BASE_DELAY_MS * Math.pow(3, attempt);
					await sleep(delay);
					continue;
				}
			}
		}

		throw lastError || new Error("Overpass API error");
	},
};
