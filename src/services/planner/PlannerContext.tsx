import React, { createContext, useState, useContext, ReactNode } from 'react';
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

interface PlannerContextType {
  // Текущее состояние планирования
  currentStep: number;
  setCurrentStep: (step: number) => void;
  
  // Данные запроса
  planningRequest: PlanningRequest;
  updatePlanningRequest: (updates: Partial<PlanningRequest>) => void;
  
  // Результаты поиска
  searchResults: Place[];
  filteredResults: Place[];
  selectedPlace: Place | null;
  
  // Текущий план
  currentPlan: RoutePlan;
  
  // Действия
  searchPlaces: () => void;
  selectPlace: (place: Place) => void;
  addToPlan: (place: Place) => void;
  removeFromPlan: (activityId: string) => void;
  reorderPlan: (activities: PlannedActivity[]) => void;
  savePlan: () => void;
  resetPlanner: () => void;
  
  // Фильтры
  searchFilters: {
    priceRange: [number, number];
    rating: number;
    distance: number;
  };
  setSearchFilters: (filters: any) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

// Начальные значения
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
};

export const PlannerProvider = ({ children }: PlannerProviderProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [planningRequest, setPlanningRequest] = useState<PlanningRequest>(defaultPlanningRequest);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [filteredResults, setFilteredResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentPlan, setCurrentPlan] = useState<RoutePlan>(defaultPlan);
  const [searchFilters, setSearchFilters] = useState({
    priceRange: [1, 4] as [number, number],
    rating: 3.0,
    distance: 5000,
  });

  const updatePlanningRequest = (updates: Partial<PlanningRequest>) => {
    setPlanningRequest(prev => ({ ...prev, ...updates }));
  };

  const searchPlaces = () => {
    // Фильтрация моковых данных по параметрам запроса
    let results = mockPlaces.filter(place => {
      // Фильтр по типу активности
      if (place.type !== planningRequest.activityType) return false;
      
      // Фильтр по бюджету
      const maxPrice = planningRequest.budget;
      if (place.averageBill && place.averageBill > maxPrice) return false;
      
      // Фильтр по дополнительным параметрам
      if (planningRequest.filters.wheelchairAccessible && !place.features.wheelchair) return false;
      if (planningRequest.filters.vegetarian && !place.features.vegetarian) return false;
      if (planningRequest.filters.outdoor && !place.features.outdoor) return false;
      if (planningRequest.filters.childFriendly && !place.features.childFriendly) return false;
      
      // Фильтр по расстоянию
      if (place.distance > searchFilters.distance) return false;
      
      // Фильтр по рейтингу
      if (place.rating < searchFilters.rating) return false;
      
      // Фильтр по ценовому уровню
      if (place.priceLevel < searchFilters.priceRange[0] || place.priceLevel > searchFilters.priceRange[1]) return false;
      
      return true;
    });

    // Сортировка по релевантности (расстояние + рейтинг)
    results.sort((a, b) => {
      const scoreA = (a.rating * 100) - (a.distance / 100);
      const scoreB = (b.rating * 100) - (b.distance / 100);
      return scoreB - scoreA;
    });

    setSearchResults(results);
    setFilteredResults(results);
    setCurrentStep(3); // Переходим к шагу результатов
  };

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
  };

  const addToPlan = (place: Place) => {
    const activities = [...currentPlan.activities];
    const lastActivity = activities[activities.length - 1];
    
    // Расчет времени начала
    let startTime = planningRequest.startTime;
    if (lastActivity) {
      // Время начала = время окончания предыдущей активности + время в пути
      const [prevHours, prevMinutes] = lastActivity.endTime.split(':').map(Number);
      const totalMinutes = prevHours * 60 + prevMinutes + place.travelTime;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Расчет времени окончания
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const endTotalMinutes = startHours * 60 + startMinutes + place.duration;
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    const newActivity: PlannedActivity = {
      id: `${place.id}-${Date.now()}`,
      place,
      startTime,
      endTime,
      travelTimeFromPrevious: lastActivity ? place.travelTime : 0,
      order: activities.length,
    };

    const updatedActivities = [...activities, newActivity];
    const totalDuration = updatedActivities.reduce((total, activity) => {
      const [startH, startM] = activity.startTime.split(':').map(Number);
      const [endH, endM] = activity.endTime.split(':').map(Number);
      return total + (endH * 60 + endM) - (startH * 60 + startM);
    }, 0);

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
    
    // Пересчет времени для оставшихся активностей
    let currentTime = planningRequest.startTime;
    const recalculatedActivities = updatedActivities.map((activity, index) => {
      if (index === 0) {
        currentTime = planningRequest.startTime;
      } else {
        const prevActivity = updatedActivities[index - 1];
        const [prevHours, prevMinutes] = prevActivity.endTime.split(':').map(Number);
        const totalMinutes = prevHours * 60 + prevMinutes + activity.travelTimeFromPrevious;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      const [startHours, startMinutes] = currentTime.split(':').map(Number);
      const endTotalMinutes = startHours * 60 + startMinutes + activity.place.duration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

      return {
        ...activity,
        startTime: currentTime,
        endTime,
        order: index,
      };
    });

    const totalDuration = recalculatedActivities.reduce((total, activity) => {
      const [startH, startM] = activity.startTime.split(':').map(Number);
      const [endH, endM] = activity.endTime.split(':').map(Number);
      return total + (endH * 60 + endM) - (startH * 60 + startM);
    }, 0);

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
    // Пересчет времени при изменении порядка
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
      const endTotalMinutes = startHours * 60 + startMinutes + activity.place.duration;
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

    const totalDuration = recalculatedActivities.reduce((total, activity) => {
      const [startH, startM] = activity.startTime.split(':').map(Number);
      const [endH, endM] = activity.endTime.split(':').map(Number);
      return total + (endH * 60 + endM) - (startH * 60 + startM);
    }, 0);

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

  const calculateTravelTime = (from: Place, to: Place): number => {
    // Упрощенный расчет времени в пути (15 минут + 1 минута на 100 метров)
    const baseTime = 15;
    const distanceTime = Math.ceil(to.distance / 100);
    return baseTime + distanceTime;
  };

  const savePlan = () => {
    // Сохранение плана в хранилище
    const planWithId = {
      ...currentPlan,
      id: `plan-${Date.now()}`,
    };
    
    // Здесь будет логика сохранения в AsyncStorage или отправка на сервер
    console.log('Saving plan:', planWithId);
    
    // Переход на главный экран или экран маршрутов
    resetPlanner();
  };

  const resetPlanner = () => {
    setCurrentStep(1);
    setPlanningRequest(defaultPlanningRequest);
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