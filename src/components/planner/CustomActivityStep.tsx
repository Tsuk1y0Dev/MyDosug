import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { useSchedule } from '../../services/schedule/ScheduleContext';
import { Activity } from '../../types/schedule';
import { Feather } from '@expo/vector-icons';

export const CustomActivityStep = () => {
  const { planningRequest, setCurrentStep } = usePlanner();
  const { addActivity } = useSchedule();
  
  const [customActivity, setCustomActivity] = useState({
    title: '',
    location: '',
    description: '',
    duration: 60, // минуты
  });

  const handleSaveCustomActivity = () => {
    if (!customActivity.title.trim()) {
      Alert.alert('Ошибка', 'Введите название активности');
      return;
    }

    const newActivity: Activity = {
      id: `custom-${Date.now()}`,
      title: customActivity.title,
      startTime: planningRequest.startTime,
      endTime: calculateEndTime(planningRequest.startTime, customActivity.duration),
      location: customActivity.location,
      type: 'custom',
      description: customActivity.description,
    };

    addActivity(newActivity);
    
    Alert.alert(
      'Успешно!',
      'Кастомная активность добавлена в расписание',
      [{ text: 'OK', onPress: () => setCurrentStep(1) }]
    );
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const durationOptions = [30, 60, 90, 120, 180];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Создать свою активность</Text>
      <Text style={styles.subtitle}>Добавьте мероприятие, которого нет в нашем каталоге</Text>

      <ScrollView style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Название активности *</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Встреча с друзьями"
            value={customActivity.title}
            onChangeText={(text) => setCustomActivity(prev => ({ ...prev, title: text }))}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Местоположение</Text>
          <TextInput
            style={styles.input}
            placeholder="Адрес или название места"
            value={customActivity.location}
            onChangeText={(text) => setCustomActivity(prev => ({ ...prev, location: text }))}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Дополнительная информация..."
            value={customActivity.description}
            onChangeText={(text) => setCustomActivity(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Продолжительность</Text>
          <View style={styles.durationOptions}>
            {durationOptions.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationOption,
                  customActivity.duration === duration && styles.durationOptionSelected
                ]}
                onPress={() => setCustomActivity(prev => ({ ...prev, duration }))}
              >
                <Text style={[
                  styles.durationText,
                  customActivity.duration === duration && styles.durationTextSelected
                ]}>
                  {duration} мин
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.timeInfoText}>
            Время: {planningRequest.startTime} - {calculateEndTime(planningRequest.startTime, customActivity.duration)}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Feather name="arrow-left" size={20} color="#3b82f6" />
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.saveButton,
            !customActivity.title.trim() && styles.saveButtonDisabled
          ]}
          disabled={!customActivity.title.trim()}
          onPress={handleSaveCustomActivity}
        >
          <Feather name="check" size={20} color="white" />
          <Text style={styles.saveButtonText}>Сохранить</Text>
        </TouchableOpacity>
      </View>
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
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
  },
  form: {
    flex: 1,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  durationOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  durationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  durationTextSelected: {
    color: 'white',
  },
  timeInfo: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  timeInfoText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});