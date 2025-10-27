// src/components/Timeline/Timeline.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ActivityCard, Activity } from '../ActivityCard/ActivityCard';
import { TouchableOpacity } from 'react-native';

interface TimelineProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
  onActivityLongPress?: (activity: Activity) => void;
  onTimeSlotPress?: (time: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  activities,
  onActivityPress,
  onActivityLongPress,
  onTimeSlotPress,
}) => {
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Функция для группировки активностей по часам
  const getActivitiesForHour = (hour: string) => {
    return activities.filter(activity => {
      const activityHour = activity.startTime.split(':')[0];
      return activityHour === hour.split(':')[0];
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timeline}>
        <View style={styles.timeLabels}>
          {timeSlots.map((time, index) => (
            <View key={time} style={styles.timeSlot}>
              <Text style={styles.timeText}>{time}</Text>
              {index < timeSlots.length - 1 && (
                <TouchableOpacity 
                  style={styles.timeLineGap}
                  onPress={() => onTimeSlotPress?.(time)}
                >
                  <View style={styles.timeLine} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.activitiesColumn}>
          {timeSlots.map((time) => (
            <View key={time} style={styles.hourSlot}>
              {getActivitiesForHour(time).map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onPress={onActivityPress}
                  onLongPress={onActivityLongPress}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
  },
  timeLabels: {
    width: 80,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  timeSlot: {
    height: 120, // Увеличиваем высоту для размещения активностей
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  timeLineGap: {
    flex: 1,
  },
  timeLine: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    marginLeft: 4,
  },
  activitiesColumn: {
    flex: 1,
    backgroundColor: 'white',
  },
  hourSlot: {
    minHeight: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});