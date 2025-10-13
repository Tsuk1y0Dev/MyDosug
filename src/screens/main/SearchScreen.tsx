import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SearchScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Screen</Text>
      <Text>Search for activities will be here</Text>
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