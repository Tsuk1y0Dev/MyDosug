import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { Feather } from '@expo/vector-icons';
import { PlannedActivity } from '../../types/planner';

export const RoutePlanningStep = () => {
  const { currentPlan, removeFromPlan, reorderPlan, setCurrentStep, savePlan } = usePlanner();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ч ${mins}мин` : `${mins}мин`;
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
      </View>

      {index < currentPlan.activities.length - 1 && (
        <View style={styles.connection}>
          <Feather name="arrow-down" size={16} color="#9ca3af" />
          <Text style={styles.connectionText}>
            {formatDuration(currentPlan.activities[index + 1].travelTimeFromPrevious)} в пути
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentStep(3)}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Ваш маршрут</Text>
          <Text style={styles.subtitle}>
            {formatDuration(currentPlan.totalDuration)} • ~{currentPlan.totalCost}₽
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Список активностей */}
      <ScrollView style={styles.activitiesList}>
        {currentPlan.activities.map((activity, index) => (
          <PlanActivity 
            key={activity.id} 
            activity={activity} 
            index={index} 
          />
        ))}
      </ScrollView>

      {/* Карта (заглушка) */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapPlaceholder}>🗺️ Карта маршрута</Text>
        <Text style={styles.mapDescription}>
          Здесь будет отображаться карта с маршрутом между всеми точками
        </Text>
      </View>

      {/* Кнопки действий */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.addMoreButton}
          onPress={() => setCurrentStep(3)}
        >
          <Feather name="plus" size={20} color="#3b82f6" />
          <Text style={styles.addMoreText}>Добавить ещё</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.savePlanButton}
          onPress={savePlan}
        >
          <Feather name="check" size={20} color="white" />
          <Text style={styles.savePlanText}>Сохранить план</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
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
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
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
  mapContainer: {
    height: 200,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 12,
  },
  mapPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  mapDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
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