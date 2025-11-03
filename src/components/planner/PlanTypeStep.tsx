import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { Feather } from '@expo/vector-icons';

export const PlanTypeStep = () => {
  const { planningRequest, updatePlanningRequest, setCurrentStep } = usePlanner();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Что планируем?</Text>
      <Text style={styles.subtitle}>Выберите тип активности</Text>

      <View style={styles.options}>
        <TouchableOpacity 
          style={[
            styles.option,
            planningRequest.planType === 'single' && styles.optionSelected
          ]}
          onPress={() => updatePlanningRequest({ planType: 'single' })}
        >
          <View style={styles.optionIcon}>
            <Feather name="star" size={32} color="#3b82f6" />
          </View>
          <Text style={styles.optionTitle}>Одно мероприятие</Text>
          <Text style={styles.optionDescription}>
            Запланируйте посещение одного места в выбранное время
          </Text>
          <View style={styles.optionFeatures}>
            <Text style={styles.feature}>• Одно место</Text>
            <Text style={styles.feature}>• Фиксированное время</Text>
            <Text style={styles.feature}>• Простое планирование</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.option,
            planningRequest.planType === 'chain' && styles.optionSelected
          ]}
          onPress={() => updatePlanningRequest({ planType: 'chain' })}
        >
          <View style={styles.optionIcon}>
            <Feather name="map" size={32} color="#10b981" />
          </View>
          <Text style={styles.optionTitle}>Цепочка мероприятий</Text>
          <Text style={styles.optionDescription}>
            Постройте маршрут из нескольких мест с автоматическим расчетом времени
          </Text>
          <View style={styles.optionFeatures}>
            <Text style={styles.feature}>• Несколько мест</Text>
            <Text style={styles.feature}>• Авторасчет времени</Text>
            <Text style={styles.feature}>• Логистика маршрута</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.nextButton,
          !planningRequest.planType && styles.nextButtonDisabled
        ]}
        disabled={!planningRequest.planType}
        onPress={() => setCurrentStep(2)}
      >
        <Text style={styles.nextButtonText}>Продолжить</Text>
        <Feather name="arrow-right" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  options: {
    flex: 1,
    gap: 20,
  },
  option: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  optionIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionFeatures: {
    gap: 4,
  },
  feature: {
    fontSize: 12,
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});