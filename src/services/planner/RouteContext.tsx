import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  DayRouteState,
  RouteEvent,
  RouteOrigin,
  RouteSegment,
  TravelMode,
} from '../../types/route';

interface RouteContextType extends DayRouteState {
  setOrigin: (origin: RouteOrigin) => void;
  setEvents: (events: RouteEvent[]) => void;
  insertEvent: (index: number, event: RouteEvent) => void;
  updateTravelMode: (index: number, mode: TravelMode) => void;
  clearRoute: () => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

type RouteProviderProps = {
  children: ReactNode;
};

// Заглушка для вызова Яндекс API.
// В реальной интеграции здесь должен быть запрос к маршрутизации,
// сейчас логика упрощена и имитирует ответы API.
const mockRouteSegment = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TravelMode
): Omit<RouteSegment, 'fromEventId' | 'toEventId'> => {
  const dx = to.lat - from.lat;
  const dy = to.lng - from.lng;
  const distanceMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * 111000);

  const baseSpeedKmH =
    mode === 'walking' ? 5 : mode === 'driving' ? 40 : 20;

  const durationMinutes = Math.max(
    3,
    Math.min(Math.round((distanceMeters / 1000 / baseSpeedKmH) * 60), 180)
  );

  const polyline = `mock_polyline_${from.lat}_${from.lng}_${to.lat}_${to.lng}_${mode}`;

  return {
    distanceMeters,
    durationMinutes,
    travelMode: mode,
    geometry: { polyline },
  };
};

