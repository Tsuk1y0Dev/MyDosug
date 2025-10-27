// src/components/FloatingActionButton/FloatingActionButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = '+',
  position = 'bottom-right',
}) => {
  const getPositionStyle = () => {
    switch (position) {
      case 'bottom-left':
        return { bottom: 20, left: 20 };
      case 'top-right':
        return { top: 20, right: 20 };
      case 'top-left':
        return { top: 20, left: 20 };
      default:
        return { bottom: 20, right: 20 };
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, getPositionStyle()]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{icon}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});