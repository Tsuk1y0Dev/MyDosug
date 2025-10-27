// src/components/ActivityCard/ActivityCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'meal' | 'custom' | 'activity' | 'travel';
  description?: string;
  budget?: number;
  mood?: string;
  participants?: string;
}

interface ActivityCardProps {
  activity: Activity;
  onPress?: (activity: Activity) => void;
  onLongPress?: (activity: Activity) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ 
  activity, 
  onPress, 
  onLongPress 
}) => {
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'meal':
        return styles.mealActivity;
      case 'custom':
        return styles.customActivity;
      case 'travel':
        return styles.travelActivity;
      default:
        return styles.generalActivity;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meal': return '🍽';
      case 'custom': return '⚙️';
      case 'travel': return '🚗';
      default: return '⭐';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.activityCard, getActivityStyle(activity.type)]}
      onPress={() => onPress?.(activity)}
      onLongPress={() => onLongPress?.(activity)}
      delayLongPress={500}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.typeIcon}>{getTypeIcon(activity.type)}</Text>
        <Text style={styles.activityTitle}>{activity.title}</Text>
      </View>
      <Text style={styles.activityTime}>
        {activity.startTime} - {activity.endTime}
      </Text>
      {activity.location && (
        <Text style={styles.activityLocation}>📍 {activity.location}</Text>
      )}
      {activity.description && (
        <Text style={styles.activityDescription}>{activity.description}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 6,
  },
  mealActivity: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4caf50',
  },
  customActivity: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#ff9800',
  },
  generalActivity: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196f3',
  },
  travelActivity: {
    backgroundColor: '#f3e5f5',
    borderLeftColor: '#9c27b0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  activityLocation: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});