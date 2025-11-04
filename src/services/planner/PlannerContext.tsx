import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Alert } from 'react-native'; // Добавьте этот импорт
import { 
  PlanningRequest, 
  Place, 
  PlannedActivity, 
  RoutePlan,
  StartPoint,
  ActivityType,
  MoodType,
  CompanyType,
  AdditionalFilters
} from '../../types/planner';
import { mockPlaces, mockStartPoints } from '../../data/mockPlaces';
import { calculateDuration } from '../../types/planner';

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
  addToPlan: (place: Place) => void;
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
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const defaultPlanningRequest: PlanningRequest = {
  startTime: '15:00',
  endTime: '16:00',
  startPoint: mockStartPoints[0],
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
  startPoint: mockStartPoints[0],
};

type PlannerProviderProps = {
  children: ReactNode;
  initialTimeSlot?: {
    startTime: string;
    endTime: string;
  };
};

export const PlannerProvider = ({ children, initialTimeSlot }: PlannerProviderProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [planningRequest, setPlanningRequest] = useState<PlanningRequest>({
    ...defaultPlanningRequest,
    ...(initialTimeSlot && {
      startTime: initialTimeSlot.startTime,
      endTime: initialTimeSlot.endTime,
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

  // Генератор уникальных ID
  const generateUniqueId = () => {
    return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Вспомогательная функция для преобразования времени в минуты
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Функция для расчета расстояния между двумя точками по координатам
  const calculateDistance = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
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
  };

  // Функция для расчета времени пути между двумя местами
  const calculateTravelTime = (from: Place, to: Place): number => {
    const distance = calculateDistance(from.coordinates, to.coordinates);
    // Предполагаем среднюю скорость 5 км/ч для пешехода
    const timeInMinutes = Math.round((distance / 5000) * 60);
    return Math.max(5, Math.min(timeInMinutes, 120)); // Минимум 5 минут, максимум 2 часа
  };

  // Функция для расчета общей продолжительности плана
  const calculateTotalDuration = (activities: PlannedActivity[]): number => {
    if (activities.length === 0) return 0;
    
    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    
    const [startH, startM] = firstActivity.startTime.split(':').map(Number);
    const [endH, endM] = lastActivity.endTime.split(':').map(Number);
    
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const updatePlanningRequest = (updates: Partial<PlanningRequest>) => {
    setPlanningRequest(prev => ({ ...prev, ...updates }));
  };

  const searchPlaces = () => {
    let results = mockPlaces.filter(place => {
      if (place.type !== planningRequest.activityType) return false;
      
      const maxPrice = planningRequest.budget;
      if (place.averageBill && place.averageBill > maxPrice) return false;
      
      if (planningRequest.filters.wheelchairAccessible && !place.features.wheelchair) return false;
      if (planningRequest.filters.vegetarian && !place.features.vegetarian) return false;
      if (planningRequest.filters.outdoor && !place.features.outdoor) return false;
      if (planningRequest.filters.childFriendly && !place.features.childFriendly) return false;
      
      if (place.distance > searchFilters.distance) return false;
      if (place.rating < searchFilters.rating) return false;
      if (place.priceLevel < searchFilters.priceRange[0] || place.priceLevel > searchFilters.priceRange[1]) return false;
      
      return true;
    });

    results.sort((a, b) => {
      const scoreA = (a.rating * 100) - (a.distance / 100);
      const scoreB = (b.rating * 100) - (b.distance / 100);
      return scoreB - scoreA;
    });

    setSearchResults(results);
    setFilteredResults(results);
    setCurrentStep(3);
  };

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
  };

  const addToPlan = (place: Place) => {
    const activities = [...currentPlan.activities];
    const lastActivity = activities[activities.length - 1];
    
    // Вычисляем продолжительность
    const duration = calculateDuration(
      place.durationSettings, 
      planningRequest.company || 'friends',
      planningRequest.mood || 'fun'
    );

    let startTime = planningRequest.startTime;
    let travelTimeFromPrevious = 0;

    if (lastActivity) {
      // Рассчитываем время пути от предыдущего места
      travelTimeFromPrevious = calculateTravelTime(lastActivity.place, place);
      
      const [prevHours, prevMinutes] = lastActivity.endTime.split(':').map(Number);
      const totalMinutes = prevHours * 60 + prevMinutes + travelTimeFromPrevious;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Проверяем, не пересекается ли с другими активностями в текущем плане
      const endTotalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // Проверяем конфликты только с активностями в текущем плане
      const conflicts = activities.filter((activity: PlannedActivity) => {
        const activityStart = timeToMinutes(activity.startTime);
        const activityEnd = timeToMinutes(activity.endTime);
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);
        
        return (newStart < activityEnd && newEnd > activityStart);
      });
      
      if (conflicts.length > 0) {
        Alert.alert(
          'Конфликт времени',
          `Выбранное время пересекается с существующими активностями в плане. Рекомендуемое время начала: ${startTime}`,
          [{ text: 'OK' }]
        );
      }
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const endTotalMinutes = startHours * 60 + startMinutes + duration;
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

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
        const [prevHours, prevMinutes] = prevActivity.endTime.split(':').map(Number);
        const totalMinutes = prevHours * 60 + prevMinutes + travelTime;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      const [startHours, startMinutes] = currentTime.split(':').map(Number);
      const activityDuration = calculateDuration(
        activity.place.durationSettings,
        planningRequest.company || 'friends',
        planningRequest.mood || 'fun'
      );
      const endTotalMinutes = startHours * 60 + startMinutes + activityDuration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

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
        const [prevHours, prevMinutes] = prevActivity.endTime.split(':').map(Number);
        const totalMinutes = prevHours * 60 + prevMinutes + travelTime;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      const [startHours, startMinutes] = currentTime.split(':').map(Number);
      const activityDuration = calculateDuration(
        activity.place.durationSettings,
        planningRequest.company || 'friends',
        planningRequest.mood || 'fun'
      );
      const endTotalMinutes = startHours * 60 + startMinutes + activityDuration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

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