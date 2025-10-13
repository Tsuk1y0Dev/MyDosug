import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/services/auth/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoadingScreen } from './src/screens/common/LoadingScreen';

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}