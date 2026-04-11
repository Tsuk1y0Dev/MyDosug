import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StartPoint } from '../types/planner';
import type { TimelineEvent } from '../types/timeline';
import type {
  SavedLocation,
  UserProfile,
  AccessibilitySettings,
} from '../types/userProfile';
import { useAuth } from '../services/auth/AuthContext';
import { useFavorites } from '../services/favorites/FavoritesContext';
import {
  fetchUserProfile,
  postUserProfile,
  postUserLocationsAdd,
  postUserLocationRemove,
  postUserLocationUpdate,
} from '../services/api/userProfileApi';
import {
  mapServerProfileToUserProfile,
  placeStubFromOsmId,
  buildProfilePostPayload,
} from '../services/api/mapServerProfile';
import {
  getEventsByDate,
  parseTimelineEventsField,
  prunePastTimelineEvents,
  sortTimelineEvents,
} from '../services/timeline/timelineStorage';
import type { RouteEvent } from '../types/route';
import { mergeRouteIntoTimeline } from '../utils/routeToTimeline';

export type {
  SavedLocationType,
  SavedLocation,
  UserProfile,
  AccessibilitySettings,
} from '../types/userProfile';
export type { TimelineEvent } from '../types/timeline';

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  /** События таймлайна (сегодня и будущее; источник — GET /user/profile). */
  timelineEvents: TimelineEvent[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addSavedLocation: (location: Omit<SavedLocation, 'id'>) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  updateSavedLocation: (
    id: string,
    updates: Partial<
      Pick<SavedLocation, 'name' | 'coords' | 'description' | 'type' | 'icon'>
    >,
  ) => Promise<void>;
  updateAccessibilitySettings: (
    updates: Partial<AccessibilitySettings>,
  ) => Promise<void>;
  /** GET профиль → merge → POST (двойная строкификация timeline_events на сервере). */
  addTimelineEvent: (newEvent: TimelineEvent) => Promise<void>;
  deleteTimelineEvent: (timestamp: number, id: string) => Promise<void>;
  getTimelineEventsByDate: (date: Date) => TimelineEvent[];
  /** Объединить маршрут выбранного дня с timeline_events и отправить на сервер. */
  syncRouteDayToTimeline: (
    routeEvents: RouteEvent[],
    day: Date,
  ) => Promise<void>;
}