export const RouteProvider = ({ children }: RouteProviderProps) => {
  const [state, setState] = useState<DayRouteState>({
    origin: null,
    events: [],
    segments: [],
    cachedPolyline: null,
  });

  const recomputeCachedPolyline = useCallback((segments: RouteSegment[]) => {
    if (segments.length === 0) {
      return null;
    }
    // Упрощённая агрегация polyline на день
    return segments.map(s => s.geometry.polyline).join('|');
  }, []);

  const setOrigin = useCallback((origin: RouteOrigin) => {
    setState(prev => {
      const events = prev.events;
      const segments = events.length
        ? events.map((event, index) => {
            if (index === 0) {
              const base = mockRouteSegment(origin.coords, event.coords, 'driving');
              return {
                fromEventId: 'origin',
                toEventId: event.id,
                ...base,
              };
            }
            const from = events[index - 1];
            const base = mockRouteSegment(from.coords, event.coords, event.travelModeToNext);
            return {
              fromEventId: from.id,
              toEventId: event.id,
              ...base,
            };
          })
        : [];

      return {
        ...prev,
        origin,
        segments,
        cachedPolyline: recomputeCachedPolyline(segments),
      };
    });
  }, [recomputeCachedPolyline]);

  const setEvents = useCallback((events: RouteEvent[]) => {
    setState(prev => {
      const segments: RouteSegment[] = [];
      if (prev.origin && events.length) {
        const first = events[0];
        const baseFirst = mockRouteSegment(prev.origin.coords, first.coords, 'driving');
        segments.push({
          fromEventId: 'origin',
          toEventId: first.id,
          ...baseFirst,
        });
      }

      for (let i = 1; i < events.length; i += 1) {
        const from = events[i - 1];
        const to = events[i];
        const base = mockRouteSegment(from.coords, to.coords, from.travelModeToNext);
        segments.push({
          fromEventId: from.id,
          toEventId: to.id,
          ...base,
        });
      }

      return {
        ...prev,
        events,
        segments,
        cachedPolyline: recomputeCachedPolyline(segments),
      };
    });
  }, [recomputeCachedPolyline]);

  const insertEvent = useCallback(
    (index: number, event: RouteEvent) => {
      setState(prev => {
        const events = [...prev.events];
        const safeIndex = Math.max(0, Math.min(index, events.length));
        events.splice(safeIndex, 0, event);

        const segments = [...prev.segments];

        // Пересчитываем только затронутые сегменты (до и после вставки)
        const beforeIndex = safeIndex - 1;

        // Сегмент "до" (origin -> inserted или previous -> inserted)
        if (safeIndex === 0) {
          if (prev.origin && events[0]) {
            const base = mockRouteSegment(prev.origin.coords, events[0].coords, 'driving');
            const segmentIndex = segments.findIndex(s => s.fromEventId === 'origin');
            const segment: RouteSegment = {
              fromEventId: 'origin',
              toEventId: events[0].id,
              ...base,
            };
            if (segmentIndex >= 0) {
              segments[segmentIndex] = segment;
            } else {
              segments.unshift(segment);
            }
          }
        } else if (events[beforeIndex]) {
          const from = events[beforeIndex];
          const to = events[safeIndex];
          const base = mockRouteSegment(from.coords, to.coords, from.travelModeToNext);
          const segmentIndex = segments.findIndex(
            s => s.fromEventId === from.id && s.toEventId === to.id
          );
          const segment: RouteSegment = {
            fromEventId: from.id,
            toEventId: to.id,
            ...base,
          };
          if (segmentIndex >= 0) {
            segments[segmentIndex] = segment;
          } else {
            segments.splice(beforeIndex, 0, segment);
          }
        }

        // Сегмент "после" (inserted -> next)
        const nextIndex = safeIndex + 1;
        if (events[safeIndex] && events[nextIndex]) {
          const from = events[safeIndex];
          const to = events[nextIndex];
          const base = mockRouteSegment(from.coords, to.coords, from.travelModeToNext);
          const segmentIndex = segments.findIndex(
            s => s.fromEventId === from.id && s.toEventId === to.id
          );
          const segment: RouteSegment = {
            fromEventId: from.id,
            toEventId: to.id,
            ...base,
          };
          if (segmentIndex >= 0) {
            segments[segmentIndex] = segment;
          } else {
            segments.splice(safeIndex, 0, segment);
          }
        }

        return {
          ...prev,
          events,
          segments,
          cachedPolyline: recomputeCachedPolyline(segments),
        };
      });
    },
    [recomputeCachedPolyline]
  );

  const updateTravelMode = useCallback(
    (index: number, mode: TravelMode) => {
      setState(prev => {
        if (index < 0 || index >= prev.events.length) {
          return prev;
        }

        const events = [...prev.events];
        events[index] = {
          ...events[index],
          travelModeToNext: mode,
        };

        // Пересчитываем сегменты, начиная с сегмента после изменённого события
        const segments = [...prev.segments];

        for (let i = index; i < events.length; i += 1) {
          const from =
            i === 0 && prev.origin
              ? null
              : events[i - 1] ?? null;
          const to = events[i];

          if (!to) continue;

          const actualFromCoords = from ? from.coords : prev.origin?.coords;
          const segmentMode: TravelMode =
            from === null ? 'driving' : from.travelModeToNext;

          if (!actualFromCoords) continue;

          const base = mockRouteSegment(actualFromCoords, to.coords, segmentMode);

          const fromId = from ? from.id : 'origin';
          const segmentIndex = segments.findIndex(
            s => s.fromEventId === fromId && s.toEventId === to.id
          );

          const segment: RouteSegment = {
            fromEventId: fromId,
            toEventId: to.id,
            ...base,
          };

          if (segmentIndex >= 0) {
            segments[segmentIndex] = segment;
          } else {
            segments.push(segment);
          }
        }

        // Каскадно обновляем времена прибытия, начиная с события index+1
        const updatedEvents = [...events];
        for (let i = index + 1; i < updatedEvents.length; i += 1) {
          const prevEvent = updatedEvents[i - 1];
          const segment = segments.find(
            s => s.fromEventId === prevEvent.id && s.toEventId === updatedEvents[i].id
          );
          if (!segment) continue;

          const [h, m] = prevEvent.arrivalTime.split(':').map(Number);
          const baseMinutes = h * 60 + m;
          const arrivalMinutes = baseMinutes + prevEvent.duration + segment.durationMinutes;
          const newHours = Math.floor(arrivalMinutes / 60) % 24;
          const newMinutes = arrivalMinutes % 60;

          const arrivalTime = `${String(newHours).padStart(2, '0')}:${String(
            newMinutes
          ).padStart(2, '0')}`;

          updatedEvents[i] = {
            ...updatedEvents[i],
            arrivalTime,
          };
        }

        const cachedPolyline = recomputeCachedPolyline(segments);

        return {
          ...prev,
          events: updatedEvents,
          segments,
          cachedPolyline,
        };
      });
    },
    [recomputeCachedPolyline]
  );

  const clearRoute = useCallback(() => {
    setState({
      origin: null,
      events: [],
      segments: [],
      cachedPolyline: null,
    });
  }, []);

  const value: RouteContextType = useMemo(
    () => ({
      ...state,
      setOrigin,
      setEvents,
      insertEvent,
      updateTravelMode,
      clearRoute,
    }),
    [state, setOrigin, setEvents, insertEvent, updateTravelMode, clearRoute]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

export const useRoute = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
};

