import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  PlanningRequest,
  Place,
  PlannedActivity,
  RoutePlan,
  StartPoint,
  ActivityType,
  MoodType,
  CompanyType,
  AdditionalFilters,
} from '../../types/planner';
import { SearchCriteria } from '../../types/searchCriteria';
import { calculateDuration } from '../../types/planner';
import { timeToMinutes, minutesToTime } from '../../utils/timingUtils';

interface PlannerContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  planningRequest: PlanningRequest;
  updatePlanningRequest: (updates: Partial<PlanningRequest>) => void;
  searchResults: Place[];
  filteredResults: Place[];
  selectedPlace: Place | null;
  currentPlan: RoutePlan;
  searchPlaces: () => void;
  selectPlace: (place: Place) => void;
  addToPlan: (place: Place, startTime?: string, endTime?: string) => void;
  removeFromPlan: (activityId: string) => void;
  reorderPlan: (activities: PlannedActivity[]) => void;
  savePlan: (onSaved?: () => void) => void;
  resetPlanner: () => void;
  searchFilters: {
    priceRange: [number, number];
    rating: number;
    distance: number;
  };
  setSearchFilters: (filters: any) => void;
  planningDate: Date;
  searchCriteria: SearchCriteria | null;
  setSearchCriteria: (c: SearchCriteria | null) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const defaultPlanningRequest: PlanningRequest = {
  startTime: '15:00',
  endTime: '16:00',
  startPoint: {
    type: 'current',
    address: '',
    label: 'Текущая позиция',
  } as StartPoint,
  budget: 2000,
  activityType: 'food',
  mood: 'fun',
  company: 'friends',
  filters: {
    wheelchairAccessible: false,
    vegetarian: false,
    outdoor: false,
    freeEntry: false,
    childFriendly: false,
  },
};

const defaultPlan: RoutePlan = {
  id: '',
  activities: [],
  totalDuration: 0,
  totalCost: 0,
  startPoint: {
    type: 'current',
    address: '',
    label: 'Текущая позиция',
  } as StartPoint,
};

type PlannerProviderProps = {
  children: ReactNode;
  initialTimeSlot?: {
    startTime: string;
    endTime: string;
  };
  selectedDate?: Date;
  initialStep?: number;
  initialPlanType?: 'single' | 'chain';
};

