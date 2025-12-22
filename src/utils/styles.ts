import { Platform, ViewStyle } from 'react-native';

export const createShadowStyle = (
  options: {
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
  } = {}
): ViewStyle => {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 8,
    elevation = 3,
  } = options;

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    } as any;
  }

  return {
    shadowColor,
    shadowOffset,
    shadowOpacity,
    shadowRadius,
    elevation,
  };
};

export const cardShadow = createShadowStyle({
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
});

export const buttonShadow = createShadowStyle({
  shadowColor: '#3b82f6',
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 5,
});

export const modalShadow = createShadowStyle({
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 8,
});


