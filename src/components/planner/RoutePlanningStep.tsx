import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { useSchedule } from '../../services/schedule/ScheduleContext';
import { Feather } from '@expo/vector-icons';
import { PlannedActivity } from '../../types/planner';

interface RoutePlanningStepProps {
  onPlanSaved: () => void;
}

export const RoutePlanningStep: React.FC<RoutePlanningStepProps> = ({ onPlanSaved }) => {
  const { currentPlan, removeFromPlan, setCurrentStep, planningRequest } = usePlanner();
  const { addPlannedActivities, schedule } = useSchedule();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}ч ${mins}мин` : `${hours}ч`;
    }
    return `${mins}мин`;
  };

  // Функция для проверки конфликтов времени
  const checkTimeConflicts = (activities: PlannedActivity[]): { hasConflicts: boolean; conflicts: string[] } => {
    const conflicts: string[] = [];
    const allActivities = [...schedule, ...activities.map(a => ({
      id: a.id,
      title: a.place.name,
      startTime: a.startTime,
      endTime: a.endTime,
      location: a.place.address,
      type: 'activity' as const
    }))];

    // Проверяем пересечения временных интервалов
    for (let i = 0; i < allActivities.length; i++) {
      for (let j = i + 1; j < allActivities.length; j++) {
        const a = allActivities[i];
        const b = allActivities[j];
        
        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        
        if ((aStart < bEnd && aEnd > bStart) || (bStart < aEnd && bEnd > aStart)) {
          conflicts.push(`${a.title} и ${b.title} пересекаются во времени`);
        }
      }
    }

    return { hasConflicts: conflicts.length > 0, conflicts };
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateTotalStats = () => {
    const totalDuration = currentPlan.totalDuration;
    const totalCost = currentPlan.totalCost;
    const activityCount = currentPlan.activities.length;

    return { totalDuration, totalCost, activityCount };
  };

  const handleSavePlan = () => {
    if (currentPlan.activities.length === 0) {
      Alert.alert('Пустой план', 'Добавьте хотя бы одну активность в план');
      return;
    }

    // Проверяем конфликты времени
    const { hasConflicts, conflicts } = checkTimeConflicts(currentPlan.activities);
    
    if (hasConflicts) {
      Alert.alert(
        'Обнаружены конфликты времени',
        `Некоторые активности пересекаются по времени:\n\n${conflicts.slice(0, 3).join('\n')}${conflicts.length > 3 ? '\n...и другие' : ''}\n\nВы можете:\n• Сохранить план и решить конфликты позже\n• Вернуться и изменить время`,
        [
          {
            text: 'Отмена',
            style: 'cancel'
          },
          {
            text: 'Сохранить всё равно',
            onPress: () => savePlanConfirmed()
          }
        ]
      );
    } else {
      savePlanConfirmed();
    }
  };

  const savePlanConfirmed = () => {
    // Сохраняем план в глобальное состояние
    addPlannedActivities(currentPlan.activities);
    
    // Показываем уведомление об успехе
    Alert.alert(
      '✅ План сохранен!',
      `Добавлено ${currentPlan.activities.length} активностей в ваше расписание\n\nОбщая продолжительность: ${formatDuration(currentPlan.totalDuration)}\nПримерная стоимость: ${currentPlan.totalCost}₽`,
      [
        {
          text: 'Отлично!',
          onPress: onPlanSaved
        }
      ]
    );
  };

  const PlanActivity = ({ activity, index }: { activity: PlannedActivity; index: number }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityHeader}>
        <View style={styles.activityNumber}>
          <Text style={styles.activityNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityName}>{activity.place.name}</Text>
          <Text style={styles.activityTime}>
            {activity.startTime} - {activity.endTime}
          </Text>
          <Text style={styles.activityAddress} numberOfLines={1}>
            {activity.place.address}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromPlan(activity.id)}
        >
          <Feather name="x" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.activityDetails}>
        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color="#6b7280" />
          <Text style={styles.detailText}>
            Продолжительность: {formatDuration(activity.place.duration)}
          </Text>
        </View>
        
        {activity.travelTimeFromPrevious > 0 && (
          <View style={styles.detailRow}>
            <Feather name="navigation" size={14} color="#6b7280" />
            <Text style={styles.detailText}>
              В пути: {formatDuration(activity.travelTimeFromPrevious)}
            </Text>
          </View>
        )}
        
        {activity.place.averageBill && activity.place.averageBill > 0 && (
          <View style={styles.detailRow}>
            <Feather name="credit-card" size={14} color="#6b7280" />
            <Text style={styles.detailText}>
              ~{activity.place.averageBill}₽
            </Text>
          </View>
        )}

        <View style={styles.features}>
          {activity.place.features.wheelchair && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>♿</Text>
            </View>
          )}
          {activity.place.features.vegetarian && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>🌱</Text>
            </View>
          )}
          {activity.place.features.outdoor && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>🌳</Text>
            </View>
          )}
          {activity.place.features.childFriendly && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>👶</Text>
            </View>
          )}
        </View>
      </View>

      {index < currentPlan.activities.length - 1 && (
        <View style={styles.connection}>
          <Feather name="arrow-down" size={16} color="#9ca3af" />
          <Text style={styles.connectionText}>
            {formatDuration(currentPlan.activities[index + 1].travelTimeFromPrevious)} в пути до следующей точки
          </Text>
        </View>
      )}
    </View>
  );

  const { totalDuration, totalCost, activityCount } = calculateTotalStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentStep(3)}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Ваш маршрут</Text>
          <Text style={styles.subtitle}>
            {activityCount} мест • {formatDuration(totalDuration)} • ~{totalCost}₽
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {currentPlan.activities.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activityCount}</Text>
            <Text style={styles.statLabel}>активности</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
            <Text style={styles.statLabel}>время</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~{totalCost}₽</Text>
            <Text style={styles.statLabel}>бюджет</Text>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.activitiesList}
        showsVerticalScrollIndicator={false}
      >
        {currentPlan.activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="map" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>План пуст</Text>
            <Text style={styles.emptyStateText}>
              Добавьте места из списка рекомендаций, чтобы построить маршрут
            </Text>
          </View>
        ) : (
          currentPlan.activities.map((activity, index) => (
            <PlanActivity 
              key={activity.id} // Используем уникальный ID активности
              activity={activity} 
              index={index} 
            />
          ))
        )}
      </ScrollView>

      {currentPlan.activities.length > 0 && (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Feather name="map" size={20} color="#374151" />
            <Text style={styles.mapTitle}>Маршрут на карте</Text>
          </View>
          <View style={styles.mapPlaceholder}>
            <Feather name="map-pin" size={32} color="#3b82f6" />
            <Text style={styles.mapPlaceholderText}>
              {currentPlan.activities.length} точек на карте
            </Text>
            <Text style={styles.mapDescription}>
              Здесь будет отображаться оптимизированный маршрут между всеми выбранными местами
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.addMoreButton}
          onPress={() => setCurrentStep(3)}
        >
          <Feather name="plus" size={20} color="#3b82f6" />
          <Text style={styles.addMoreText}>
            {currentPlan.activities.length > 0 ? 'Добавить ещё' : 'Добавить места'}
          </Text>
        </TouchableOpacity>
        
        {currentPlan.activities.length > 0 && (
          <TouchableOpacity 
            style={styles.savePlanButton}
            onPress={handleSavePlan}
          >
            <Feather name="check" size={20} color="white" />
            <Text style={styles.savePlanText}>Сохранить план</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  activitiesList: {
    flex: 1,
    padding: 20,
  },
  activityItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  activityNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  activityNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 2,
  },
  activityAddress: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeButton: {
    padding: 4,
  },
  activityDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  features: {
    flexDirection: 'row',
    marginTop: 8,
  },
  featureTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#0369a1',
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  connectionText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  mapContainer: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  mapPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  mapDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  addMoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  addMoreText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 8,
  },
  savePlanButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  savePlanText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});