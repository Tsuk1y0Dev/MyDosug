// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/main/HomeScreen';
import { PlannerScreen } from '../screens/main/PlannerScreen';
// ... другие импорты

const Tab = createBottomTabNavigator();
const PlannerStack = createStackNavigator();

const PlannerStackNavigator = () => (
  <PlannerStack.Navigator screenOptions={{ headerShown: false }}>
    <PlannerStack.Screen name="PlannerMain" component={PlannerScreen} />
  </PlannerStack.Navigator>
);

export const MainNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Planner" 
        component={PlannerStackNavigator}
        options={{ tabBarButton: () => null }} // Скрыть из таббара
      />
      {/* ... другие табы */}
    </Tab.Navigator>
  );
};