/**
 * Профиль и локации пользователя (chess.electroscope.ru).
 * Эндпоинты ожидают application/x-www-form-urlencoded и token в теле / query.
 */

const API_BASE =
	process.env.EXPO_PUBLIC_API_URL || "https://chess.electroscope.ru/api";

function buildUrl(path: string, query?: Record<string, string>): string {
	const base = API_BASE.replace(/\/$/, "");
	const p = path.startsWith("/") ? path : `/${path}`;
	let url = `${base}${p}`;
	if (query && Object.keys(query).length) {
		const qs = new URLSearchParams(query).toString();
		url += (url.includes("?") ? "&" : "?") + qs;
	}
	return url;
}

async function parseJsonResponse(res: Response): Promise<any> {
	const text = await res.text();
	if (!text) return {};
	try {
		return JSON.parse(text);
	} catch {
		const i = text.lastIndexOf("{");
		if (i >= 0) {
			try {
				return JSON.parse(text.slice(i));
			} catch {
				/* fallthrough */
			}
		}
		return { raw: text };
	}
}

/** GET /user/profile?token= */
export async function fetchUserProfile(token: string): Promise<any> {
	const url = buildUrl("/user/profile", { token });
	const res = await fetch(url, { method: "GET" });
	const body = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
	}
	return body;
}

/** POST /user/profile — data — JSON-строка (как ждёт json_decode на сервере). */
export async function postUserProfile(
	token: string,
	dataPayload: Record<string, unknown>,
): Promise<{ message?: string }> {
	const url = buildUrl("/user/profile");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("data", JSON.stringify(dataPayload));

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
		},
		body: body.toString(),
	});
	const json = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
	}
	return json;
}

export type ServerLocationInput = {
	name: string;
	lat: number;
	long: number;
	description?: string;
};

/** POST /user/locations/add — data: JSON-массив строкой. */
export async function postUserLocationsAdd(
	token: string,
	locations: ServerLocationInput[],
): Promise<{ message?: string }> {
	const url = buildUrl("/user/locations/add");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("data", JSON.stringify(locations));

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
		},
		body: body.toString(),
	});
	const json = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
	}
	return json;
}

/** POST /user/locations/remove — id: индекс в массиве локаций (0 — первая). */
export async function postUserLocationRemove(
	token: string,
	index: number,
): Promise<{ message?: string }> {
	const url = buildUrl("/user/locations/remove");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("id", String(index));

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
		},
		body: body.toString(),
	});
	const json = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
	}
	return json;
}

/** POST /user/locations/update — id: индекс, data: JSON-объект локации. */
export async function postUserLocationUpdate(
	token: string,
	index: number,
	location: ServerLocationInput,
): Promise<{ message?: string }> {
	const url = buildUrl("/user/locations/update");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("id", String(index));
	body.set("data", JSON.stringify(location));

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
		},
		body: body.toString(),
	});
	const json = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
	}
	return json;
}
