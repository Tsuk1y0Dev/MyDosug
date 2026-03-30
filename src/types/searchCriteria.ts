export type GoalType = 'work' | 'relax' | 'fun' | 'romantic' | 'active' | 'educational';

export interface SearchCriteriaFilters {
  wheelchairAccessible?: boolean;
  elevatorOrRamp?: boolean;
  stepFreeEntrance?: boolean;
  accessibleToilet?: boolean;
  parkingNearby?: boolean;
  publicTransportNearby?: boolean;
  outdoor?: boolean;
  childFriendly?: boolean;
  wifi?: boolean;
  vegetarian?: boolean;
}

export interface SearchCriteria {
  startCoords: { lat: number; lng: number };
  categoryIds?: string[];
  subCategoryIds?: string[];
  budgetMin: number;
  budgetMax: number;
  goal?: GoalType;
  filters: SearchCriteriaFilters;
}
