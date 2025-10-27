import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';

// Типы для данных
interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'meal' | 'custom' | 'activity';
}

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('Четверг');

  // Пример данных расписания
  const [schedule, setSchedule] = useState<Activity[]>([
    {
      id: '1',
      title: 'Завтрак в столовой "X"',
      startTime: '08:00',
      endTime: '10:00',
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
    },
    {
      id: '4',
      title: 'Ужин в ресторане "Z"',
      startTime: '19:00',
      endTime: '21:00',
      location: 'Ресторан Z',
      type: 'meal'
    }
  ]);

  // Временные метки для шкалы
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const handleAddActivity = () => {
    // Логика добавления новой активности
    console.log('Добавить активность');
  };

  // Функция для определения позиции активности на шкале
  const getActivityPosition = (activity: Activity) => {
    const startHour = parseInt(activity.startTime.split(':')[0]);
    const startMinute = parseInt(activity.startTime.split(':')[1]);
    const endHour = parseInt(activity.endTime.split(':')[0]);
    const endMinute = parseInt(activity.endTime.split(':')[1]);
    
    const startPosition = (startHour - 6) * 60 + startMinute; // Относительно 6:00
    const duration = (endHour - startHour) * 60 + (endMinute - startMinute);
    
    return { startPosition, duration };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок и навигация */}
      <View style={styles.header}>
        <Text style={styles.title}>Расписание - {selectedDate}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Временная шкала */}
      <ScrollView style={styles.timelineContainer}>
        <View style={styles.timeline}>
          {/* Боковая панель с временными метками */}
          <View style={styles.timeLabels}>
            {timeSlots.map((time, index) => (
              <View key={time} style={styles.timeLabel}>
                <Text style={styles.timeText}>{time}</Text>
                {index < timeSlots.length - 1 && (
                  <View style={styles.timeLine} />
                )}
              </View>
            ))}
          </View>

          {/* Основная область с активностями */}
          <View style={styles.activitiesColumn}>
            {schedule.map((activity) => {
              const { startPosition, duration } = getActivityPosition(activity);
              return (
                <View
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    {
                      top: startPosition * 0.8, // Масштабирование для отображения
                      height: duration * 0.8,
                    },
                    activity.type === 'meal' && styles.mealActivity,
                    activity.type === 'custom' && styles.customActivity,
                    activity.type === 'activity' && styles.generalActivity,
                  ]}
                >
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>
                    {activity.startTime} - {activity.endTime}
                  </Text>
                  {activity.location && (
                    <Text style={styles.activityLocation}>{activity.location}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Плавающая кнопка добавления */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddActivity}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  timelineContainer: {
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    flex: 1,
  },
  timeLabels: {
    width: 80,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  timeLabel: {
    height: 60,
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timeLine: {
    height: 59,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    marginLeft: 4,
    marginTop: 1,
  },
  activitiesColumn: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'white',
  },
  activityCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mealActivity: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  customActivity: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  generalActivity: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activityLocation: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});