import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';

export const HomeScreen = () => {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Text>Welcome to MyDosug!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});