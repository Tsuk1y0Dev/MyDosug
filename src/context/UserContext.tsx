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
} from "../services/api/userProfileApi";
import {
	mapServerProfileToUserProfile,
	placeStubFromOsmId,
	buildProfilePostPayload,
} from "../services/api/mapServerProfile";
import {
	getEventsByDate,
	prunePastTimelineEvents,
	sortTimelineEvents,
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
	syncRouteDayToTimeline: (
		routeEvents: RouteEvent[],
		day: Date,
	) => Promise<void>;
}

const STORAGE_KEY = "@mydosug_user_profile";
const STORAGE_TOKEN_KEY = "@mydosug_token";

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
	const lastPostedTimelinePayloadRef = useRef<string>("");

	const prevHadUserRef = useRef(false);
	const timelineSyncRef = useRef<{
		inFlight: boolean;
		queued: TimelineEvent[] | null;
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
				profile: remoteProfile,
				favoriteIds,
				timelineEvents: serverTl,
			} = mapServerProfileToUserProfile(raw, user.email, user.id);
			setProfile(remoteProfile);
			await persist(remoteProfile);
			setTimelineEvents(serverTl);
			replaceFavoritePlaces(favoriteIds.map(placeStubFromOsmId));
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
		if (authLoading || remoteBusy || !user || !profile) return;
		const t = setTimeout(() => {
			void (async () => {
				const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
				if (!token || !profileRef.current) return;
				const p = profileRef.current;
				try {
					const favIds = favoritePlacesRef.current.map((pl) => pl.id);
					const payload = buildProfilePostPayload(
						p,
						favIds,
						prunePastTimelineEvents(timelineEventsRef.current),
					);
					const payloadKey = JSON.stringify(payload);
					if (payloadKey === lastPostedProfilePayloadRef.current) return;
					await postUserProfile(token, payload);
					lastPostedProfilePayloadRef.current = payloadKey;
				} catch (e) {
					console.warn("Profile POST sync failed:", e);
				}
			})();
		}, 500);
		return () => clearTimeout(t);
	}, [authLoading, remoteBusy, user, profile, favoritePlaces]);

	const pushTimelineToServer = useCallback(
		async (nextTimeline: TimelineEvent[]) => {
			const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
			if (!token || !user || !profileRef.current) return;
			const pruned = prunePastTimelineEvents(nextTimeline);
			setTimelineEvents(pruned);
			timelineSyncRef.current.queued = pruned;
			if (timelineSyncRef.current.inFlight) return;

			timelineSyncRef.current.inFlight = true;
			try {
				while (timelineSyncRef.current.queued) {
					const candidate = timelineSyncRef.current.queued;
					timelineSyncRef.current.queued = null;
					const payload = buildProfilePostPayload(
						profileRef.current,
						favoritePlacesRef.current.map((pl) => pl.id),
						candidate,
					);
					const payloadKey = JSON.stringify(payload);
					if (payloadKey === lastPostedTimelinePayloadRef.current) {
						continue;
					}
					await postUserProfile(token, payload);
					lastPostedTimelinePayloadRef.current = payloadKey;
				}
			} catch (e) {
				console.warn("Timeline POST failed:", e);
			} finally {
				timelineSyncRef.current.inFlight = false;
			}
		},
		[user],
	);

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

	const syncRouteDayToTimeline = useCallback(
		async (routeEvents: RouteEvent[], day: Date) => {
			if (!user || !profileRef.current) return;
			const merged = mergeRouteIntoTimeline(
				timelineEventsRef.current,
				routeEvents,
				day,
			);
			await pushTimelineToServer(merged);
		},
		[user, pushTimelineToServer],
	);

	const updateProfile = useCallback(
		async (updates: Partial<UserProfile>) => {
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
					notificationsEnabled: true,
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
				persist(next);
				return next;
			});
		},
		[persist],
	);

	const addSavedLocation = useCallback(
		async (location: Omit<SavedLocation, "id">) => {
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
		[persist],
	);

	const removeSavedLocation = useCallback(
		async (id: string) => {
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
		[persist],
	);

	const updateSavedLocation = useCallback(
		async (
			id: string,
			updates: Partial<
				Pick<SavedLocation, "name" | "coords" | "description" | "type" | "icon">
			>,
		) => {
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
				persist(next);
				return next;
			});
		},
		[persist],
	);

	const updateAccessibilitySettings = useCallback(
		async (updates: Partial<AccessibilitySettings>) => {
			setProfile((prev) => {
				if (!prev) return prev;
				const next: UserProfile = {
					...prev,
					accessibilitySettings: {
						...prev.accessibilitySettings,
						...updates,
					},
				};
				persist(next);
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
			syncRouteDayToTimeline,
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
			syncRouteDayToTimeline,
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
