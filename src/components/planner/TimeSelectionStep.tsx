import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';

export const TimeSelectionStep = () => {
  const { planningRequest, updatePlanningRequest, setCurrentStep } = usePlanner();

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const newStartTime = formatTime(selectedDate);
      updatePlanningRequest({ startTime: newStartTime });
      
      // Автоматически обновляем конечное время
      const [hours, minutes] = newStartTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 1, minutes, 0, 0);
      updatePlanningRequest({ endTime: formatTime(endDate) });
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      updatePlanningRequest({ endTime: formatTime(selectedDate) });
    }
  };

  const quickTimeSlots = [
    { label: 'Утро', start: '09:00', end: '10:00' },
    { label: 'День', start: '13:00', end: '14:00' },
    { label: 'Вечер', start: '18:00', end: '19:00' },
    { label: 'Ночь', start: '22:00', end: '23:00' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Выберите время</Text>
      <Text style={styles.subtitle}>Когда вы хотите начать активность?</Text>

      <View style={styles.timeSection}>
        <Text style={styles.sectionTitle}>Быстрый выбор</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickSlots}>
            {quickTimeSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickSlot}
                onPress={() => {
                  updatePlanningRequest({
                    startTime: slot.start,
                    endTime: slot.end,
                  });
                }}
              >
                <Text style={styles.quickSlotLabel}>{slot.label}</Text>
                <Text style={styles.quickSlotTime}>{slot.start} - {slot.end}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.timePickers}>
        <View style={styles.timePicker}>
          <Text style={styles.timeLabel}>Начало</Text>
          <View style={styles.timeDisplay}>
            <Feather name="clock" size={20} color="#6b7280" />
            <Text style={styles.timeText}>{planningRequest.startTime}</Text>
          </View>
          <DateTimePicker
            value={parseTime(planningRequest.startTime)}
            mode="time"
            display="spinner"
            onChange={handleStartTimeChange}
            style={styles.picker}
          />
        </View>

        <View style={styles.timePicker}>
          <Text style={styles.timeLabel}>Окончание</Text>
          <View style={styles.timeDisplay}>
            <Feather name="clock" size={20} color="#6b7280" />
            <Text style={styles.timeText}>{planningRequest.endTime}</Text>
          </View>
          <DateTimePicker
            value={parseTime(planningRequest.endTime)}
            mode="time"
            display="spinner"
            onChange={handleEndTimeChange}
            style={styles.picker}
          />
        </View>
      </View>

      <View style={styles.duration}>
        <Text style={styles.durationText}>
          Продолжительность: {(() => {
            const [startH, startM] = planningRequest.startTime.split(':').map(Number);
            const [endH, endM] = planningRequest.endTime.split(':').map(Number);
            const duration = (endH * 60 + endM) - (startH * 60 + startM);
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}ч ${minutes}мин`;
          })()}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.nextButton}
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
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
  },
  timeSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickSlots: {
    flexDirection: 'row',
  },
  quickSlot: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  quickSlotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  quickSlotTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  timePickers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timePicker: {
    flex: 1,
    marginHorizontal: 5,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  picker: {
    height: 120,
  },
  duration: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});