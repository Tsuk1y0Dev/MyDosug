import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { Place } from '../../types/planner';
import { RoutePlan } from '../../types/planner';

interface FavoritesContextType {
  favoritePlaces: Place[];
  /** Места, созданные пользователем (кастомные активности), отдельно от избранного OSM */
  userCreatedPlaces: Place[];
  savedRoutes: RoutePlan[];
  addFavoritePlace: (place: Place) => void;
  removeFavoritePlace: (placeId: string) => void;
  addUserCreatedPlace: (place: Place) => void;
  removeUserCreatedPlace: (placeId: string) => void;
  isFavorite: (placeId: string) => boolean;
  addSavedRoute: (route: RoutePlan) => void;
  removeSavedRoute: (routeId: string) => void;
  /** Полная замена избранного (например после GET /user/profile). */
  replaceFavoritePlaces: (places: Place[]) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

type FavoritesProviderProps = {
  children: ReactNode;
};

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([]);
  const [userCreatedPlaces, setUserCreatedPlaces] = useState<Place[]>([]);
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

  const addUserCreatedPlace = (place: Place) => {
    setUserCreatedPlaces(prev => {
      if (prev.find(p => p.id === place.id)) {
        return prev;
      }
      return [...prev, place];
    });
  };

  const removeUserCreatedPlace = (placeId: string) => {
    setUserCreatedPlaces(prev => prev.filter(p => p.id !== placeId));
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

  const replaceFavoritePlaces = useCallback((places: Place[]) => {
    setFavoritePlaces(places);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favoritePlaces,
        userCreatedPlaces,
        savedRoutes,
        addFavoritePlace,
        removeFavoritePlace,
        addUserCreatedPlace,
        removeUserCreatedPlace,
        isFavorite,
        addSavedRoute,
        removeSavedRoute,
        replaceFavoritePlaces,
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

