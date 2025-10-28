export interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'meal' | 'custom' | 'activity';
  color?: string;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export interface FreeSlot {
  startTime: number; // Изменено на number для позиции
  endTime: number;   // Изменено на number для позиции
  duration: number;
  startTimeString?: string; // Добавлено для временных меток
  endTimeString?: string;   // Добавлено для временных меток
}