export const PlannerProvider = ({
  children,
  initialTimeSlot,
  selectedDate,
  initialStep,
  initialPlanType,
}: PlannerProviderProps) => {
  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);
  const [planningDate] = useState<Date>(selectedDate || new Date());
  const [planningRequest, setPlanningRequest] = useState<PlanningRequest>({
    ...defaultPlanningRequest,
    ...(initialTimeSlot && {
      startTime: initialTimeSlot.startTime,
      endTime: initialTimeSlot.endTime,
    }),
    ...(initialPlanType && {
      planType: initialPlanType,
    }),
  });
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [filteredResults, setFilteredResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentPlan, setCurrentPlan] = useState<RoutePlan>(defaultPlan);
  const [searchFilters, setSearchFilters] = useState({
    priceRange: [1, 4] as [number, number],
    rating: 3.0,
    distance: 5000,
  });
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);

  // Генератор уникальных ID
  const generateUniqueId = useCallback(() => {
    return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Функция для расчета расстояния между двумя точками по координатам (формула гаверсинуса)
  const calculateDistance = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
    const R = 6371; // Радиус Земли в км
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Расстояние в км
    return Math.round(distance * 1000); // Переводим в метры
  }, []);

  // Функция для расчета времени пути между двумя местами
  const calculateTravelTime = useCallback((from: Place, to: Place): number => {
    const distance = calculateDistance(from.coordinates, to.coordinates);
    // Предполагаем среднюю скорость 5 км/ч для пешехода
    const timeInMinutes = Math.round((distance / 5000) * 60);
    return Math.max(5, Math.min(timeInMinutes, 120)); // Минимум 5 минут, максимум 2 часа
  }, [calculateDistance]);

  // Функция для расчета общей продолжительности плана
  const calculateTotalDuration = useCallback((activities: PlannedActivity[]): number => {
    if (activities.length === 0) return 0;
    
    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    
    const startMin = timeToMinutes(firstActivity.startTime);
    const endMin = timeToMinutes(lastActivity.endTime);
    
    return endMin - startMin;
  }, []);

  const updatePlanningRequest = (updates: Partial<PlanningRequest>) => {
    setPlanningRequest(prev => ({ ...prev, ...updates }));
  };

  const searchPlaces = () => {
    if (planningRequest.activityType === 'custom') {
      setCurrentStep(3);
      return;
    }
    setCurrentStep(3);
  };

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
  };

  const addToPlan = (place: Place, customStartTime?: string, customEndTime?: string) => {
    // Проверяем, если выбран тип "одно мероприятие" и уже есть активность
    if (planningRequest.planType === 'single' && currentPlan.activities.length > 0) {
      Alert.alert(
        'Одно мероприятие',
        'Вы выбрали тип "Одно мероприятие". Удалите текущую активность, чтобы добавить новую.',
        [{ text: 'OK' }]
      );
      return null;
    }

    const activities = [...currentPlan.activities];
    const lastActivity = activities[activities.length - 1];
    
    // Вычисляем продолжительность на основе настроек места
    const duration = calculateDuration(
      place.durationSettings, 
      planningRequest.company || 'friends',
      planningRequest.mood || 'fun'
    );

    let startTime: string;
    let travelTimeFromPrevious = 0;

    // Если передано пользовательское время, используем его
    if (customStartTime && customEndTime) {
      startTime = customStartTime;
      
      // Если есть предыдущая активность, рассчитываем время пути
      if (lastActivity) {
        travelTimeFromPrevious = calculateTravelTime(lastActivity.place, place);
      }
      
      const newActivity: PlannedActivity = {
        id: generateUniqueId(),
        place,
        startTime: customStartTime,
        endTime: customEndTime,
        travelTimeFromPrevious,
        order: activities.length,
      };

      const updatedActivities = [...activities, newActivity];
      const totalDuration = calculateTotalDuration(updatedActivities);
      const totalCost = updatedActivities.reduce((total, activity) => {
        return total + (activity.place.averageBill || 0);
      }, 0);

      setCurrentPlan({
        ...currentPlan,
        activities: updatedActivities,
        totalDuration,
        totalCost,
      });

      setSelectedPlace(null);
      return null;
    }

    // Иначе вычисляем автоматически и возвращаем предложенное время
    // Время начала: для первого места - из planningRequest, для последующих - с учетом логистики
    startTime = planningRequest.startTime;

    if (lastActivity) {
      // Рассчитываем время пути от предыдущего места (логистика)
      travelTimeFromPrevious = calculateTravelTime(lastActivity.place, place);
      
      // Время начала = время окончания предыдущей активности + время пути
      const prevMinutes = timeToMinutes(lastActivity.endTime);
      const totalMinutes = prevMinutes + travelTimeFromPrevious;
      startTime = minutesToTime(totalMinutes);
    }

    // Время окончания = время начала + продолжительность (автоматически из настроек места)
    const startMinutes = timeToMinutes(startTime);
    const endTime = minutesToTime(startMinutes + duration);

    // Для одного мероприятия всегда возвращаем предложенное время для модального окна
    // Для цепочки - возвращаем только если это первая активность или пользователь хочет изменить
    if (planningRequest.planType === 'single') {
      return { startTime, endTime, place };
    }

    // Для цепочки: если это первая активность, показываем модальное окно
    // Если уже есть активности, добавляем автоматически без модального окна
    if (activities.length === 0) {
      return { startTime, endTime, place };
    }

    // Для последующих активностей в цепочке добавляем автоматически
    const newActivity: PlannedActivity = {
      id: generateUniqueId(),
      place,
      startTime,
      endTime,
      travelTimeFromPrevious,
      order: activities.length,
    };

    const updatedActivities = [...activities, newActivity];
    const totalDuration = calculateTotalDuration(updatedActivities);
    const totalCost = updatedActivities.reduce((total, activity) => {
      return total + (activity.place.averageBill || 0);
    }, 0);

    setCurrentPlan({
      ...currentPlan,
      activities: updatedActivities,
      totalDuration,
      totalCost,
    });

    setSelectedPlace(null);
    return null;
  };

  const removeFromPlan = (activityId: string) => {
    const updatedActivities = currentPlan.activities.filter(activity => activity.id !== activityId);
    
    let currentTime = planningRequest.startTime;
    const recalculatedActivities = updatedActivities.map((activity, index) => {
      if (index === 0) {
        currentTime = planningRequest.startTime;
      } else {
        const prevActivity = updatedActivities[index - 1];
        const travelTime = calculateTravelTime(prevActivity.place, activity.place);
        const prevMinutes = timeToMinutes(prevActivity.endTime);
        currentTime = minutesToTime(prevMinutes + travelTime);
      }

      const startMinutes = timeToMinutes(currentTime);
      const activityDuration = calculateDuration(
        activity.place.durationSettings,
        planningRequest.company || 'friends',
        planningRequest.mood || 'fun'
      );
      const endTime = minutesToTime(startMinutes + activityDuration);

      return {
        ...activity,
        startTime: currentTime,
        endTime,
        travelTimeFromPrevious: index === 0 ? 0 : calculateTravelTime(updatedActivities[index - 1].place, activity.place),
        order: index,
      };
    });

    const totalDuration = calculateTotalDuration(recalculatedActivities);
    const totalCost = recalculatedActivities.reduce((total, activity) => {
      return total + (activity.place.averageBill || 0);
    }, 0);

    setCurrentPlan({
      ...currentPlan,
      activities: recalculatedActivities,
      totalDuration,
      totalCost,
    });
  };

  const reorderPlan = (activities: PlannedActivity[]) => {
    let currentTime = planningRequest.startTime;
    const recalculatedActivities = activities.map((activity, index) => {
      if (index === 0) {
        currentTime = planningRequest.startTime;
      } else {
        const prevActivity = activities[index - 1];
        const travelTime = calculateTravelTime(prevActivity.place, activity.place);
        const prevMinutes = timeToMinutes(prevActivity.endTime);
        currentTime = minutesToTime(prevMinutes + travelTime);
      }

      const startMinutes = timeToMinutes(currentTime);
      const activityDuration = calculateDuration(
        activity.place.durationSettings,
        planningRequest.company || 'friends',
        planningRequest.mood || 'fun'
      );
      const endTime = minutesToTime(startMinutes + activityDuration);

      return {
        ...activity,
        startTime: currentTime,
        endTime,
        travelTimeFromPrevious: index === 0 ? 0 : calculateTravelTime(activities[index - 1].place, activity.place),
        order: index,
      };
    });

    const totalDuration = calculateTotalDuration(recalculatedActivities);
    const totalCost = recalculatedActivities.reduce((total, activity) => {
      return total + (activity.place.averageBill || 0);
    }, 0);

    setCurrentPlan({
      ...currentPlan,
      activities: recalculatedActivities,
      totalDuration,
      totalCost,
    });
  };

  const savePlan = (onSaved?: () => void) => {
    const planWithId = {
      ...currentPlan,
      id: generateUniqueId(),
    };
    
    console.log('Saving plan:', planWithId);
    
    if (onSaved) {
      onSaved();
    }
    
    resetPlanner();
  };

  const resetPlanner = () => {
    setCurrentStep(1);
    setPlanningRequest({
      ...defaultPlanningRequest,
      ...(initialTimeSlot && {
        startTime: initialTimeSlot.startTime,
        endTime: initialTimeSlot.endTime,
      }),
    });
    setSearchResults([]);
    setFilteredResults([]);
    setSelectedPlace(null);
    setCurrentPlan(defaultPlan);
    setSearchFilters({
      priceRange: [1, 4],
      rating: 3.0,
      distance: 5000,
    });
    setSearchCriteria(null);
  };

  return (
    <PlannerContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        planningRequest,
        updatePlanningRequest,
        searchResults,
        filteredResults,
        selectedPlace,
        currentPlan,
        searchPlaces,
        selectPlace,
        addToPlan,
        removeFromPlan,
        reorderPlan,
        savePlan,
        resetPlanner,
        searchFilters,
        setSearchFilters,
        planningDate,
        searchCriteria,
        setSearchCriteria,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (context === undefined) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};