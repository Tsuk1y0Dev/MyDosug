import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
	useCallback,
	useRef,
	useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StartPoint } from "../types/planner";
import type { TimelineEvent } from "../types/timeline";
import type {
	SavedLocation,
	UserProfile,
	AccessibilitySettings,
} from "../types/userProfile";
import { useAuth } from "../services/auth/AuthContext";
import { useFavorites } from "../services/favorites/FavoritesContext";
import {
	fetchUserProfile,
	postUserProfile,
	postUserEventAdd,
	postUserEventUpdate,
	postUserEventRemove,
	postUserFavoriteAdd,
	postUserFavoriteRemove,
	postUserLocationsAdd,
	postUserLocationRemove,
	postUserLocationUpdate,
} from "../services/api/userProfileApi";
import {
	mapServerProfileToUserProfile,
	placeStubFromOsmId,
	buildProfileSettingsPayload,
	normalizeFavoriteId,
} from "../services/api/mapServerProfile";
import {
	getEventsByDate,
	prunePastTimelineEvents,
	sortTimelineEvents,
	timelineEventToServerEventPayload,
} from "../services/timeline/timelineStorage";
import type { RouteEvent } from "../types/route";
import { mergeRouteIntoTimeline } from "../utils/routeToTimeline";
import { savedLocationToPlace } from "../utils/placeConverters";

export type {
	SavedLocationType,
	SavedLocation,
	UserProfile,
	AccessibilitySettings,
} from "../types/userProfile";
export type { TimelineEvent } from "../types/timeline";

interface UserContextType {
	profile: UserProfile | null;
	isLoading: boolean;
	timelineEvents: TimelineEvent[];
	updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
	addSavedLocation: (location: Omit<SavedLocation, "id">) => Promise<void>;
	removeSavedLocation: (id: string) => Promise<void>;
	updateSavedLocation: (
		id: string,
		updates: Partial<
			Pick<SavedLocation, "name" | "coords" | "description" | "type" | "icon">
		>,
	) => Promise<void>;
	updateAccessibilitySettings: (
		updates: Partial<AccessibilitySettings>,
	) => Promise<void>;
	addTimelineEvent: (newEvent: TimelineEvent) => Promise<void>;
	deleteTimelineEvent: (timestamp: number, id: string) => Promise<void>;
	getTimelineEventsByDate: (date: Date) => TimelineEvent[];
	syncFullRoutePlanToTimeline: (
		routesByDay: Record<string, { events: RouteEvent[] }>,
	) => Promise<void>;
}

const STORAGE_KEY = "@mydosug_user_profile";
const STORAGE_TOKEN_KEY = "@mydosug_token";

const timelineEventKey = (e: TimelineEvent) =>
	`${e.id}__${Math.floor(e.timestamp)}`;
