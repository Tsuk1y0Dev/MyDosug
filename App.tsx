import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/services/auth/AuthContext';
import { ScheduleProvider } from './src/services/schedule/ScheduleContext';
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
      <ScheduleProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </AuthProvider>
      </ScheduleProvider>
    </GestureHandlerRootView>
  );
}