const STORAGE_KEY = '@mydosug_user_profile';
const STORAGE_TOKEN_KEY = '@mydosug_token';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading, updateLocalUser } = useAuth();
  const { favoritePlaces, replaceFavoritePlaces } = useFavorites();

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

  const prevHadUserRef = useRef(false);

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
      console.error('Error loading profile', e);
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
      console.error('Error saving profile', e);
    }
  }, []);

  const hydrateFromServer = useCallback(async () => {
    const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token || !user) return;
    setRemoteBusy(true);
    try {
      const raw = await fetchUserProfile(token);
      const { profile: remoteProfile, favoriteIds, timelineEvents: serverTl } =
        mapServerProfileToUserProfile(raw, user.email, user.id);
      setProfile(remoteProfile);
      await persist(remoteProfile);
      /* Расписание с сервера полностью заменяет локальное после входа */
      setTimelineEvents(serverTl);
      replaceFavoritePlaces(favoriteIds.map(placeStubFromOsmId));
      const n = remoteProfile.name?.trim();
      if (n) {
        updateLocalUser({ name: n });
      }
    } catch (e) {
      console.warn('User profile fetch failed:', e);
    } finally {
      setRemoteBusy(false);
    }
  }, [user, persist, replaceFavoritePlaces, updateLocalUser]);

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
      })();
    }
  }, [user, authLoading, hydrateFromServer, replaceFavoritePlaces]);

  useEffect(() => {
    if (authLoading || remoteBusy || !user || !profile) return;
    const t = setTimeout(() => {
      void (async () => {
        const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        if (!token || !profileRef.current) return;
        const p = profileRef.current;
        try {
          const favIds = favoritePlacesRef.current.map(pl => pl.id);
          await postUserProfile(
            token,
            buildProfilePostPayload(
              p,
              favIds,
              prunePastTimelineEvents(timelineEventsRef.current),
            ),
          );
        } catch (e) {
          console.warn('Profile POST sync failed:', e);
        }
      })();
    }, 500);
    return () => clearTimeout(t);
  }, [authLoading, remoteBusy, user, profile, favoritePlaces, timelineEvents]);

  const pushTimelineToServer = useCallback(
    async (nextTimeline: TimelineEvent[]) => {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (!token || !user || !profileRef.current) return;
      const pruned = prunePastTimelineEvents(nextTimeline);
      try {
        await postUserProfile(
          token,
          buildProfilePostPayload(
            profileRef.current,
            favoritePlacesRef.current.map(pl => pl.id),
            pruned,
          ),
        );
        setTimelineEvents(pruned);
      } catch (e) {
        console.warn('Timeline POST failed:', e);
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
        setTimelineEvents(prev =>
          prunePastTimelineEvents(
            sortTimelineEvents([...prev, normalized]),
          ),
        );
        return;
      }
      try {
        const raw = await fetchUserProfile(token);
        const root = raw?.data ?? raw;
        const existing = parseTimelineEventsField(root?.timeline_events);
        const merged = sortTimelineEvents([...existing, normalized]);
        await pushTimelineToServer(merged);
      } catch (e) {
        console.warn('addTimelineEvent failed:', e);
      }
    },
    [user, pushTimelineToServer],
  );

  const deleteTimelineEvent = useCallback(
    async (timestamp: number, id: string) => {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (!token || !user) {
        setTimelineEvents(prev =>
          prev.filter(e => !(e.timestamp === timestamp && e.id === id)),
        );
        return;
      }
      try {
        const raw = await fetchUserProfile(token);
        const root = raw?.data ?? raw;
        const existing = parseTimelineEventsField(root?.timeline_events);
        const filtered = existing.filter(
          e => !(e.timestamp === timestamp && e.id === id),
        );
        await pushTimelineToServer(filtered);
      } catch (e) {
        console.warn('deleteTimelineEvent failed:', e);
      }
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
      setProfile(prev => {
        const base: UserProfile =
          prev || {
            id: `profile_${Date.now()}`,
            name: '',
            email: '',
            defaultStartPoint: {
              type: 'current',
              address: '',
              label: 'Текущая позиция',
            } as StartPoint,
            defaultTransportMode: 'walking',
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
    async (location: Omit<SavedLocation, 'id'>) => {
      const token =
        user && (await AsyncStorage.getItem(STORAGE_TOKEN_KEY));
      if (token && user) {
        try {
          const row: {
            name: string;
            lat: number;
            long: number;
            description?: string;
          } = {
            name: location.name,
            lat: location.coords.lat,
            long: location.coords.lng,
          };
          if (location.description?.trim()) {
            row.description = location.description.trim();
          }
          await postUserLocationsAdd(token, [row]);
          await hydrateFromServer();
        } catch (e) {
          console.warn('addSavedLocation API failed:', e);
        }
        return;
      }
      setProfile(prev => {
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
    [user, hydrateFromServer, persist],
  );

  const removeSavedLocation = useCallback(
    async (id: string) => {
      const snap = profileRef.current;
      if (!snap) return;
      const idx = snap.savedLocations.findIndex(l => l.id === id);
      if (idx < 0) return;

      const token =
        user && (await AsyncStorage.getItem(STORAGE_TOKEN_KEY));
      if (token && user) {
        try {
          await postUserLocationRemove(token, idx);
          await hydrateFromServer();
        } catch (e) {
          console.warn('removeSavedLocation API failed:', e);
        }
        return;
      }

      setProfile(prev => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          savedLocations: prev.savedLocations.filter(l => l.id !== id),
        };
        persist(next);
        return next;
      });
    },
    [user, hydrateFromServer, persist],
  );

  const updateSavedLocation = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<SavedLocation, 'name' | 'coords' | 'description' | 'type' | 'icon'>
      >,
    ) => {
      const snap = profileRef.current;
      if (!snap) return;
      const idx = snap.savedLocations.findIndex(l => l.id === id);
      if (idx < 0) return;
      const cur = snap.savedLocations[idx];
      const merged: SavedLocation = { ...cur, ...updates };

      const token =
        user && (await AsyncStorage.getItem(STORAGE_TOKEN_KEY));
      if (token && user) {
        try {
          const payload: {
            name: string;
            lat: number;
            long: number;
            description?: string;
          } = {
            name: merged.name,
            lat: merged.coords.lat,
            long: merged.coords.lng,
          };
          const d = merged.description?.trim();
          if (d) payload.description = d;
          await postUserLocationUpdate(token, idx, payload);
          await hydrateFromServer();
        } catch (e) {
          console.warn('updateSavedLocation API failed:', e);
        }
        return;
      }

      setProfile(prev => {
        if (!prev) return prev;
        const next: UserProfile = {
          ...prev,
          savedLocations: prev.savedLocations.map(l =>
            l.id === id ? merged : l,
          ),
        };
        persist(next);
        return next;
      });
    },
    [user, hydrateFromServer, persist],
  );

  const updateAccessibilitySettings = useCallback(
    async (updates: Partial<AccessibilitySettings>) => {
      setProfile(prev => {
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
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
};
