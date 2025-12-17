import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Place } from '../../types/planner';
import { RoutePlan } from '../../types/planner';

interface FavoritesContextType {
  favoritePlaces: Place[];
  savedRoutes: RoutePlan[];
  addFavoritePlace: (place: Place) => void;
  removeFavoritePlace: (placeId: string) => void;
  isFavorite: (placeId: string) => boolean;
  addSavedRoute: (route: RoutePlan) => void;
  removeSavedRoute: (routeId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

type FavoritesProviderProps = {
  children: ReactNode;
};

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<RoutePlan[]>([]);

  const addFavoritePlace = (place: Place) => {
    // В гостевом режиме избранное не работает
    // Проверка будет добавлена через useAuth в компонентах
    setFavoritePlaces(prev => {
      if (prev.find(p => p.id === place.id)) {
        return prev;
      }
      return [...prev, place];
    });
  };

  const removeFavoritePlace = (placeId: string) => {
    setFavoritePlaces(prev => prev.filter(p => p.id !== placeId));
  };

  const isFavorite = (placeId: string): boolean => {
    return favoritePlaces.some(p => p.id === placeId);
  };

  const addSavedRoute = (route: RoutePlan) => {
    setSavedRoutes(prev => {
      if (prev.find(r => r.id === route.id)) {
        return prev;
      }
      return [...prev, route];
    });
  };

  const removeSavedRoute = (routeId: string) => {
    setSavedRoutes(prev => prev.filter(r => r.id !== routeId));
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoritePlaces,
        savedRoutes,
        addFavoritePlace,
        removeFavoritePlace,
        isFavorite,
        addSavedRoute,
        removeSavedRoute,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

