import React, {
	createContext,
	useState,
	useContext,
	ReactNode,
	useCallback,
	useMemo,
} from "react";
import { Place } from "../../types/planner";
import { RoutePlan } from "../../types/planner";

interface FavoritesContextType {
	favoritePlaces: Place[];
	userCreatedPlaces: Place[];
	savedRoutes: RoutePlan[];
	addFavoritePlace: (place: Place) => void;
	removeFavoritePlace: (placeId: string) => void;
	addUserCreatedPlace: (place: Place) => void;
	removeUserCreatedPlace: (placeId: string) => void;
	isFavorite: (placeId: string) => boolean;
	addSavedRoute: (route: RoutePlan) => void;
	removeSavedRoute: (routeId: string) => void;
	replaceFavoritePlaces: (places: Place[]) => void;
	replaceUserCreatedPlaces: (places: Place[]) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
	undefined,
);

type FavoritesProviderProps = {
	children: ReactNode;
};

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
	const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([]);
	const [userCreatedPlaces, setUserCreatedPlaces] = useState<Place[]>([]);
	const [savedRoutes, setSavedRoutes] = useState<RoutePlan[]>([]);

	const normalizePlaceId = useCallback((raw: string) => {
		const id = String(raw || "").trim();
		if (!id) return "";
		if (id.startsWith("osm_")) return id.slice(4);
		return id;
	}, []);

	const favoriteIdSet = useMemo(
		() => new Set(favoritePlaces.map((p) => normalizePlaceId(p.id))),
		[favoritePlaces, normalizePlaceId],
	);

	const addFavoritePlace = useCallback(
		(place: Place) => {
			setFavoritePlaces((prev) => {
				const norm = normalizePlaceId(place.id);
				if (!norm) return prev;
				if (prev.some((p) => normalizePlaceId(p.id) === norm)) {
					return prev;
				}
				return [...prev, place];
			});
		},
		[normalizePlaceId],
	);

	const removeFavoritePlace = useCallback(
		(placeId: string) => {
			const norm = normalizePlaceId(placeId);
			setFavoritePlaces((prev) =>
				prev.filter((p) => normalizePlaceId(p.id) !== norm),
			);
		},
		[normalizePlaceId],
	);

	const addUserCreatedPlace = useCallback(
		(place: Place) => {
			setUserCreatedPlaces((prev) => {
				const norm = normalizePlaceId(place.id);
				if (prev.some((p) => normalizePlaceId(p.id) === norm)) {
					return prev;
				}
				return [...prev, place];
			});
		},
		[normalizePlaceId],
	);

	const removeUserCreatedPlace = useCallback(
		(placeId: string) => {
			const norm = normalizePlaceId(placeId);
			setUserCreatedPlaces((prev) =>
				prev.filter((p) => normalizePlaceId(p.id) !== norm),
			);
		},
		[normalizePlaceId],
	);

	const isFavorite = useCallback(
		(placeId: string): boolean => {
			return favoriteIdSet.has(normalizePlaceId(placeId));
		},
		[favoriteIdSet, normalizePlaceId],
	);

	const addSavedRoute = (route: RoutePlan) => {
		setSavedRoutes((prev) => {
			if (prev.find((r) => r.id === route.id)) {
				return prev;
			}
			return [...prev, route];
		});
	};

	const removeSavedRoute = (routeId: string) => {
		setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
	};

	const replaceFavoritePlaces = useCallback((places: Place[]) => {
		setFavoritePlaces(places);
	}, []);
	const replaceUserCreatedPlaces = useCallback((places: Place[]) => {
		setUserCreatedPlaces(places);
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
				replaceUserCreatedPlaces,
			}}
		>
			{children}
		</FavoritesContext.Provider>
	);
};

export const useFavorites = () => {
	const context = useContext(FavoritesContext);
	if (context === undefined) {
		throw new Error("useFavorites must be used within a FavoritesProvider");
	}
	return context;
};
