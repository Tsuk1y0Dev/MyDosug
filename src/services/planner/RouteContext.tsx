import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	ReactNode,
	useEffect,
	useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	DayRouteState,
	RouteEvent,
	RouteOrigin,
	RouteSegment,
	TravelMode,
} from "../../types/route";
import { YandexRoutingService } from "../yandex/YandexRoutingService";
import type { RoutingMode } from "../yandex/YandexRoutingService";
import { localRouteDayKey } from "../../utils/timingUtils";

interface RouteContextType extends DayRouteState {
	setOrigin: (origin: RouteOrigin | null) => void;
	setEvents: (events: RouteEvent[]) => void;
	insertEvent: (index: number, event: RouteEvent) => void;
	insertEventWithOrigin: (
		index: number,
		event: RouteEvent,
		originUpdate: "unchanged" | RouteOrigin | null,
	) => void;
	updateEvent: (eventId: string, updates: Partial<RouteEvent>) => void;
	removeEvent: (eventId: string) => void;
	updateTravelMode: (index: number, mode: TravelMode) => void;
	clearRoute: () => void;
	pendingInsertIndex: number | null;
	setPendingInsertIndex: (index: number | null) => void;
	syncPlanCalendarDay: (date: Date) => void;
	getRoutesByDaySnapshot: () => Record<
		string,
		{ origin: RouteOrigin | null; events: RouteEvent[] }
	>;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

type RouteProviderProps = {
	children: ReactNode;
};

const mockRouteSegment = (
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
	mode: TravelMode,
): Omit<RouteSegment, "fromEventId" | "toEventId"> => {
	const dx = to.lat - from.lat;
	const dy = to.lng - from.lng;
	const distanceMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * 111000);

	const baseSpeedKmH = mode === "walking" ? 5 : mode === "driving" ? 40 : 20;

	const durationMinutes = Math.max(
		3,
		Math.min(Math.round((distanceMeters / 1000 / baseSpeedKmH) * 60), 180),
	);

	const polyline = `mock_polyline_${from.lat}_${from.lng}_${to.lat}_${to.lng}_${mode}`;

	return {
		distanceMeters,
		durationMinutes,
		travelMode: mode,
		geometry: { polyline },
	};
};

const START_MINUTES = 0;

const recomputeArrivalTimes = (
	origin: RouteOrigin | null,
	events: RouteEvent[],
	segments: RouteSegment[],
): RouteEvent[] => {
	if (!events.length) return events;

	let currentMinutes = START_MINUTES;
	const updated: RouteEvent[] = [];

	for (let i = 0; i < events.length; i += 1) {
		const current = events[i];
		let seg: RouteSegment | undefined;

		if (i === 0) {
			if (origin) {
				seg = segments.find(
					(s) => s.fromEventId === "origin" && s.toEventId === current.id,
				);
			}
		} else {
			const prevEvent = updated[i - 1];
			const prevOriginal = events[i - 1];

			currentMinutes += prevOriginal.duration;

			seg = segments.find(
				(s) => s.fromEventId === prevEvent.id && s.toEventId === current.id,
			);
		}

		if (seg) {
			currentMinutes += seg.durationMinutes;
		}

		const hours = Math.floor(currentMinutes / 60) % 24;
		const minutes = currentMinutes % 60;
		const arrivalTime = `${String(hours).padStart(2, "0")}:${String(
			minutes,
		).padStart(2, "0")}`;

		updated.push({
			...current,
			arrivalTime,
		});
	}

	return updated;
};

function routeEventsDataEqual(a: RouteEvent[], b: RouteEvent[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		const x = a[i];
		const y = b[i];
		if (
			x.id !== y.id ||
			x.arrivalTime !== y.arrivalTime ||
			x.duration !== y.duration ||
			(x.customTitle ?? "") !== (y.customTitle ?? "") ||
			x.coords.lat !== y.coords.lat ||
			x.coords.lng !== y.coords.lng ||
			x.travelModeToNext !== y.travelModeToNext ||
			Boolean(x.lockTimes) !== Boolean(y.lockTimes) ||
			(x.placeId ?? "") !== (y.placeId ?? "") ||
			(x.description ?? "") !== (y.description ?? "") ||
			(x.address ?? "") !== (y.address ?? "") ||
			(x.openingHours ?? "") !== (y.openingHours ?? "") ||
			(x.budgetNote ?? "") !== (y.budgetNote ?? "")
		) {
			return false;
		}
	}
	return true;
}

