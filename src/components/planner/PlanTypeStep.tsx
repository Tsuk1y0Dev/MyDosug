import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
        onPress={() => {
          // Для одного мероприятия пропускаем шаг выбора времени
          // Для цепочки - переходим к выбору времени
          if (planningRequest.planType === 'single') {
            setCurrentStep(2); // Пропускаем TimeSelectionStep, идем к ParametersStep
          } else {
            setCurrentStep(1); // Идем к TimeSelectionStep
          }
        }}
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
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  option: {
    backgroundColor: 'white',
    padding: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  optionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    } : {
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 5,
    }),
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