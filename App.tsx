import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/services/auth/AuthContext';
import { UserProvider } from './src/context/UserContext';
import { RouteProvider } from './src/services/planner/RouteContext';
import { ScheduleProvider } from './src/services/schedule/ScheduleContext';
import { FavoritesProvider } from './src/services/favorites/FavoritesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoadingScreen } from './src/screens/common/LoadingScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <FavoritesProvider>
          <RouteProvider>
            <ScheduleProvider>
              <UserProvider>
                <NavigationContainer>
                  <AppContent />
                </NavigationContainer>
              </UserProvider>
            </ScheduleProvider>
          </RouteProvider>
        </FavoritesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}