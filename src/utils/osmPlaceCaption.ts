import type { OSMPlace } from "../services/osm/OSMService";

export function formatOsmOpeningCaption(place: OSMPlace): string {
	const raw = place.openingHoursRaw?.trim();
	if (raw) return raw;
	return "Не нашли время работы";
}

export function formatOsmBudgetCaption(place: OSMPlace): string {
	const t = place.tags ?? {};
	if (t.fee === "no" || t.payment === "no") {
		return "Бесплатно (по данным OSM)";
	}
	if (t.charge && String(t.charge).trim()) {
		return `Стоимость: ${String(t.charge).trim()}`;
	}
	if (t.fee === "yes") {
		return "Возможна плата (в OSM без суммы)";
	}
	if (t.payment || t.currency) {
		return "Есть данные об оплате в OSM (уточняйте на месте)";
	}
	return "Не нашли информацию о бюджете";
}
