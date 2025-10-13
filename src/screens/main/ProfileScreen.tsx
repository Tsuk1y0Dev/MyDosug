import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Screen</Text>
      <Text>User: {user?.name}</Text>
      <Text>Email: {user?.email}</Text>
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