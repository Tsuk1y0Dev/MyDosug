const API_BASE =
	process.env.EXPO_PUBLIC_API_URL || "https://chess.electroscope.ru/api";

const FETCH_TIMEOUT_MS = 25000;

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

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
			} catch {}
		}
		return { raw: text };
	}
}

export async function fetchUserProfile(token: string): Promise<any> {
	const url = buildUrl("/user/profile", { token });
	const res = await fetchWithTimeout(url, { method: "GET" });
	const body = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
	}
	return body;
}

export async function postUserProfile(
	token: string,
	dataPayload: Record<string, unknown>,
): Promise<{ message?: string }> {
	const url = buildUrl("/user/profile");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("data", JSON.stringify(dataPayload));

	const res = await fetchWithTimeout(url, {
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

type UserActionResponse = { message?: string; error?: string };

async function postUserAction(
	path: string,
	token: string,
	params: Record<string, string>,
): Promise<UserActionResponse> {
	const url = buildUrl(path);
	const body = new URLSearchParams();
	body.set("token", token);
	for (const [k, v] of Object.entries(params)) body.set(k, v);
	const res = await fetchWithTimeout(url, {
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

export async function postUserEventAdd(
	token: string,
	event: Record<string, unknown>,
): Promise<UserActionResponse> {
	return postUserAction("/user/events/add", token, {
		data: JSON.stringify(event),
	});
}

export async function postUserEventUpdate(
	token: string,
	id: number,
	event: Record<string, unknown>,
): Promise<UserActionResponse> {
	return postUserAction("/user/events/update", token, {
		id: String(id),
		data: JSON.stringify(event),
	});
}

export async function postUserEventRemove(
	token: string,
	id: number,
): Promise<UserActionResponse> {
	return postUserAction("/user/events/remove", token, {
		id: String(id),
	});
}

export async function postUserFavoriteAdd(
	token: string,
	pid: string,
): Promise<UserActionResponse> {
	return postUserAction("/user/favorite/add", token, {
		pid,
	});
}

export async function postUserFavoriteRemove(
	token: string,
	pid: string,
): Promise<UserActionResponse> {
	return postUserAction("/user/favorite/remove", token, {
		pid,
	});
}

export type ServerLocationInput = {
	name: string;
	lat: number;
	long: number;
	description?: string;
};

export async function postUserLocationsAdd(
	token: string,
	locations: ServerLocationInput[],
): Promise<{ message?: string }> {
	const url = buildUrl("/user/locations/add");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("data", JSON.stringify(locations));

	const res = await fetchWithTimeout(url, {
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

export async function postUserLocationRemove(
	token: string,
	index: number,
): Promise<{ message?: string }> {
	const url = buildUrl("/user/locations/remove");
	const body = new URLSearchParams();
	body.set("token", token);
	body.set("id", String(index));

	const res = await fetchWithTimeout(url, {
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

	const res = await fetchWithTimeout(url, {
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
