import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StartPoint } from '../types/planner';

export type SavedLocationType = 'home' | 'office' | 'hotel' | 'other';

export interface SavedLocation {
  id: string;
  type: SavedLocationType;
  name: string;
  icon: string;
  coords: {
    lat: number;
    lng: number;
  };
}

export interface AccessibilitySettings {
  needsRamp: boolean;
  needsElevator: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  defaultStartPoint: StartPoint;
  defaultTransportMode: 'walking' | 'car' | 'public';
  notificationsEnabled: boolean;
  vegetarian: boolean;
  wheelchairAccessible: boolean;
  averageWalkingTime: number;
  savedLocations: SavedLocation[];
  accessibilitySettings: AccessibilitySettings;
}

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addSavedLocation: (location: Omit<SavedLocation, 'id'>) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  updateAccessibilitySettings: (updates: Partial<AccessibilitySettings>) => Promise<void>;
}

const STORAGE_KEY = '@mydosug_user_profile';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    [persist]
  );

  const addSavedLocation = useCallback(
    async (location: Omit<SavedLocation, 'id'>) => {
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
    [persist]
  );

  const removeSavedLocation = useCallback(
    async (id: string) => {
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
    [persist]
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
    [persist]
  );

  const value: UserContextType = {
    profile,
    isLoading,
    updateProfile,
    addSavedLocation,
    removeSavedLocation,
    updateAccessibilitySettings,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
};

