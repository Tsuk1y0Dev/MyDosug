import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSchedule } from '../../services/schedule/ScheduleContext';
import { timeToMinutes, minutesToTime } from '../../utils/timingUtils';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimeSelectionModalProps {
  visible: boolean;
  suggestedStartTime: string;
  suggestedEndTime: string;
  onConfirm: (startTime: string, endTime: string) => void;
  onCancel: () => void;
}

export const TimeSelectionModal: React.FC<TimeSelectionModalProps> = ({
  visible,
  suggestedStartTime,
  suggestedEndTime,
  onConfirm,
  onCancel,
}) => {
  const { schedule } = useSchedule();
  const [startTime, setStartTime] = useState(suggestedStartTime);
  const [endTime, setEndTime] = useState(suggestedEndTime);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Обновляем время при изменении предложенных значений
  useEffect(() => {
    if (suggestedStartTime) {
      setStartTime(suggestedStartTime);
    }
    if (suggestedEndTime) {
      setEndTime(suggestedEndTime);
    }
  }, [suggestedStartTime, suggestedEndTime]);

  // Получаем занятые временные интервалы
  const busySlots = useMemo(() => {
    return schedule.map(activity => ({
      start: timeToMinutes(activity.startTime),
      end: timeToMinutes(activity.endTime),
      title: activity.title
    })).sort((a, b) => a.start - b.start);
  }, [schedule]);

  // Проверяем, свободен ли временной интервал
  const isTimeSlotAvailable = (start: string, end: string): boolean => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    
    for (const slot of busySlots) {
      if (startMin < slot.end && endMin > slot.start) {
        return false;
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!isTimeSlotAvailable(startTime, endTime)) {
      Alert.alert(
        'Конфликт времени',
        'Выбранное время пересекается с существующими активностями. Пожалуйста, выберите другое время.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      Alert.alert(
        'Ошибка',
        'Время окончания должно быть позже времени начала.',
        [{ text: 'OK' }]
      );
      return;
    }

    onConfirm(startTime, endTime);
  };

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Выберите время</Text>
            <TouchableOpacity onPress={onCancel}>
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.timeSection}>
            <Text style={styles.label}>Время начала</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.timeButton}>
                <Feather name="clock" size={20} color="#3b82f6" />
                <View style={styles.webTimeInputContainer}>
                  {/* @ts-ignore - веб-специфичный input */}
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e: any) => {
                      const newTime = e.target.value;
                      setStartTime(newTime);
                      // Автоматически обновляем время окончания, если оно стало раньше начала
                      if (timeToMinutes(newTime) >= timeToMinutes(endTime)) {
                        const newEndMinutes = timeToMinutes(newTime) + 60;
                        setEndTime(minutesToTime(newEndMinutes));
                      }
                    }}
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#1f2937',
                      marginLeft: 12,
                      padding: 0,
                      border: 'none',
                      backgroundColor: 'transparent',
                      outline: 'none',
                    }}
                  />
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Feather name="clock" size={20} color="#3b82f6" />
                  <Text style={styles.timeText}>{startTime}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={parseTime(startTime)}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) {
                        const newTime = formatTime(date);
                        setStartTime(newTime);
                        // Автоматически обновляем время окончания, если оно стало раньше начала
                        if (timeToMinutes(newTime) >= timeToMinutes(endTime)) {
                          const newEndMinutes = timeToMinutes(newTime) + 60;
                          setEndTime(minutesToTime(newEndMinutes));
                        }
                      }
                      if (Platform.OS !== 'ios') {
                        setShowStartPicker(false);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.timeSection}>
            <Text style={styles.label}>Время окончания</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.timeButton}>
                <Feather name="clock" size={20} color="#3b82f6" />
                <View style={styles.webTimeInputContainer}>
                  {/* @ts-ignore - веб-специфичный input */}
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e: any) => setEndTime(e.target.value)}
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#1f2937',
                      marginLeft: 12,
                      padding: 0,
                      border: 'none',
                      backgroundColor: 'transparent',
                      outline: 'none',
                    }}
                  />
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Feather name="clock" size={20} color="#3b82f6" />
                  <Text style={styles.timeText}>{endTime}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={parseTime(endTime)}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) {
                        setEndTime(formatTime(date));
                      }
                      if (Platform.OS !== 'ios') {
                        setShowEndPicker(false);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>

          {!isTimeSlotAvailable(startTime, endTime) && (
            <View style={styles.warning}>
              <Feather name="alert-circle" size={16} color="#f59e0b" />
              <Text style={styles.warningText}>
                Время пересекается с существующими активностями
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Подтвердить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 40,
      elevation: 10,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  timeSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  webTimeInputContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
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
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

