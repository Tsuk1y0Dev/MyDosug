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
  removeEvent: (eventId: string) => void;
  updateTravelMode: (index: number, mode: TravelMode) => void;
  clearRoute: () => void;
  pendingInsertIndex: number | null;
  setPendingInsertIndex: (index: number | null) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

type RouteProviderProps = {
  children: ReactNode;
};

const DAY_START_TIME = '09:00';
const DAY_START_MINUTES = 9 * 60;

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

const recomputeArrivalTimes = (
  origin: RouteOrigin | null,
  events: RouteEvent[],
  segments: RouteSegment[]
): RouteEvent[] => {
  if (!events.length) return events;

  let currentMinutes = DAY_START_MINUTES;
  const updated: RouteEvent[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const current = events[i];
    let segment: RouteSegment | undefined;

    if (i === 0) {
      if (origin) {
        segment = segments.find(
          s => s.fromEventId === 'origin' && s.toEventId === current.id
        );
      }
    } else {
      const prev = updated[i - 1];
      const prevRaw = events[i - 1];

      // Добавляем длительность предыдущего события
      currentMinutes += prevRaw.duration;

      segment = segments.find(
        s => s.fromEventId === prev.id && s.toEventId === current.id
      );
    }

    if (segment) {
      currentMinutes += segment.durationMinutes;
    }

    const hours = Math.floor(currentMinutes / 60) % 24;
    const minutes = currentMinutes % 60;
    const arrivalTime = `${String(hours).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}`;

    updated.push({
      ...current,
      arrivalTime,
    });
  }

  return updated;
};

export const RouteProvider = ({ children }: RouteProviderProps) => {
  const [state, setState] = useState<DayRouteState>({
    origin: null,
    events: [],
    segments: [],
    cachedPolyline: null,
  });
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);

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

      const updatedEvents = recomputeArrivalTimes(origin, events, segments);

      return {
        ...prev,
        origin,
        events: updatedEvents,
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

      const updatedEvents = recomputeArrivalTimes(prev.origin, events, segments);

      return {
        ...prev,
        events: updatedEvents,
        segments,
        cachedPolyline: recomputeCachedPolyline(segments),
      };
    });
  }, [recomputeCachedPolyline]);

  const insertEvent = useCallback(
    (index: number, event: RouteEvent) => {
      setState(prev => {
        const currentEvents = [...prev.events];
        const safeIndex = Math.max(0, Math.min(index, currentEvents.length));
        currentEvents.splice(safeIndex, 0, event);

        const segments: RouteSegment[] = [];

        if (prev.origin && currentEvents.length) {
          const first = currentEvents[0];
          const baseFirst = mockRouteSegment(prev.origin.coords, first.coords, 'driving');
          segments.push({
            fromEventId: 'origin',
            toEventId: first.id,
            ...baseFirst,
          });
        }

        for (let i = 1; i < currentEvents.length; i += 1) {
          const from = currentEvents[i - 1];
          const to = currentEvents[i];
          const base = mockRouteSegment(from.coords, to.coords, from.travelModeToNext);
          segments.push({
            fromEventId: from.id,
            toEventId: to.id,
            ...base,
          });
        }

        const updatedEvents = recomputeArrivalTimes(prev.origin, currentEvents, segments);

        return {
          ...prev,
          events: updatedEvents,
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

        // Пересчитываем все сегменты с учётом нового режима
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

        const updatedEvents = recomputeArrivalTimes(prev.origin, events, segments);

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

  const removeEvent = useCallback((eventId: string) => {
    setState(prev => {
      const events = prev.events.filter(e => e.id !== eventId);
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

      const updatedEvents = recomputeArrivalTimes(prev.origin, events, segments);

      return {
        ...prev,
        events: updatedEvents,
        segments,
        cachedPolyline: recomputeCachedPolyline(segments),
      };
    });
  }, [recomputeCachedPolyline]);

  const value: RouteContextType = useMemo(
    () => ({
      ...state,
      setOrigin,
      setEvents,
      insertEvent,
      removeEvent,
      updateTravelMode,
      clearRoute,
      pendingInsertIndex,
      setPendingInsertIndex,
    }),
    [state, setOrigin, setEvents, insertEvent, removeEvent, updateTravelMode, clearRoute, pendingInsertIndex]
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

