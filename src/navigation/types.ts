export type RootStackParamList = {
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: { allowFullSearch?: boolean } | undefined;
  Planner: undefined;
  Routes: undefined;
  Profile: undefined;
};