function segmentsDataEqual(a: RouteSegment[], b: RouteSegment[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		const x = a[i];
		const y = b[i];
		if (
			x.fromEventId !== y.fromEventId ||
			x.toEventId !== y.toEventId ||
			x.distanceMeters !== y.distanceMeters ||
			x.durationMinutes !== y.durationMinutes ||
			x.travelMode !== y.travelMode
		) {
			return false;
		}
	}
	return true;
}

export const RouteProvider = ({ children }: RouteProviderProps) => {
	const [state, setState] = useState<DayRouteState>({
		origin: null,
		events: [],
		segments: [],
		cachedPolyline: null,
	});
	const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(
		null,
	);

	const stateRef = useRef(state);
	stateRef.current = state;

	const routesByDayRef = useRef<
		Record<string, { origin: RouteOrigin | null; events: RouteEvent[] }>
	>({});
	const activeDayKeyRef = useRef(localRouteDayKey(new Date()));

	const STORAGE_KEY = "@mydosug_routes_by_day_v1";

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const raw = await AsyncStorage.getItem(STORAGE_KEY);
				if (!raw || cancelled) return;
				const parsed = JSON.parse(raw) as Record<
					string,
					{ origin: RouteOrigin | null; events: RouteEvent[] }
				>;
				if (!parsed || typeof parsed !== "object") return;
				routesByDayRef.current = parsed;
				const saved = parsed[activeDayKeyRef.current];
				if (saved) {
					setState((prev) => ({
						...prev,
						origin: saved.origin ?? null,
						events: Array.isArray(saved.events) ? saved.events : [],
						segments: [],
						cachedPolyline: null,
					}));
				}
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		const key = activeDayKeyRef.current;
		routesByDayRef.current[key] = { origin: state.origin, events: state.events };
		if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
		persistTimerRef.current = setTimeout(() => {
			void AsyncStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(routesByDayRef.current),
			);
		}, 250);
		return () => {
			if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
		};
	}, [state.origin, state.events]);

	const getRoutesByDaySnapshot = useCallback(() => {
		const cur = stateRef.current;
		const key = activeDayKeyRef.current;
		return {
			...routesByDayRef.current,
			[key]: { origin: cur.origin, events: cur.events },
		};
	}, []);

	const syncPlanCalendarDay = useCallback((date: Date) => {
		const newKey = localRouteDayKey(date);
		if (newKey === activeDayKeyRef.current) {
			return;
		}
		const cur = stateRef.current;
		routesByDayRef.current[activeDayKeyRef.current] = {
			origin: cur.origin,
			events: cur.events,
		};
		activeDayKeyRef.current = newKey;
		const saved = routesByDayRef.current[newKey];
		setState((prev) => ({
			...prev,
			origin: saved !== undefined ? saved.origin : null,
			events: saved !== undefined ? saved.events : [],
			segments: [],
			cachedPolyline: null,
		}));
		setPendingInsertIndex(null);
	}, []);

	const recomputeCachedPolyline = useCallback((segments: RouteSegment[]) => {
		if (segments.length === 0) {
			return null;
		}
		return segments.map((s) => s.geometry.polyline).join("|");
	}, []);

	const setOrigin = useCallback((origin: RouteOrigin | null) => {
		setState((prev) => ({
			...prev,
			origin,
		}));
	}, []);

	const setEvents = useCallback((events: RouteEvent[]) => {
		setState((prev) => ({
			...prev,
			events,
		}));
	}, []);

	const insertEvent = useCallback((index: number, event: RouteEvent) => {
		setPendingInsertIndex(null);
		setState((prev) => {
			const events = [...prev.events];
			const safeIndex = Math.max(0, Math.min(index, events.length));
			events.splice(safeIndex, 0, event);
			return {
				...prev,
				events,
			};
		});
	}, []);

	const insertEventWithOrigin = useCallback(
		(
			index: number,
			event: RouteEvent,
			originUpdate: "unchanged" | RouteOrigin | null,
		) => {
			setPendingInsertIndex(null);
			setState((prev) => {
				const events = [...prev.events];
				const safeIndex = Math.max(0, Math.min(index, events.length));
				events.splice(safeIndex, 0, event);
				const origin =
					originUpdate === "unchanged" ? prev.origin : originUpdate;
				return {
					...prev,
					events,
					origin,
				};
			});
		},
		[],
	);

	const updateEvent = useCallback(
		(eventId: string, updates: Partial<RouteEvent>) => {
			setState((prev) => ({
				...prev,
				events: prev.events.map((e) =>
					e.id === eventId
						? {
								...e,
								...updates,
								lockTimes:
									updates.lockTimes !== undefined ? updates.lockTimes : true,
							}
						: e,
				),
			}));
		},
		[],
	);

	const removeEvent = useCallback((eventId: string) => {
		setState((prev) => ({
			...prev,
			events: prev.events.filter((e) => e.id !== eventId),
		}));
	}, []);

	const updateTravelMode = useCallback((index: number, mode: TravelMode) => {
		setState((prev) => {
			if (index < 0 || index >= prev.events.length) {
				return prev;
			}
			const events = [...prev.events];
			events[index] = {
				...events[index],
				travelModeToNext: mode,
			};
			return {
				...prev,
				events,
			};
		});
	}, []);

	const clearRoute = useCallback(() => {
		setState({
			origin: null,
			events: [],
			segments: [],
			cachedPolyline: null,
		});
		routesByDayRef.current[activeDayKeyRef.current] = {
			origin: null,
			events: [],
		};
		setPendingInsertIndex(null);
	}, []);

	useEffect(() => {
		const updateRoute = async () => {
			const origin = state.origin;
			const events = state.events;
			if (events.length === 0) {
				setState((prev) => {
					if (prev.segments.length === 0 && prev.cachedPolyline == null) {
						return prev;
					}
					return {
						...prev,
						segments: [],
						cachedPolyline: null,
					};
				});
				return;
			}

			const useOriginLeg = origin != null && origin.id !== "from_first_stop";

			const points: { lat: number; lng: number }[] = useOriginLeg
				? [origin.coords, ...events.map((e) => e.coords)]
				: events.map((e) => e.coords);

			if (points.length < 2) {
				setState((prev) => {
					if (prev.segments.length === 0 && prev.cachedPolyline == null) {
						return prev;
					}
					return {
						...prev,
						segments: [],
						cachedPolyline: null,
					};
				});
				return;
			}

			const modeForLeg = (fromIndex: number): RoutingMode => {
				const tm: TravelMode =
					fromIndex >= 0 && fromIndex < events.length
						? events[fromIndex].travelModeToNext
						: "driving";
				if (tm === "walking") return "walking";
				if (tm === "transit") return "transit";
				return "driving";
			};

			const legPairs: Array<{
				from: { lat: number; lng: number };
				to: { lat: number; lng: number };
				mode: RoutingMode;
			}> = [];

			if (useOriginLeg && origin) {
				legPairs.push({
					from: origin.coords,
					to: events[0].coords,
					mode: modeForLeg(0),
				});
			}
			for (let i = 1; i < events.length; i += 1) {
				legPairs.push({
					from: events[i - 1].coords,
					to: events[i].coords,
					mode: modeForLeg(i - 1),
				});
			}

			const allSameMode =
				legPairs.length > 0 &&
				legPairs.every((x) => x.mode === legPairs[0].mode);

			const routingAll = allSameMode
				? await YandexRoutingService.getRoute(points, legPairs[0].mode)
				: null;

			const legRoutings = routingAll
				? routingAll.legs
				: await Promise.all(
						legPairs.map(async (lp) => {
							const r = await YandexRoutingService.getRoute(
								[lp.from, lp.to],
								lp.mode,
							);
							return r?.legs?.[0] ?? null;
						}),
					);

			let segments: RouteSegment[] = [];

			if (
				(routingAll && Array.isArray(routingAll.legs)) ||
				legRoutings.some((x) => x != null)
			) {
				let legIndex = 0;
				const readLeg = () => {
					const leg = (legRoutings as any[])[legIndex++];
					return leg && typeof leg.distanceMeters === "number"
						? leg
						: { distanceMeters: 0, durationSeconds: 0 };
				};

				if (useOriginLeg) {
					const firstLeg = readLeg();
					segments.push({
						fromEventId: "origin",
						toEventId: events[0].id,
						distanceMeters: firstLeg.distanceMeters,
						durationMinutes: Math.max(
							1,
							Math.round(firstLeg.durationSeconds / 60),
						),
						travelMode:
							modeForLeg(0) === "walking"
								? "walking"
								: modeForLeg(0) === "transit"
									? "transit"
									: "driving",
						geometry: { polyline: "" },
					});
				}

				for (let i = 1; i < events.length; i += 1) {
					const from = events[i - 1];
					const to = events[i];
					const leg = readLeg();
					segments.push({
						fromEventId: from.id,
						toEventId: to.id,
						distanceMeters: leg.distanceMeters,
						durationMinutes: Math.max(1, Math.round(leg.durationSeconds / 60)),
						travelMode: from.travelModeToNext,
						geometry: { polyline: "" },
					});
				}
			} else {
				if (useOriginLeg && origin && events.length) {
					const first = events[0];
					const baseFirst = mockRouteSegment(
						origin.coords,
						first.coords,
						"driving",
					);
					segments.push({
						fromEventId: "origin",
						toEventId: first.id,
						...baseFirst,
					});
				}
				for (let i = 1; i < events.length; i += 1) {
					const from = events[i - 1];
					const to = events[i];
					const base = mockRouteSegment(
						from.coords,
						to.coords,
						from.travelModeToNext,
					);
					segments.push({
						fromEventId: from.id,
						toEventId: to.id,
						...base,
					});
				}
			}

			const updatedEvents = recomputeArrivalTimes(
				useOriginLeg ? origin : null,
				events,
				segments,
			);
			const merged = updatedEvents.map((ev) => {
				const orig = events.find((e) => e.id === ev.id);
				if (orig?.lockTimes) {
					return {
						...ev,
						arrivalTime: orig.arrivalTime,
						duration: orig.duration,
						customTitle: orig.customTitle ?? ev.customTitle,
						lockTimes: true,
					};
				}
				return ev;
			});

			const cachedPolyline = recomputeCachedPolyline(segments);

			setState((prev) => {
				if (
					routeEventsDataEqual(merged, prev.events) &&
					segmentsDataEqual(segments, prev.segments) &&
					prev.cachedPolyline === cachedPolyline
				) {
					return prev;
				}
				return {
					...prev,
					events: merged,
					segments,
					cachedPolyline,
				};
			});
		};

		updateRoute();
	}, [state.origin, state.events, recomputeCachedPolyline]);

	const value: RouteContextType = useMemo(
		() => ({
			...state,
			setOrigin,
			setEvents,
			insertEvent,
			insertEventWithOrigin,
			updateEvent,
			removeEvent,
			updateTravelMode,
			clearRoute,
			pendingInsertIndex,
			setPendingInsertIndex,
			syncPlanCalendarDay,
			getRoutesByDaySnapshot,
		}),
		[
			state,
			setOrigin,
			setEvents,
			insertEvent,
			insertEventWithOrigin,
			updateEvent,
			removeEvent,
			updateTravelMode,
			clearRoute,
			pendingInsertIndex,
			setPendingInsertIndex,
			syncPlanCalendarDay,
			getRoutesByDaySnapshot,
		],
	);

	return (
		<RouteContext.Provider value={value}>{children}</RouteContext.Provider>
	);
};

export const useRoute = () => {
	const context = useContext(RouteContext);
	if (!context) {
		throw new Error("useRoute must be used within a RouteProvider");
	}
	return context;
};
