import { CatalogPlace } from './types';
import { foodPlaces } from './food';
import { entertainmentPlaces } from './entertainment';
import { servicesPlaces } from './services';
import { healthSportPlaces } from './health_sport';
import { transportShoppingPlaces } from './transport_shopping';

export const allPlaces: CatalogPlace[] = [
  ...foodPlaces,
  ...entertainmentPlaces,
  ...servicesPlaces,
  ...healthSportPlaces,
  ...transportShoppingPlaces,
];

export {
  foodPlaces,
  entertainmentPlaces,
  servicesPlaces,
  healthSportPlaces,
  transportShoppingPlaces,
};

export * from './types';

