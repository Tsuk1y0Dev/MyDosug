export interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  /** Координаты для кастомных активностей (карта на главной) */
  coordinates?: { lat: number; lng: number };
  type: 'meal' | 'custom' | 'activity';
  color?: string;
  duration?: number;
  description?: string;
  date?: string; // ISO date string (YYYY-MM-DD)
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export interface FreeSlot {
  startTime: number;
  endTime: number;
  duration: number;
  startTimeString?: string;
  endTimeString?: string;
}

// Новый тип для данных перетаскивания
export interface DragEvent {
  activityId: string;
  newStartTime: string;
  newEndTime: string;
  targetActivityId?: string; // Для обмена с другим блоком
}