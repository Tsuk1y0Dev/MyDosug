import { StartPoint } from '../types/planner';

export const defaultStartPoints: StartPoint[] = [
  { type: 'home', address: 'ул. Ленина, 25', label: '🏠 Дом' },
  { type: 'work', address: 'ул. Амурская, 50', label: '💼 Работа' },
  { type: 'current', address: '', label: '📍 Текущее местоположение' },
];

