import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';

export const RegisterScreen = () => {
  const { register } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Screen</Text>
      <Button 
        title="Register" 
        onPress={() => register('test@test.com', 'password', 'Test User')} 
      />
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