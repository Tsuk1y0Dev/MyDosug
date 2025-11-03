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
import { Feather } from '@expo/vector-icons';

const HOUR_HEIGHT = 80;

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('Четверг, 12 дек');
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);

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
    },
    {
      id: '3',
      title: 'Прогулка в парке',
      startTime: '17:00',
      endTime: '18:30',
      location: 'Центральный парк',
      type: 'activity'
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
    const busySlots = schedule
      .map(activity => ({
        start: timeToPosition(activity.startTime),
        end: timeToPosition(activity.endTime)
      }))
      .sort((a, b) => a.start - b.start);

    const slots: FreeSlot[] = [];
    let lastEnd = timeToPosition('06:00');

    busySlots.forEach(slot => {
      if (slot.start > lastEnd) {
        const durationPixels = slot.start - lastEnd;
        const durationMinutes = (durationPixels / HOUR_HEIGHT) * 60;
        
        if (durationMinutes >= 30) {
          slots.push({
            startTime: lastEnd,
            endTime: slot.start,
            duration: durationPixels,
            startTimeString: positionToTime(lastEnd),
            endTimeString: positionToTime(slot.start),
          });
        }
      }
      lastEnd = Math.max(lastEnd, slot.end);
    });

    const dayEnd = timeToPosition('22:00');
    if (lastEnd < dayEnd) {
      const durationPixels = dayEnd - lastEnd;
      const durationMinutes = (durationPixels / HOUR_HEIGHT) * 60;
      
      if (durationMinutes >= 30) {
        slots.push({
          startTime: lastEnd,
          endTime: dayEnd,
          duration: durationPixels,
          startTimeString: positionToTime(lastEnd),
          endTimeString: '22:00',
        });
      }
    }

    return slots;
  }, [schedule]);

  const handleActivityPress = (activity: Activity) => {
    Alert.alert(
      activity.title,
      `${activity.startTime} - ${activity.endTime}\n${activity.location || ''}`,
      [
        { text: 'Закрыть', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => handleDeleteActivity(activity.id)
        }
      ]
    );
  };

  const handleDragStart = (activityId: string) => {
    setDraggingActivityId(activityId);
  };

  const handleDragEnd = (activityId: string, newStartTime: string, newEndTime: string) => {
    setSchedule(prev => prev.map(activity => 
      activity.id === activityId 
        ? { ...activity, startTime: newStartTime, endTime: newEndTime }
        : activity
    ));
    setDraggingActivityId(null);
  };

  const handleActivitySwap = (draggedId: string, targetId: string) => {
    setSchedule(prev => {
      const draggedIndex = prev.findIndex(a => a.id === draggedId);
      const targetIndex = prev.findIndex(a => a.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newSchedule = [...prev];
      
      // Сохраняем временные интервалы
      const draggedTime = {
        startTime: newSchedule[draggedIndex].startTime,
        endTime: newSchedule[draggedIndex].endTime
      };
      
      const targetTime = {
        startTime: newSchedule[targetIndex].startTime,
        endTime: newSchedule[targetIndex].endTime
      };
      
      // Меняем временные интервалы местами
      newSchedule[draggedIndex] = {
        ...newSchedule[draggedIndex],
        startTime: targetTime.startTime,
        endTime: targetTime.endTime
      };
      
      newSchedule[targetIndex] = {
        ...newSchedule[targetIndex],
        startTime: draggedTime.startTime,
        endTime: draggedTime.endTime
      };
      
      return newSchedule;
    });
    setDraggingActivityId(null);
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

  const handleDeleteActivity = (activityId: string) => {
    setSchedule(prev => prev.filter(activity => activity.id !== activityId));
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
            {/* Индикатор перетаскивания */}
            {draggingActivityId && (
              <View style={styles.dragOverlay}>
                <Text style={styles.dragOverlayText}>Перетащите для обмена с другим блоком</Text>
              </View>
            )}
            
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
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onSwap={handleActivitySwap}
                timeToPosition={timeToPosition}
                positionToTime={positionToTime}
                hourHeight={HOUR_HEIGHT}
                isDragging={draggingActivityId === activity.id}
                allActivities={schedule}
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
  dragOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  dragOverlayText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 12,
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
      width: 0.0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});