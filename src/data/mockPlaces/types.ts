export interface Accessibility {
  wheelchairAccessible: boolean;
  stepFreeEntrance: boolean;
  elevatorOrRamp: boolean;
  accessibleToilet: boolean;
  tactileGuides: boolean;
  brailleSigns: boolean;
  audioAssistance: boolean;
  parkingNearby: boolean;
  publicTransportNearby: boolean;
}

export interface CatalogPlace {
  id: string;
  categoryId: string;
  subCategoryId: string;
  title: string;
  description: string;
  coords: {
    lat: number;
    lng: number;
  };
  rating: number;
  address: string;
  accessibility: Accessibility;
}

