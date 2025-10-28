import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FreeSlot } from '../types/schedule';

interface AddSlotButtonProps {
  slot: FreeSlot;
  onPress: (slot: FreeSlot) => void;
}

export const AddSlotButton: React.FC<AddSlotButtonProps> = ({ slot, onPress }) => {
  const formatDuration = (durationMinutes: number) => {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}ч ${minutes > 0 ? `${minutes}мин` : ''}`;
    }
    return `${minutes}мин`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.addSlotButton,
        {
          top: slot.startTime, // теперь number
          height: slot.duration,
        },
      ]}
      onPress={() => onPress(slot)}
    >
      <View style={styles.addSlotContent}>
        <Feather name="plus" size={16} color="#6b7280" />
        <Text style={styles.addSlotText}>
          Добавить активность ({formatDuration(slot.duration)})
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addSlotButton: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addSlotText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});