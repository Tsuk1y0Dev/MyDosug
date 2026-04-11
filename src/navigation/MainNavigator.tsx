import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/main/HomeScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { RoutesScreen } from '../screens/main/RoutesScreen';
import { ProfileGateScreen } from '../screens/main/ProfileGateScreen';
import { MainTabParamList } from './types';
import { Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Feather.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Routes':
              iconName = 'map';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'circle';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Главная',
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          title: 'Поиск',
        }}
      />
      <Tab.Screen 
        name="Routes" 
        component={RoutesScreen}
        options={{
          title: 'Маршруты',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileGateScreen}
        options={{
          title: 'Профиль',
        }}
      />
    </Tab.Navigator>
  );
};