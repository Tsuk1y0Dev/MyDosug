import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';
import { Activity, FreeSlot } from '../../types/schedule';
import { ActivityBlock } from '../../components/ActivityBlock';
import { AddSlotButton } from '../../components/AddSlotButton';
import { Timeline } from '../../components/Timeline';
import { Feather, MaterialIcons } from '@expo/vector-icons';

const HOUR_HEIGHT = 80;

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('Четверг, 12 дек');

  const [schedule, setSchedule] = useState<Activity[]>([
    {
      id: '1',
      title: 'Завтрак в столовой "X"',
      startTime: '08:00',
      endTime: '09:00',
      location: 'Столовая X',
      type: 'meal'
    },
    {
      id: '2',
      title: '{кастомный модуль}',
      startTime: '10:30',
      endTime: '12:00',
      type: 'custom'
    }
  ]);

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const timeToPosition = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours - 6) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  };

  const positionToTime = (position: number): string => {
    const totalMinutes = (position / HOUR_HEIGHT) * 60;
    const hours = Math.floor(totalMinutes / 60) + 6;
    const minutes = Math.round(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const freeSlots = useMemo((): FreeSlot[] => {
    // Упрощенная версия для тестирования
    return [
      {
        startTime: timeToPosition('09:00'),
        endTime: timeToPosition('10:30'),
        duration: timeToPosition('10:30') - timeToPosition('09:00'),
        startTimeString: '09:00',
        endTimeString: '10:30'
      }
    ];
  }, []);

  const handleActivityPress = (activity: Activity) => {
    Alert.alert(
      activity.title,
      `${activity.startTime} - ${activity.endTime}\n${activity.location || ''}`,
      [{ text: 'Закрыть', style: 'cancel' }]
    );
  };

  const handleActivityDrag = (activityId: string, newStartTime: string, newEndTime: string) => {
    console.log('Drag activity:', activityId, newStartTime, newEndTime);
    setSchedule(prev => prev.map(activity => 
      activity.id === activityId 
        ? { ...activity, startTime: newStartTime, endTime: newEndTime }
        : activity
    ));
  };

  const handleAddActivity = (slot?: FreeSlot) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      title: 'Новая активность',
      startTime: slot?.startTimeString || '12:00',
      endTime: slot?.endTimeString || '13:00',
      type: 'activity'
    };
    
    setSchedule(prev => [...prev, newActivity]);
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={24} color="#3b82f6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Расписание</Text>
            <Text style={styles.subtitle}>{selectedDate}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userGreeting}>Добро пожаловать!</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.timelineContainer}>
        <Timeline timeSlots={timeSlots} hourHeight={HOUR_HEIGHT} />
        
        <ScrollView style={styles.activitiesColumn}>
          <View style={[styles.activitiesContent, { height: 16 * HOUR_HEIGHT }]}>
            {freeSlots.map((slot, index) => (
              <AddSlotButton
                key={index}
                slot={slot}
                onPress={handleAddActivity}
              />
            ))}
            
            {schedule.map((activity) => (
              <ActivityBlock
                key={activity.id}
                activity={activity}
                onPress={handleActivityPress}
                timeToPosition={timeToPosition}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => handleAddActivity()}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
  },
  userInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userGreeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  timelineContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  activitiesColumn: {
    flex: 1,
    backgroundColor: 'white',
  },
  activitiesContent: {
    position: 'relative',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});