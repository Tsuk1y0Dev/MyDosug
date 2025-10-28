import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Activity } from '../types/schedule';
import { MaterialIcons, Feather } from '@expo/vector-icons';

interface ActivityBlockProps {
  activity: Activity;
  onPress: (activity: Activity) => void;
  onDrag: (activityId: string, newStartTime: string, newEndTime: string) => void;
  timeToPosition: (time: string) => number;
  positionToTime: (position: number) => string;
  hourHeight: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  activity,
  onPress,
  onDrag,
  timeToPosition,
  positionToTime,
  hourHeight,
}) => {
  const translateY = useSharedValue(0);
  const startPosition = useSharedValue(timeToPosition(activity.startTime));
  const duration = useSharedValue(
    (timeToPosition(activity.endTime) - timeToPosition(activity.startTime))
  );

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      meal: '#10b981',
      custom: '#f59e0b',
      activity: '#3b82f6',
    };
    return colors[type];
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startY: number }) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      const newStartTime = positionToTime(startPosition.value + translateY.value);
      const newEndTime = positionToTime(startPosition.value + translateY.value + duration.value);
      
      runOnJS(onDrag)(activity.id, newStartTime, newEndTime);
      translateY.value = 0;
      startPosition.value = timeToPosition(newStartTime);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handlePress = () => {
    onPress(activity);
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <AnimatedView
        style={[
          styles.activityCard,
          {
            top: startPosition.value,
            height: duration.value,
            borderLeftColor: getActivityColor(activity.type),
          },
          animatedStyle,
        ]}
      >
        <TouchableOpacity style={styles.content} onPress={handlePress}>
          <View style={styles.header}>
            <View style={styles.dragHandle}>
              <MaterialIcons name="drag-indicator" size={16} color="#6b7280" />
            </View>
            <TouchableOpacity>
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
});