const timelineEventDataEqual = (a: TimelineEvent, b: TimelineEvent) =>
	a.id === b.id &&
	Math.floor(a.timestamp) === Math.floor(b.timestamp) &&
	(a.title ?? "") === (b.title ?? "") &&
	(a.note ?? "") === (b.note ?? "") &&
	Math.floor(a.duration ?? 0) === Math.floor(b.duration ?? 0);

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const { user, isLoading: authLoading, updateLocalUser } = useAuth();
	const { favoritePlaces, replaceFavoritePlaces, replaceUserCreatedPlaces } =
		useFavorites();

	const favoritePlacesRef = useRef(favoritePlaces);
	favoritePlacesRef.current = favoritePlaces;

	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [remoteBusy, setRemoteBusy] = useState(false);

	const profileRef = useRef<UserProfile | null>(null);
	profileRef.current = profile;

	const timelineEventsRef = useRef(timelineEvents);
	timelineEventsRef.current = timelineEvents;
	const lastPostedProfilePayloadRef = useRef<string>("");
	const lastLocalProfilePreferenceTouchRef = useRef(0);

	const prevHadUserRef = useRef(false);
	const timelineServerRef = useRef<TimelineEvent[]>([]);
	const favoriteServerIdsRef = useRef<string[]>([]);
	const timelineSyncRef = useRef<{
		inFlight: boolean;
		queued: TimelineEvent[] | null;
	}>({ inFlight: false, queued: null });
	const favoriteSyncRef = useRef<{
		inFlight: boolean;
		queued: string[] | null;
	}>({ inFlight: false, queued: null });

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = useCallback(async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				setProfile(JSON.parse(stored));
			} else {
				setProfile(null);
			}
		} catch (e) {
			console.error("Error loading profile", e);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const persist = useCallback(async (next: UserProfile | null) => {
		try {
			if (!next) {
				await AsyncStorage.removeItem(STORAGE_KEY);
			} else {
				await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			}
		} catch (e) {
			console.error("Error saving profile", e);
		}
	}, []);

	const hydrateFromServer = useCallback(async () => {
		const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
		if (!token || !user) return;
		setRemoteBusy(true);
		try {
			const raw = await fetchUserProfile(token);
			const {
				profile: remoteProfileBase,
				favoriteIds,
				timelineEvents: serverTl,
			} = mapServerProfileToUserProfile(raw, user.email, user.id);
			const prevLocal = profileRef.current;
			const mergePrefsMs = 5000;
			const touchAt = lastLocalProfilePreferenceTouchRef.current;
			const mergePrefs =
				prevLocal != null &&
				touchAt > 0 &&
				Date.now() - touchAt < mergePrefsMs;
			let remoteProfile =
				mergePrefs && prevLocal
					? {
							...remoteProfileBase,
							vegetarian: prevLocal.vegetarian,
							wheelchairAccessible: prevLocal.wheelchairAccessible,
							defaultTransportMode: prevLocal.defaultTransportMode,
							averageWalkingTime: prevLocal.averageWalkingTime,
							defaultStartPoint: prevLocal.defaultStartPoint,
							accessibilitySettings: prevLocal.accessibilitySettings,
						}
					: remoteProfileBase;

			if (
				prevLocal?.defaultStartPoint?.type === "custom" &&
				prevLocal.defaultStartPoint.coordinates
			) {
				remoteProfile = {
					...remoteProfile,
					defaultStartPoint: {
						...(remoteProfile.defaultStartPoint ?? prevLocal.defaultStartPoint),
						...prevLocal.defaultStartPoint,
					},
				};
			}

			setProfile(remoteProfile);
			await persist(remoteProfile);
			setTimelineEvents(serverTl);
			timelineServerRef.current = serverTl;
			favoriteServerIdsRef.current = favoriteIds
				.map(normalizeFavoriteId)
				.filter(Boolean);
			if (
				!favoriteSyncRef.current.inFlight &&
				!favoriteSyncRef.current.queued
			) {
				const serverNorm = new Set(
					favoriteIds.map(normalizeFavoriteId).filter(Boolean),
				);
				const localPlaces = favoritePlacesRef.current;
				const localNorm = new Set(
					localPlaces.map((p) => normalizeFavoriteId(p.id)),
				);
				const merged = new Set([...serverNorm, ...localNorm]);
				replaceFavoritePlaces(
					[...merged].map((id) => {
						const p = localPlaces.find(
							(x) => normalizeFavoriteId(x.id) === id,
						);
						return p ?? placeStubFromOsmId(id);
					}),
				);
			}
			replaceUserCreatedPlaces(
				(remoteProfile.savedLocations ?? []).map(savedLocationToPlace),
			);
			const n = remoteProfile.name?.trim();
			if (n) {
				updateLocalUser({ name: n });
			}
		} catch (e) {
			console.warn("User profile fetch failed:", e);
		} finally {
			setRemoteBusy(false);
		}
	}, [
		user,
		persist,
		replaceFavoritePlaces,
		replaceUserCreatedPlaces,
		updateLocalUser,
	]);

	useEffect(() => {
		if (authLoading) return;
		if (user) {
			void hydrateFromServer();
			prevHadUserRef.current = true;
			return;
		}
		if (prevHadUserRef.current) {
			prevHadUserRef.current = false;
			void (async () => {
				await AsyncStorage.removeItem(STORAGE_KEY);
				setProfile(null);
				setTimelineEvents([]);
				timelineServerRef.current = [];
				favoriteServerIdsRef.current = [];
				replaceFavoritePlaces([]);
				replaceUserCreatedPlaces([]);
			})();
		}
	}, [
		user,
		authLoading,
		hydrateFromServer,
		replaceFavoritePlaces,
		replaceUserCreatedPlaces,
	]);

	useEffect(() => {
		if (authLoading || !user || !profile) return;
		const t = setTimeout(() => {
			void (async () => {
				const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
				if (!token || !profileRef.current) return;
				const p = profileRef.current;
				try {
					const payload = buildProfileSettingsPayload(p);
					const payloadKey = JSON.stringify(payload);
					if (payloadKey === lastPostedProfilePayloadRef.current) return;
					await postUserProfile(token, payload);
					lastPostedProfilePayloadRef.current = payloadKey;
					lastLocalProfilePreferenceTouchRef.current = 0;
					await hydrateFromServer();
				} catch (e) {
					console.warn("Profile POST sync failed:", e);
				}
			})();
		}, 500);
		return () => clearTimeout(t);
	}, [authLoading, user, profile, hydrateFromServer]);

	const pushTimelineToServer = useCallback(
		async (nextTimeline: TimelineEvent[]) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token || !user || !profileRef.current) return;
			const pruned = prunePastTimelineEvents(nextTimeline);
			setTimelineEvents(pruned);
			timelineSyncRef.current.queued = pruned;
			if (timelineSyncRef.current.inFlight) return;

			timelineSyncRef.current.inFlight = true;
			let timelinePushOk = false;
			try {
				while (timelineSyncRef.current.queued) {
					const candidate = timelineSyncRef.current.queued;
					timelineSyncRef.current.queued = null;
					const prev = [...timelineServerRef.current];
					const prevMap = new Map(
						prev.map((e) => [timelineEventKey(e), e]),
					);
					const nextMap = new Map(
						candidate.map((e) => [timelineEventKey(e), e]),
					);
					const prevIndexMap = new Map(
						prev.map((e, idx) => [timelineEventKey(e), idx]),
					);

					const removedWithIdx: { idx: number }[] = [];
					for (const [k] of prevMap) {
						if (!nextMap.has(k)) {
							const idx = prevIndexMap.get(k);
							if (typeof idx === "number") removedWithIdx.push({ idx });
						}
					}
					removedWithIdx.sort((a, b) => b.idx - a.idx);
					const simulated = [...prev];
					for (const { idx } of removedWithIdx) {
						await postUserEventRemove(token, idx);
						simulated.splice(idx, 1);
					}

					const simIndexMap = new Map(
						simulated.map((e, i) => [timelineEventKey(e), i]),
					);

					for (const [k, nextEv] of nextMap) {
						const oldEv = prevMap.get(k);
						if (!oldEv || !simIndexMap.has(k)) continue;
						if (!timelineEventDataEqual(oldEv, nextEv)) {
							const idx = simIndexMap.get(k);
							if (typeof idx === "number") {
								await postUserEventUpdate(
									token,
									idx,
									timelineEventToServerEventPayload(nextEv),
								);
							}
						}
					}

					for (const [k, nextEv] of nextMap) {
						if (!prevMap.has(k)) {
							await postUserEventAdd(
								token,
								timelineEventToServerEventPayload(nextEv),
							);
						}
					}

					timelineServerRef.current = candidate;
				}
				timelinePushOk = true;
			} catch (e) {
				console.warn("Timeline POST failed:", e);
			} finally {
				timelineSyncRef.current.inFlight = false;
			}
			if (timelinePushOk) await hydrateFromServer();
		},
		[user, hydrateFromServer],
	);

	const pushFavoritesToServer = useCallback(
		async (rawIds: string[]) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token || !user) return;
			const normalized = rawIds.map(normalizeFavoriteId).filter(Boolean);
			favoriteSyncRef.current.queued = normalized;
			if (favoriteSyncRef.current.inFlight) return;
			favoriteSyncRef.current.inFlight = true;
			try {
				while (favoriteSyncRef.current.queued) {
					const nextIds = favoriteSyncRef.current.queued;
					favoriteSyncRef.current.queued = null;
					const prevSet = new Set(favoriteServerIdsRef.current);
					const nextSet = new Set(nextIds);
					for (const id of prevSet) {
						if (!nextSet.has(id)) await postUserFavoriteRemove(token, id);
					}
					for (const id of nextSet) {
						if (!prevSet.has(id)) await postUserFavoriteAdd(token, id);
					}
					favoriteServerIdsRef.current = nextIds;
				}
			} catch (e) {
				console.warn("Favorite sync failed:", e);
			} finally {
				favoriteSyncRef.current.inFlight = false;
			}
		},
		[user],
	);

	useEffect(() => {
		if (authLoading || !user) return;
		void pushFavoritesToServer(favoritePlacesRef.current.map((p) => p.id));
	}, [authLoading, user, favoritePlaces, pushFavoritesToServer]);

	const addTimelineEvent = useCallback(
		async (newEvent: TimelineEvent) => {
			const normalized: TimelineEvent = {
				...newEvent,
				timestamp: Math.floor(newEvent.timestamp),
			};
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token || !user) {
				setTimelineEvents((prev) =>
					prunePastTimelineEvents(sortTimelineEvents([...prev, normalized])),
				);
				return;
			}
			const merged = sortTimelineEvents([
				...timelineEventsRef.current,
				normalized,
			]);
			await pushTimelineToServer(merged);
		},
		[user, pushTimelineToServer],
	);

	const deleteTimelineEvent = useCallback(
		async (timestamp: number, id: string) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token || !user) {
				setTimelineEvents((prev) =>
					prev.filter((e) => !(e.timestamp === timestamp && e.id === id)),
				);
				return;
			}
			const filtered = timelineEventsRef.current.filter(
				(e) => !(e.timestamp === timestamp && e.id === id),
			);
			await pushTimelineToServer(filtered);
		},
		[user, pushTimelineToServer],
	);

	const getTimelineEventsByDate = useCallback(
		(date: Date) => getEventsByDate(timelineEvents, date),
		[timelineEvents],
	);

	const syncFullRoutePlanToTimeline = useCallback(
		async (routesByDay: Record<string, { events: RouteEvent[] }>) => {
			if (!user || !profileRef.current) return;
			let merged = timelineEventsRef.current;
			const dayKeys = Object.keys(routesByDay).sort();
			for (const dayKey of dayKeys) {
				const parts = dayKey.split("-").map(Number);
				const y = parts[0];
				const m = parts[1];
				const d = parts[2];
				if (!y || !m || !d) continue;
				const day = new Date(y, m - 1, d);
				const evs = routesByDay[dayKey]?.events ?? [];
				merged = mergeRouteIntoTimeline(merged, evs, day);
			}
			await pushTimelineToServer(merged);
		},
		[user, pushTimelineToServer],
	);

	const updateProfile = useCallback(
		async (updates: Partial<UserProfile>) => {
			lastLocalProfilePreferenceTouchRef.current = Date.now();
			setProfile((prev) => {
				const base: UserProfile = prev || {
					id: `profile_${Date.now()}`,
					name: "",
					email: "",
					defaultStartPoint: {
						type: "current",
						address: "",
						label: "Текущая позиция",
					} as StartPoint,
					defaultTransportMode: "walking",
					vegetarian: false,
					wheelchairAccessible: false,
					averageWalkingTime: 15,
					savedLocations: [],
					accessibilitySettings: {
						needsRamp: false,
						needsElevator: false,
					},
				};

				const next = { ...base, ...updates };
				profileRef.current = next;
				void persist(next);
				return next;
			});
		},
		[persist],
	);

	const addSavedLocation = useCallback(
		async (location: Omit<SavedLocation, "id">) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (token && user) {
				try {
					await postUserLocationsAdd(token, [
						{
							name: location.name,
							lat: location.coords.lat,
							long: location.coords.lng,
							...(location.description?.trim()
								? { description: location.description.trim() }
								: {}),
						},
					]);
					await hydrateFromServer();
					return;
				} catch (e) {
					console.warn("addSavedLocation failed:", e);
				}
			}
			setProfile((prev) => {
				if (!prev) return prev;
				const next: UserProfile = {
					...prev,
					savedLocations: [
						...prev.savedLocations,
						{
							...location,
							id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
						},
					],
				};
				persist(next);
				return next;
			});
		},
		[persist, user, hydrateFromServer],
	);

	const removeSavedLocation = useCallback(
		async (id: string) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (token && user) {
				let serverIndex = profileRef.current?.savedLocations.find(
					(l) => l.id === id,
				)?.serverIndex;
				if (typeof serverIndex !== "number") {
					await hydrateFromServer();
					serverIndex = profileRef.current?.savedLocations.find(
						(l) => l.id === id,
					)?.serverIndex;
				}
				if (typeof serverIndex === "number") {
					try {
						await postUserLocationRemove(token, serverIndex);
						await hydrateFromServer();
						return;
					} catch (e) {
						console.warn("removeSavedLocation failed:", e);
					}
				}
			}
			setProfile((prev) => {
				if (!prev) return prev;
				const next: UserProfile = {
					...prev,
					savedLocations: prev.savedLocations.filter((l) => l.id !== id),
				};
				persist(next);
				return next;
			});
		},
		[persist, user, hydrateFromServer],
	);

	const updateSavedLocation = useCallback(
		async (
			id: string,
			updates: Partial<
				Pick<SavedLocation, "name" | "coords" | "description" | "type" | "icon">
			>,
		) => {
			const current = profileRef.current?.savedLocations.find(
				(l) => l.id === id,
			);
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (token && user && current && typeof current.serverIndex === "number") {
				const mergedServer = { ...current, ...updates };
				try {
					await postUserLocationUpdate(token, current.serverIndex, {
						name: mergedServer.name,
						lat: mergedServer.coords.lat,
						long: mergedServer.coords.lng,
						...(mergedServer.description?.trim()
							? { description: mergedServer.description.trim() }
							: {}),
					});
					await hydrateFromServer();
				} catch (e) {
					console.warn("updateSavedLocation failed:", e);
				}
			}
			setProfile((prev) => {
				if (!prev) return prev;
				const current = prev.savedLocations.find((l) => l.id === id);
				if (!current) return prev;
				const merged: SavedLocation = { ...current, ...updates };
				const next: UserProfile = {
					...prev,
					savedLocations: prev.savedLocations.map((l) =>
						l.id === id ? merged : l,
					),
				};
				profileRef.current = next;
				persist(next);
				return next;
			});
		},
		[persist, user, hydrateFromServer],
	);

	const updateAccessibilitySettings = useCallback(
		async (updates: Partial<AccessibilitySettings>) => {
			lastLocalProfilePreferenceTouchRef.current = Date.now();
			setProfile((prev) => {
				if (!prev) return prev;
				const next: UserProfile = {
					...prev,
					accessibilitySettings: {
						...prev.accessibilitySettings,
						...updates,
					},
				};
				profileRef.current = next;
				void persist(next);
				return next;
			});
		},
		[persist],
	);

	const value: UserContextType = useMemo(
		() => ({
			profile,
			isLoading,
			timelineEvents,
			updateProfile,
			addSavedLocation,
			removeSavedLocation,
			updateSavedLocation,
			updateAccessibilitySettings,
			addTimelineEvent,
			deleteTimelineEvent,
			getTimelineEventsByDate,
			syncFullRoutePlanToTimeline,
		}),
		[
			profile,
			isLoading,
			timelineEvents,
			updateProfile,
			addSavedLocation,
			removeSavedLocation,
			updateSavedLocation,
			updateAccessibilitySettings,
			addTimelineEvent,
			deleteTimelineEvent,
			getTimelineEventsByDate,
			syncFullRoutePlanToTimeline,
		],
	);

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
	const ctx = useContext(UserContext);
	if (!ctx) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return ctx;
};
