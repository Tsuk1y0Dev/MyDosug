import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const RoutesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routes Screen</Text>
      <Text>Your saved routes will appear here</Text>
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