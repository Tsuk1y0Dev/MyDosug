import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface TimelineProps {
  timeSlots: string[];
  hourHeight: number;
}

export const Timeline: React.FC<TimelineProps> = ({ timeSlots, hourHeight }) => {
  return (
    <View style={styles.timeLabels}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {timeSlots.map((time, index) => (
          <View 
            key={time} 
            style={[
              styles.timeLabel,
              { height: hourHeight }
            ]}
          >
            <Text style={styles.timeText}>{time}</Text>
            {index < timeSlots.length - 1 && (
              <View style={styles.timeLine} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  timeLabels: {
    width: 80,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  timeLabel: {
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 8,
  },
  timeLine: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    marginLeft: 4,
    marginTop: 4,
  },
});