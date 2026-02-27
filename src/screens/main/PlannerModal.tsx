import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { PlannerProvider } from '../../services/planner/PlannerContext';
import { PlannerContent } from './PlannerContent';
import { Feather } from '@expo/vector-icons';

interface PlannerModalProps {
  visible: boolean;
  onClose: () => void;
  initialTimeSlot?: {
    startTime: string;
    endTime: string;
  };
  selectedDate?: Date;
  initialStep?: number;
  initialPlanType?: 'single' | 'chain';
}

export const PlannerModal: React.FC<PlannerModalProps> = ({ 
  visible, 
  onClose, 
  initialTimeSlot,
  selectedDate,
  initialStep,
  initialPlanType,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <PlannerProvider
        initialTimeSlot={initialTimeSlot}
        selectedDate={selectedDate}
        initialStep={initialStep}
        initialPlanType={initialPlanType}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <PlannerContent onPlanSaved={onClose} />
        </View>
      </PlannerProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});