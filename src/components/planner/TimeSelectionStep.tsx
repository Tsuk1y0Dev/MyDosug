import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { useSchedule } from '../../services/schedule/ScheduleContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';

export const TimeSelectionStep = () => {
  const { planningRequest, updatePlanningRequest, setCurrentStep } = usePlanner();
  const { schedule } = useSchedule();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Функция для преобразования времени в минуты
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Функция для преобразования минут в время
  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Получаем занятые временные интервалы
  const busySlots = useMemo(() => {
    return schedule.map(activity => ({
      start: timeToMinutes(activity.startTime),
      end: timeToMinutes(activity.endTime),
      title: activity.title
    })).sort((a, b) => a.start - b.start);
  }, [schedule]);

  // Проверяем, свободен ли временной интервал
  const isTimeSlotAvailable = (startTime: string, endTime: string): boolean => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    
    for (const slot of busySlots) {
      if ((start < slot.end && end > slot.start)) {
        return false; // Найдено пересечение
      }
    }
    return true;
  };

  // Находим ближайшее свободное время
  const findNextAvailableSlot = (desiredStart: string, duration: number): string => {
    let currentTime = timeToMinutes(desiredStart);
    const desiredEnd = currentTime + duration;

    // Проверяем желаемый слот
    if (isTimeSlotAvailable(minutesToTime(currentTime), minutesToTime(desiredEnd))) {
      return desiredStart;
    }

    // Ищем следующий свободный слот
    for (const slot of busySlots) {
      if (slot.end > currentTime) {
        // Проверяем интервал после текущей занятости
        const gapStart = slot.end;
        const gapEnd = gapStart + duration;
        
        // Проверяем, не пересекается ли этот интервал с другими занятиями
        let isGapFree = true;
        for (const otherSlot of busySlots) {
          if (otherSlot.start >= gapStart && otherSlot.start < gapEnd) {
            isGapFree = false;
            break;
          }
        }
        
        if (isGapFree) {
          return minutesToTime(gapStart);
        }
      }
    }

    // Если не нашли, возвращаем исходное время (пользователь сам решит конфликт)
    return desiredStart;
  };

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
      
      // Автоматически обновляем конечное время (сохраняем длительность)
      const currentDuration = timeToMinutes(planningRequest.endTime) - timeToMinutes(planningRequest.startTime);
      const newEndTime = minutesToTime(timeToMinutes(newStartTime) + currentDuration);
      
      // Проверяем доступность нового времени
      if (!isTimeSlotAvailable(newStartTime, newEndTime)) {
        const availableStart = findNextAvailableSlot(newStartTime, currentDuration);
        updatePlanningRequest({ 
          startTime: availableStart,
          endTime: minutesToTime(timeToMinutes(availableStart) + currentDuration)
        });
      } else {
        updatePlanningRequest({ 
          startTime: newStartTime,
          endTime: newEndTime
        });
      }
    }
    setShowStartPicker(false);
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const newEndTime = formatTime(selectedDate);
      const newStartTime = planningRequest.startTime;
      
      // Проверяем доступность
      if (!isTimeSlotAvailable(newStartTime, newEndTime)) {
        alert('Это время уже занято другой активностью. Пожалуйста, выберите другое время.');
        return;
      }
      
      updatePlanningRequest({ endTime: newEndTime });
    }
    setShowEndPicker(false);
  };

  const handleDurationChange = (durationMinutes: number) => {
    const startMinutes = timeToMinutes(planningRequest.startTime);
    const newEndTime = minutesToTime(startMinutes + durationMinutes);
    
    if (!isTimeSlotAvailable(planningRequest.startTime, newEndTime)) {
      const availableStart = findNextAvailableSlot(planningRequest.startTime, durationMinutes);
      updatePlanningRequest({ 
        startTime: availableStart,
        endTime: minutesToTime(timeToMinutes(availableStart) + durationMinutes)
      });
    } else {
      updatePlanningRequest({ endTime: newEndTime });
    }
  };

  const quickTimeSlots = [
    { label: 'Утро', start: '09:00', end: '10:00' },
    { label: 'День', start: '13:00', end: '14:00' },
    { label: 'Вечер', start: '18:00', end: '19:00' },
    { label: 'Ночь', start: '22:00', end: '23:00' },
  ];

  const durationOptions = [
    { label: '30 мин', value: 30 },
    { label: '1 час', value: 60 },
    { label: '1.5 часа', value: 90 },
    { label: '2 часа', value: 120 },
    { label: '3 часа', value: 180 },
  ];

  const currentDuration = timeToMinutes(planningRequest.endTime) - timeToMinutes(planningRequest.startTime);
  const isSlotAvailable = isTimeSlotAvailable(planningRequest.startTime, planningRequest.endTime);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Выберите время</Text>
      <Text style={styles.subtitle}>Когда вы хотите начать активность?</Text>

      {/* Индикатор доступности */}
      {!isSlotAvailable && (
        <View style={styles.warningBanner}>
          <Feather name="alert-triangle" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Внимание: это время пересекается с существующими активностями
          </Text>
        </View>
      )}

      {/* Быстрый выбор */}
      <View style={styles.timeSection}>
        <Text style={styles.sectionTitle}>Быстрый выбор</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickSlots}>
            {quickTimeSlots.map((slot, index) => {
              const isAvailable = isTimeSlotAvailable(slot.start, slot.end);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickSlot,
                    !isAvailable && styles.quickSlotBusy,
                    planningRequest.startTime === slot.start && styles.quickSlotSelected,
                  ]}
                  onPress={() => {
                    if (isAvailable) {
                      updatePlanningRequest({
                        startTime: slot.start,
                        endTime: slot.end,
                      });
                    }
                  }}
                >
                  <Text style={[
                    styles.quickSlotLabel,
                    !isAvailable && styles.quickSlotLabelBusy,
                    planningRequest.startTime === slot.start && styles.quickSlotLabelSelected,
                  ]}>
                    {slot.label}
                  </Text>
                  <Text style={[
                    styles.quickSlotTime,
                    !isAvailable && styles.quickSlotTimeBusy,
                  ]}>
                    {slot.start} - {slot.end}
                  </Text>
                  {!isAvailable && (
                    <Feather name="lock" size={12} color="#ef4444" style={styles.lockIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Выбор длительности */}
      <View style={styles.timeSection}>
        <Text style={styles.sectionTitle}>Продолжительность</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.durationOptions}>
            {durationOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationOption,
                  currentDuration === option.value && styles.durationOptionSelected,
                ]}
                onPress={() => handleDurationChange(option.value)}
              >
                <Text style={[
                  styles.durationOptionText,
                  currentDuration === option.value && styles.durationOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Выбор времени */}
      <View style={styles.timePickers}>
        <View style={styles.timePicker}>
          <Text style={styles.timeLabel}>Начало</Text>
          <TouchableOpacity 
            style={styles.timeDisplay}
            onPress={() => setShowStartPicker(true)}
          >
            <Feather name="clock" size={20} color="#6b7280" />
            <Text style={styles.timeText}>{planningRequest.startTime}</Text>
          </TouchableOpacity>
          {showStartPicker && (
            Platform.OS === 'web' ? (
              <input
                type="time"
                value={planningRequest.startTime}
                onChange={(e) => {
                  const newStartTime = e.target.value;
                  const currentDuration = timeToMinutes(planningRequest.endTime) - timeToMinutes(planningRequest.startTime);
                  const newEndTime = minutesToTime(timeToMinutes(newStartTime) + currentDuration);
                  
                  if (!isTimeSlotAvailable(newStartTime, newEndTime)) {
                    const availableStart = findNextAvailableSlot(newStartTime, currentDuration);
                    updatePlanningRequest({ 
                      startTime: availableStart,
                      endTime: minutesToTime(timeToMinutes(availableStart) + currentDuration)
                    });
                  } else {
                    updatePlanningRequest({ 
                      startTime: newStartTime,
                      endTime: newEndTime
                    });
                  }
                }}
                style={styles.webTimeInput}
              />
            ) : (
              <DateTimePicker
                value={parseTime(planningRequest.startTime)}
                mode="time"
                display="spinner"
                onChange={handleStartTimeChange}
                style={styles.picker}
              />
            )
          )}
        </View>

        <View style={styles.timePicker}>
          <Text style={styles.timeLabel}>Окончание</Text>
          <TouchableOpacity 
            style={styles.timeDisplay}
            onPress={() => setShowEndPicker(true)}
          >
            <Feather name="clock" size={20} color="#6b7280" />
            <Text style={styles.timeText}>{planningRequest.endTime}</Text>
          </TouchableOpacity>
          {showEndPicker && (
            Platform.OS === 'web' ? (
              <input
                type="time"
                value={planningRequest.endTime}
                onChange={(e) => {
                  const newEndTime = e.target.value;
                  if (!isTimeSlotAvailable(planningRequest.startTime, newEndTime)) {
                    alert('Это время уже занято другой активностью. Пожалуйста, выберите другое время.');
                    return;
                  }
                  updatePlanningRequest({ endTime: newEndTime });
                }}
                style={styles.webTimeInput}
              />
            ) : (
              <DateTimePicker
                value={parseTime(planningRequest.endTime)}
                mode="time"
                display="spinner"
                onChange={handleEndTimeChange}
                style={styles.picker}
              />
            )
          )}
        </View>
      </View>

      {/* Информация о длительности */}
      <View style={[
        styles.duration,
        !isSlotAvailable && styles.durationWarning
      ]}>
        <Text style={[
          styles.durationText,
          !isSlotAvailable && styles.durationTextWarning
        ]}>
          Продолжительность: {(() => {
            const duration = currentDuration;
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}ч ${minutes}мин`;
          })()}
          {!isSlotAvailable && ' ⚠️ Время занято'}
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.nextButton,
          !isSlotAvailable && styles.nextButtonWarning
        ]}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickSlotBusy: {
    backgroundColor: '#fef2f2',
    opacity: 0.7,
  },
  quickSlotSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  quickSlotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  quickSlotLabelBusy: {
    color: '#ef4444',
  },
  quickSlotLabelSelected: {
    color: '#3b82f6',
  },
  quickSlotTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickSlotTimeBusy: {
    color: '#ef4444',
  },
  lockIcon: {
    marginTop: 4,
  },
  durationOptions: {
    flexDirection: 'row',
  },
  durationOption: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  durationOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  durationOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  durationOptionTextSelected: {
    color: 'white',
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
  webTimeInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 16,
  },
  duration: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  durationWarning: {
    backgroundColor: '#fef3c7',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'center',
  },
  durationTextWarning: {
    color: '#92400e',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  nextButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});