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
import { useSchedule } from '../../services/schedule/ScheduleContext';
import { Activity, FreeSlot } from '../../types/schedule';
import { ActivityBlock } from '../../components/home/ActivityBlock';
import { AddSlotButton } from '../../components/home/AddSlotButton';
import { Timeline } from '../../components/home/Timeline';
import { PlannerModal } from './PlannerModal';
import { Feather } from '@expo/vector-icons';

const HOUR_HEIGHT = 80;
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const { schedule, deleteActivity, updateActivity } = useSchedule();
  const [selectedDate, setSelectedDate] = useState<string>('Сегодня');
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{startTime: string; endTime: string} | undefined>();

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const timeToPosition = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  };

  const positionToTime = (position: number): string => {
    const totalMinutes = (position / HOUR_HEIGHT) * 60;
    const hours = Math.floor(totalMinutes / 60) + START_HOUR;
    const minutes = Math.round(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

const freeSlots = useMemo((): FreeSlot[] => {
  if (schedule.length === 0) {
    return []; // Не показываем окна, если нет активностей
  }

  const busySlots = schedule
    .map(activity => ({
      start: timeToPosition(activity.startTime),
      end: timeToPosition(activity.endTime)
    }))
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];

  // Только между активностями, не в начале/конце дня
  for (let i = 0; i < busySlots.length - 1; i++) {
    const currentSlot = busySlots[i];
    const nextSlot = busySlots[i + 1];
    
    if (nextSlot.start > currentSlot.end) {
      const durationPixels = nextSlot.start - currentSlot.end;
      const durationMinutes = (durationPixels / HOUR_HEIGHT) * 60;
      
      if (durationMinutes >= 30) { // Минимум 30 минут
        slots.push({
          startTime: currentSlot.end,
          endTime: nextSlot.start,
          duration: durationPixels,
          startTimeString: positionToTime(currentSlot.end),
          endTimeString: positionToTime(nextSlot.start),
        });
      }
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
          onPress: () => deleteActivity(activity.id)
        }
      ]
    );
  };

  const handleDragStart = (activityId: string) => {
    setDraggingActivityId(activityId);
  };

  const handleDragEnd = (activityId: string, newStartTime: string, newEndTime: string) => {
    updateActivity(activityId, { 
      startTime: newStartTime, 
      endTime: newEndTime 
    });
    setDraggingActivityId(null);
  };

  const handleActivitySwap = (draggedId: string, targetId: string) => {
    const draggedActivity = schedule.find(a => a.id === draggedId);
    const targetActivity = schedule.find(a => a.id === targetId);
    
    if (!draggedActivity || !targetActivity) return;

    // Меняем временные интервалы местами
    updateActivity(draggedId, {
      startTime: targetActivity.startTime,
      endTime: targetActivity.endTime
    });
    
    updateActivity(targetId, {
      startTime: draggedActivity.startTime,
      endTime: draggedActivity.endTime
    });
    
    setDraggingActivityId(null);
  };

  const handleAddActivity = (slot?: FreeSlot) => {
    if (slot) {
      setSelectedTimeSlot({
        startTime: slot.startTimeString!,
        endTime: slot.endTimeString!
      });
    } else {
      setSelectedTimeSlot(undefined);
    }
    setPlannerVisible(true);
  };

  const handlePlannerClose = () => {
    setPlannerVisible(false);
    setSelectedTimeSlot(undefined);
  };

  const [timelineScrollRef] = useState(React.createRef<ScrollView>());
  const [activitiesScrollRef] = useState(React.createRef<ScrollView>());

  const handleActivitiesScroll = (event: any) => {
    const { y } = event.nativeEvent.contentOffset;
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({ y, animated: false });
    }
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

  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return timeToPosition(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
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
          <TouchableOpacity style={styles.statsButton}>
            <Feather name="bar-chart-2" size={20} color="#6b7280" />
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
        <View style={styles.scheduleStats}>
          <Text style={styles.statsText}>
            {schedule.length} активностей • {freeSlots.length} свободных окон
          </Text>
        </View>
      </View>

      {/* Временная шкала */}
<View style={styles.timelineContainer}>
  <Timeline 
    timeSlots={timeSlots} 
    hourHeight={HOUR_HEIGHT}
    contentHeight={TOTAL_HOURS * HOUR_HEIGHT}
  />
  
  <View style={styles.activitiesColumn}>
    <ScrollView 
      style={styles.activitiesScrollView}
      contentContainerStyle={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      showsVerticalScrollIndicator={false}
      ref={activitiesScrollRef}
      onScroll={handleActivitiesScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.activitiesContent, { height: TOTAL_HOURS * HOUR_HEIGHT }]}>
        {/* Текущее время индикатор */}
        <View 
          style={[
            styles.currentTimeLine,
            { top: getCurrentTimePosition() }
          ]}
        >
          <View style={styles.currentTimeDot} />
          <View style={styles.currentTimeLineVertical} />
        </View>

        {/* Индикатор перетаскивания */}
        {draggingActivityId && (
          <View style={styles.dragOverlay}>
            <Feather name="refresh-cw" size={16} color="#3b82f6" />
            <Text style={styles.dragOverlayText}>Перетащите для обмена</Text>
          </View>
        )}
        
        {/* Свободные слоты ТОЛЬКО между активностями */}
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
</View>

      {/* Плавающая кнопка добавления */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => handleAddActivity()}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Модальное окно планировщика */}
      <PlannerModal
        visible={plannerVisible}
        onClose={handlePlannerClose}
        initialTimeSlot={selectedTimeSlot}
      />
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
  statsButton: {
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
    marginBottom: 8,
  },
  scheduleStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
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
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: -4,
  },
  currentTimeLineVertical: {
    flex: 1,
    height: 2,
    backgroundColor: '#ef4444',
  },
  dragOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dragOverlayText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 8,
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
    activitiesScrollView: {
    flex: 1,
  },
});