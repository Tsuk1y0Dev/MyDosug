import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';
import { Activity, TimeSlot, FreeSlot } from '../../types/schedule';
import { ActivityBlock } from '../../components/ActivityBlock';
import { AddSlotButton } from '../../components/AddSlotButton';
import { Timeline } from '../../components/Timeline';
import { Feather, MaterialIcons } from '@expo/vector-icons';

const HOUR_HEIGHT = 80; // Высота одного часа в пикселях

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('Четверг, 12 дек');
  const [showAddModal, setShowAddModal] = useState(false);

  // Пример данных расписания
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
    },
    {
      id: '4',
      title: 'Ужин в ресторане "Z"',
      startTime: '19:00',
      endTime: '20:30',
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

  // Функции для конвертации времени в позицию и обратно
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

    // Вычисление свободных промежутков
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
        
        if (durationMinutes >= 30) { // Минимальная продолжительность 30 минут
          slots.push({
            startTime: lastEnd, // number
            endTime: slot.start, // number
            duration: durationPixels, // number (в пикселях)
            startTimeString: positionToTime(lastEnd), // string для временных меток
            endTimeString: positionToTime(slot.start), // string для временных меток
          });
        }
      }
      lastEnd = Math.max(lastEnd, slot.end);
    });


    // Добавляем слот после последней активности до конца дня
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

  const handleActivityDrag = (activityId: string, newStartTime: string, newEndTime: string) => {
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
      startTime: slot?.startTimeString || '12:00', // используем строковое представление
      endTime: slot?.endTimeString || '13:00', // используем строковое представление
      type: 'activity'
    };
    
    setSchedule(prev => [...prev, newActivity]);
    setShowAddModal(false);
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
      {/* Заголовок */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={24} color="#3b82f6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Расписание</Text>
            <Text style={styles.subtitle}>{selectedDate}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.userButton}>
            <Feather name="user" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Информация о пользователе */}
      <View style={styles.userInfo}>
        <Text style={styles.userGreeting}>Добро пожаловать!</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Временная шкала */}
      <View style={styles.timelineContainer}>
        <Timeline timeSlots={timeSlots} hourHeight={HOUR_HEIGHT} />
        
        <ScrollView style={styles.activitiesColumn}>
          <View style={[styles.activitiesContent, { height: 16 * HOUR_HEIGHT }]}>
            {/* Свободные слоты */}
            {freeSlots.map((slot, index) => (
              <AddSlotButton
                key={index}
                slot={slot}
                onPress={handleAddActivity}
              />
            ))}
            
            {/* Активности */}
            {schedule.map((activity) => (
              <ActivityBlock
                key={activity.id}
                activity={activity}
                onPress={handleActivityPress}
                onDrag={handleActivityDrag}
                timeToPosition={timeToPosition}
                positionToTime={positionToTime}
                hourHeight={HOUR_HEIGHT}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Плавающая кнопка добавления */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowAddModal(true)}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Модальное окно добавления */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавить активность</Text>
            <Text style={styles.modalSubtitle}>Выберите тип активности</Text>
            
            <View style={styles.activityTypes}>
              <TouchableOpacity 
                style={[styles.typeButton, { backgroundColor: '#e8f5e8' }]}
                onPress={() => handleAddActivity()}
              >
                <Text style={[styles.typeText, { color: '#10b981' }]}>🍽️ Питание</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.typeButton, { backgroundColor: '#fff3e0' }]}
                onPress={() => handleAddActivity()}
              >
                <Text style={[styles.typeText, { color: '#f59e0b' }]}>⚙️ Кастомная</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.typeButton, { backgroundColor: '#e3f2fd' }]}
                onPress={() => handleAddActivity()}
              >
                <Text style={[styles.typeText, { color: '#3b82f6' }]}>🚶 Активность</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  userButton: {
    padding: 8,
    marginRight: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  activityTypes: {
    marginBottom: 24,
  },
  typeButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});