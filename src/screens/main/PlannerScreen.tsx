import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PlannerScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planner Screen</Text>
      <Text>Plan your route here</Text>
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