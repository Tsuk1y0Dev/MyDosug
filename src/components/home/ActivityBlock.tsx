import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Activity } from '../../types/schedule';
import { MaterialIcons, Feather } from '@expo/vector-icons';

interface ActivityBlockProps {
  activity: Activity;
  onPress: (activity: Activity) => void;
  onDragStart: (activityId: string) => void;
  onDragEnd: (activityId: string, newStartTime: string, newEndTime: string) => void;
  onSwap: (draggedId: string, targetId: string) => void;
  timeToPosition: (time: string) => number;
  positionToTime: (position: number) => string;
  hourHeight: number;
  isDragging?: boolean;
  allActivities: Activity[];
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  activity,
  onPress,
  onDragStart,
  onDragEnd,
  onSwap,
  timeToPosition,
  positionToTime,
  hourHeight,
  isDragging = false,
  allActivities,
}) => {
  const translateY = useSharedValue(0);
  const [isActiveDrag, setIsActiveDrag] = useState(false);
  
  const startPosition = useSharedValue(timeToPosition(activity.startTime));
  const duration = useSharedValue(timeToPosition(activity.endTime) - timeToPosition(activity.startTime));
  
  // Обновляем позицию при изменении времени активности
  useEffect(() => {
    startPosition.value = timeToPosition(activity.startTime);
    duration.value = timeToPosition(activity.endTime) - timeToPosition(activity.startTime);
  }, [activity.startTime, activity.endTime, timeToPosition, startPosition, duration]);

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      meal: '#10b981',
      custom: '#f59e0b',
      activity: '#3b82f6',
    };
    return colors[type];
  };

  // Функция для поиска пересекающихся активностей
  const findOverlappingActivity = useCallback((newPosition: number): Activity | null => {
    const newStartTime = positionToTime(newPosition);
    const newEndTime = positionToTime(newPosition + duration.value);
    
    for (const otherActivity of allActivities) {
      if (otherActivity.id === activity.id) continue;
      
      const otherStart = timeToPosition(otherActivity.startTime);
      const otherEnd = timeToPosition(otherActivity.endTime);
      
      // Проверяем пересечение
      if (newPosition < otherEnd && (newPosition + duration.value) > otherStart) {
        return otherActivity;
      }
    }
    return null;
  }, [allActivities, activity.id, positionToTime, timeToPosition, duration.value]);

  // Функция для обработки окончания перетаскивания
  const handleDragEnd = useCallback((newPosition: number) => {
    try {
      const overlappingActivity = findOverlappingActivity(newPosition);
      
      if (overlappingActivity) {
        // Если есть пересечение - обменяемся
        onSwap(activity.id, overlappingActivity.id);
      } else {
        // Иначе просто перемещаем
        const newStartTime = positionToTime(newPosition);
        const newEndTime = positionToTime(newPosition + duration.value);
        onDragEnd(activity.id, newStartTime, newEndTime);
      }
      
      setIsActiveDrag(false);
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
      setIsActiveDrag(false);
    }
  }, [findOverlappingActivity, onSwap, onDragEnd, activity.id, positionToTime, duration.value]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      try {
        runOnJS(setIsActiveDrag)(true);
        runOnJS(onDragStart)(activity.id);
      } catch (error) {
        console.error('Error in gesture onStart:', error);
      }
    },
    onActive: (event) => {
      try {
        if (event.translationY !== undefined && !isNaN(event.translationY)) {
          translateY.value = event.translationY;
        }
      } catch (error) {
        console.error('Error in gesture onActive:', error);
      }
    },
    onEnd: (event) => {
      try {
        const newPosition = startPosition.value + (event.translationY || 0);
        if (!isNaN(newPosition) && newPosition >= 0) {
          runOnJS(handleDragEnd)(newPosition);
        }
        translateY.value = withSpring(0);
      } catch (error) {
        console.error('Error in gesture onEnd:', error);
        translateY.value = withSpring(0);
        runOnJS(setIsActiveDrag)(false);
      }
    },
    onCancel: () => {
      translateY.value = withSpring(0);
      runOnJS(setIsActiveDrag)(false);
    },
    onFail: () => {
      translateY.value = withSpring(0);
      runOnJS(setIsActiveDrag)(false);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      zIndex: isActiveDrag ? 100 : 1,
      opacity: withSpring(isActiveDrag ? 0.8 : 1),
      shadowOpacity: withSpring(isActiveDrag ? 0.3 : 0.1),
    };
  });

  const handlePress = () => {
    if (!isActiveDrag) {
      onPress(activity);
    }
  };

  // Для веба используем упрощенную версию с кнопками перемещения
  if (Platform.OS === 'web') {
    const handleMoveUp = () => {
      const currentPosition = timeToPosition(activity.startTime);
      const newPosition = Math.max(0, currentPosition - hourHeight); // Переместить на час вверх
      handleDragEnd(newPosition);
    };

    const handleMoveDown = () => {
      const currentPosition = timeToPosition(activity.startTime);
      const dayEnd = timeToPosition('22:00');
      const newPosition = Math.min(
        dayEnd - duration.value, 
        currentPosition + hourHeight
      ); // Переместить на час вниз
      handleDragEnd(newPosition);
    };

    const topPosition = timeToPosition(activity.startTime);
    const height = timeToPosition(activity.endTime) - timeToPosition(activity.startTime);
    
    return (
      <View
        style={[
          styles.activityCard,
          {
            top: topPosition,
            height: Math.max(height, 40), // Минимальная высота
            borderLeftColor: getActivityColor(activity.type),
          },
        ]}
      >
        <TouchableOpacity style={styles.content} onPress={handlePress}>
          <View style={styles.header}>
            <View style={styles.dragHandle}>
              <Text style={styles.dragText}>↕</Text>
              <View style={styles.webMoveButtons}>
                <TouchableOpacity onPress={handleMoveUp} style={styles.moveButton}>
                  <Text style={styles.moveButtonText}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleMoveDown} style={styles.moveButton}>
                  <Text style={styles.moveButtonText}>↓</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                activity.title,
                `${activity.startTime} - ${activity.endTime}\n${activity.location || ''}`,
                [
                  { text: 'Изменить', onPress: () => onPress(activity) },
                  { 
                    text: 'Удалить', 
                    style: 'destructive',
                    onPress: () => onPress(activity)
                  },
                  { text: 'Отмена', style: 'cancel' }
                ]
              );
            }}>
              <Feather name="more-vertical" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.activityTitle} numberOfLines={2}>
            {activity.title}
          </Text>
          <Text style={styles.activityTime}>
            {activity.startTime} - {activity.endTime}
          </Text>
          {activity.location && (
            <Text style={styles.activityLocation} numberOfLines={1}>
              {activity.location}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Для мобильных устройств используем жесты
  const cardStyle = useAnimatedStyle(() => {
    return {
      top: startPosition.value,
      height: duration.value,
      borderLeftColor: getActivityColor(activity.type),
    };
  });
  
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <AnimatedView
        style={[
          styles.activityCard,
          cardStyle,
          animatedStyle,
        ]}
      >
        <TouchableOpacity style={styles.content} onPress={handlePress}>
          <View style={styles.header}>
            <View style={styles.dragHandle}>
              <MaterialIcons name="drag-indicator" size={16} color="#6b7280" />
            </View>
            <TouchableOpacity onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                activity.title,
                `${activity.startTime} - ${activity.endTime}\n${activity.location || ''}`,
                [
                  { text: 'Изменить', onPress: () => onPress(activity) },
                  { 
                    text: 'Удалить', 
                    style: 'destructive',
                    onPress: () => onPress(activity)
                  },
                  { text: 'Отмена', style: 'cancel' }
                ]
              );
            }}>
              <Feather name="more-vertical" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.activityTitle} numberOfLines={2}>
            {activity.title}
          </Text>
          <Text style={styles.activityTime}>
            {activity.startTime} - {activity.endTime}
          </Text>
          {activity.location && (
            <Text style={styles.activityLocation} numberOfLines={1}>
              {activity.location}
            </Text>
          )}
        </TouchableOpacity>
      </AnimatedView>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 0,
    marginVertical: 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHandle: {
    opacity: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragText: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
  },
  webMoveButtons: {
    flexDirection: 'row',
  },
  moveButton: {
    padding: 4,
    marginHorizontal: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  moveButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 'bold',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  activityLocation: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  moreButton: {
    padding: 4,
  },
});