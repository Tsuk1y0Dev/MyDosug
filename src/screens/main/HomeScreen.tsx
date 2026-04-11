import React, { useState, useMemo, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Pressable,
	SafeAreaView,
	Modal,
	Dimensions,
	Platform,
	TextInput,
	Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "../../services/planner/RouteContext";
import {
	PlanCalendarPicker,
	startOfLocalDay,
} from "../../components/planner/PlanCalendarPicker";
import { useUser } from "../../context/UserContext";
import { Feather } from "@expo/vector-icons";
import { YandexMap } from "../../components/maps/YandexMap";
import { RouteEvent, TravelMode } from "../../types/route";
import { PlannerModal } from "./PlannerModal";
import {
	timeToMinutes,
	minutesToTime,
	calculateEndTime,
	isSameLocalCalendarDay,
	minutesSinceLocalMidnight,
} from "../../utils/timingUtils";
import { useDeviceCoords } from "../../hooks/useDeviceCoords";
import { useAuth } from "../../services/auth/AuthContext";
import { useFavorites } from "../../services/favorites/FavoritesContext";
import { routeEventToPlace } from "../../utils/placeConverters";

type ViewMode = "split" | "map" | "timeline";

function formatPlanDate(d: Date): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const dNorm = new Date(d);
	dNorm.setHours(0, 0, 0, 0);
	if (dNorm.getTime() === today.getTime()) return "Сегодня";
	if (dNorm.getTime() === tomorrow.getTime()) return "Завтра";
	const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
	const dayName = days[d.getDay()];
	return `${dayName}, ${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatTimelineClock(ts: number): string {
	return new Date(ts * 1000).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export const HomeScreen = () => {
	const {
		origin,
		events,
		segments,
		setOrigin,
		removeEvent,
		setEvents,
		updateEvent,
		updateTravelMode,
		setPendingInsertIndex,
		syncPlanCalendarDay,
	} = useRoute();
	const {
		profile,
		getTimelineEventsByDate,
		deleteTimelineEvent,
		syncRouteDayToTimeline,
	} = useUser();
	const { user } = useAuth();
	const { addFavoritePlace, removeFavoritePlace, isFavorite } = useFavorites();
	const deviceCoords = useDeviceCoords();

	const [viewMode, setViewMode] = useState<ViewMode>("timeline");
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
		null,
	);
	const [routeSummaryVisible, setRouteSummaryVisible] = useState(false);
	const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [calendarVisibleMonth, setCalendarVisibleMonth] = useState(() => {
		const t = startOfLocalDay(new Date());
		return new Date(t.getFullYear(), t.getMonth(), 1);
	});
	const [pickerMinDate, setPickerMinDate] = useState(() =>
		startOfLocalDay(new Date()),
	);

	const openPlanCalendar = () => {
		setPickerMinDate(startOfLocalDay(new Date()));
		setCalendarVisibleMonth(
			new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
		);
		setShowDatePicker(true);
	};

	const plannedDayTimeline = useMemo(
		() => getTimelineEventsByDate(selectedDate),
		[getTimelineEventsByDate, selectedDate.getTime()],
	);

	useEffect(() => {
		syncPlanCalendarDay(selectedDate);
	}, [selectedDate.getTime(), syncPlanCalendarDay]);

	const routeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (!user) return;
		if (routeSyncTimer.current) clearTimeout(routeSyncTimer.current);
		routeSyncTimer.current = setTimeout(() => {
			void syncRouteDayToTimeline(events, selectedDate);
		}, 900);
		return () => {
			if (routeSyncTimer.current) clearTimeout(routeSyncTimer.current);
		};
	}, [events, selectedDate.getTime(), user, syncRouteDayToTimeline]);
	const [plannerVisible, setPlannerVisible] = useState(false);
	const [plannerInitialTimeSlot, setPlannerInitialTimeSlot] = useState<{
		startTime: string;
		endTime: string;
	} | null>(null);
	const [detailEvent, setDetailEvent] = useState<RouteEvent | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editArrival, setEditArrival] = useState("");
	const [editDuration, setEditDuration] = useState("");
	const [detailArrivalPicker, setDetailArrivalPicker] = useState(false);
	const [detailWheelDate, setDetailWheelDate] = useState(() => new Date());

	const MIN_ACTIVITY_DURATION_MIN = 60;
	const DAY_START = "00:00";
	const DAY_END = "23:59";

	const dayFloorMinutes = useMemo(() => {
		return isSameLocalCalendarDay(selectedDate, new Date())
			? minutesSinceLocalMidnight()
			: 0;
	}, [selectedDate.getTime()]);

	const findFirstFreeSlot = (
		list: RouteEvent[],
		minDurationMinutes: number,
		floorMin: number,
	) => {
		const dayStartMin = Math.max(timeToMinutes(DAY_START), floorMin);
		if (list.length === 0) {
			return {
				startTime: minutesToTime(dayStartMin),
				endTime: minutesToTime(dayStartMin + minDurationMinutes),
			};
		}

		const eventsSorted = [...list].sort(
			(a, b) => timeToMinutes(a.arrivalTime) - timeToMinutes(b.arrivalTime),
		);

		let cursor = dayStartMin;
		const dayEndMinutes = timeToMinutes(DAY_END);

		for (const ev of eventsSorted) {
			const evStart = timeToMinutes(ev.arrivalTime);
			if (evStart - cursor >= minDurationMinutes) {
				return {
					startTime: minutesToTime(cursor),
					endTime: minutesToTime(cursor + minDurationMinutes),
				};
			}
			const evEnd = evStart + ev.duration;
			if (evEnd > cursor) cursor = evEnd;
		}

		if (dayEndMinutes - cursor >= minDurationMinutes) {
			return {
				startTime: minutesToTime(cursor),
				endTime: minutesToTime(cursor + minDurationMinutes),
			};
		}

		return {
			startTime: minutesToTime(dayStartMin),
			endTime: minutesToTime(dayStartMin + minDurationMinutes),
		};
	};

	const bumpSlotToDayFloor = (slot: {
		startTime: string;
		endTime: string;
	}) => {
		const floor = dayFloorMinutes;
		const sm = timeToMinutes(slot.startTime);
		if (sm >= floor) return slot;
		return {
			startTime: minutesToTime(floor),
			endTime: minutesToTime(floor + MIN_ACTIVITY_DURATION_MIN),
		};
	};

	const openPlannerWithAutoSlot = (insertIndex: number | null = null) => {
		let slot: { startTime: string; endTime: string };

		if (insertIndex != null && insertIndex > 0 && insertIndex < events.length) {
			const prev = events[insertIndex - 1];
			const next = events[insertIndex];
			const prevStart = timeToMinutes(prev.arrivalTime);
			const prevEnd = prevStart + prev.duration;
			const nextStart = timeToMinutes(next.arrivalTime);
			const gap = nextStart - prevEnd;

			if (gap >= MIN_ACTIVITY_DURATION_MIN) {
				slot = bumpSlotToDayFloor({
					startTime: minutesToTime(prevEnd),
					endTime: minutesToTime(prevEnd + MIN_ACTIVITY_DURATION_MIN),
				});
			} else {
				slot = bumpSlotToDayFloor(
					findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN, dayFloorMinutes),
				);
			}
		} else if (
			insertIndex != null &&
			insertIndex === events.length &&
			events.length > 0
		) {
			const last = events[events.length - 1];
			const lastStart = timeToMinutes(last.arrivalTime);
			const lastEnd = lastStart + last.duration;
			const dayEndMinutes = timeToMinutes(DAY_END);
			const gap = dayEndMinutes - lastEnd;

			if (gap >= MIN_ACTIVITY_DURATION_MIN) {
				slot = bumpSlotToDayFloor({
					startTime: minutesToTime(lastEnd),
					endTime: minutesToTime(lastEnd + MIN_ACTIVITY_DURATION_MIN),
				});
			} else {
				slot = bumpSlotToDayFloor(
					findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN, dayFloorMinutes),
				);
			}
		} else {
			slot = bumpSlotToDayFloor(
				findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN, dayFloorMinutes),
			);
		}

		if (insertIndex != null) {
			setPendingInsertIndex(insertIndex);
		} else {
			setPendingInsertIndex(events.length);
		}

		setPlannerInitialTimeSlot(slot);
		setPlannerVisible(true);
	};

	// Центр карты: сначала GPS, иначе первая точка плана (без Читы).
	useEffect(() => {
		if (deviceCoords) {
			setMapCenter(deviceCoords);
			return;
		}
		if (events.length > 0) {
			setMapCenter(events[0].coords);
		}
	}, [deviceCoords, events]);

	// Старт маршрута: только GPS или сохранённые «дом/работа» из профиля — без запасной Читы.
	useEffect(() => {
		if (events.length > 0) return;
		if (origin?.id === "from_first_stop") return;

		const coordsEqual = (
			a: { lat: number; lng: number },
			b: { lat: number; lng: number },
		) => Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;

		const startPoint = profile?.defaultStartPoint;

		if (!startPoint) {
			if (deviceCoords) {
				const next = {
					id: "default" as const,
					label: "Вы здесь",
					coords: deviceCoords,
				};
				if (
					origin &&
					origin.id === next.id &&
					coordsEqual(origin.coords, next.coords)
				) {
					return;
				}
				setOrigin(next);
			} else if (origin) {
				setOrigin(null);
			}
			return;
		}

		if (startPoint.type === "current") {
			if (deviceCoords) {
				const next = {
					id: "profile_origin" as const,
					label: "Вы здесь",
					coords: deviceCoords,
				};
				if (
					origin &&
					origin.id === next.id &&
					coordsEqual(origin.coords, next.coords)
				) {
					return;
				}
				setOrigin(next);
			} else if (origin) {
				setOrigin(null);
			}
			return;
		}

		const fromSaved = profile?.savedLocations?.find(
			(l) =>
				(l.type === "home" && startPoint.type === "home") ||
				(l.type === "office" && startPoint.type === "work"),
		)?.coords;
		const nextCoords = startPoint.coordinates ?? fromSaved;
		if (!nextCoords) {
			if (origin) setOrigin(null);
			return;
		}

		const next = {
			id: "profile_origin" as const,
			label: startPoint.label || "Старт",
			coords: nextCoords,
		};
		if (
			origin &&
			origin.id === next.id &&
			origin.label === next.label &&
			coordsEqual(origin.coords, next.coords)
		) {
			return;
		}
		setOrigin(next);
	}, [profile, deviceCoords, setOrigin, events.length, origin]);

	const openEventDetail = (event: RouteEvent) => {
		setEditTitle(event.customTitle || "");
		setEditArrival(event.arrivalTime);
		setEditDuration(String(event.duration));
		setDetailArrivalPicker(false);
		setDetailEvent(event);
	};

	const saveDetailEvent = () => {
		if (!detailEvent) return;
		const dur = parseInt(editDuration.replace(/\D/g, ""), 10);
		if (!Number.isFinite(dur) || dur < 1) return;
		let t = editArrival.trim();
		if (!/^\d{1,2}:\d{2}$/.test(t)) return;
		const [h, m] = t.split(":").map(Number);
		if (h > 23 || m > 59) return;
		t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		const arrivalMin = timeToMinutes(t);
		const floor = isSameLocalCalendarDay(selectedDate, new Date())
			? minutesSinceLocalMidnight()
			: 0;
		if (arrivalMin < floor) {
			Alert.alert(
				"Время",
				`Для этого дня нельзя выбрать время раньше ${minutesToTime(floor)}.`,
			);
			return;
		}
		const idx = events.findIndex((e) => e.id === detailEvent.id);
		if (idx > 0) {
			const prev = events[idx - 1];
			const prevEnd = timeToMinutes(prev.arrivalTime) + prev.duration;
			if (arrivalMin < prevEnd) {
				Alert.alert(
					"Порядок точек",
					`Прибытие не раньше окончания предыдущей точки (${minutesToTime(prevEnd)}).`,
				);
				return;
			}
		}
		updateEvent(detailEvent.id, {
			customTitle: editTitle.trim() || undefined,
			arrivalTime: t,
			duration: Math.min(24 * 60, dur),
			lockTimes: true,
		});
		setDetailEvent(null);
	};

	const toggleDetailFavorite = () => {
		if (!detailEvent) return;
		if (!user) {
			Alert.alert("Вход", "Войдите в аккаунт, чтобы сохранять места в избранное.");
			return;
		}
		const pid = detailEvent.placeId || detailEvent.id;
		if (isFavorite(pid)) {
			removeFavoritePlace(pid);
		} else {
			addFavoritePlace(routeEventToPlace(detailEvent));
		}
	};

	// Маркеры для карты: события с порядковыми номерами
	const mapMarkers = useMemo(
		() =>
			events.map((e, i) => ({
				id: e.id,
				lat: e.coords.lat,
				lng: e.coords.lng,
				title: e.customTitle || `Точка ${i + 1}`,
			})),
		[events],
	);

	// Линии маршрута между точками (origin -> event0 -> event1 -> ...)
	const segmentLines = useMemo(() => {
		const lines: Array<{
			from: { lat: number; lng: number };
			to: { lat: number; lng: number };
		}> = [];
		const useOriginLeg =
			origin != null && origin.id !== "from_first_stop" && events.length > 0;
		if (useOriginLeg && origin) {
			lines.push({ from: origin.coords, to: events[0].coords });
		}
		for (let i = 0; i < events.length - 1; i++) {
			lines.push({ from: events[i].coords, to: events[i + 1].coords });
		}
		return lines;
	}, [origin, events]);

	const totalDistance = useMemo(
		() => segments.reduce((sum, s) => sum + s.distanceMeters, 0),
		[segments],
	);
	const totalTravelMinutes = useMemo(
		() => segments.reduce((sum, s) => sum + s.durationMinutes, 0),
		[segments],
	);
	const totalActivityMinutes = useMemo(
		() => events.reduce((sum, e) => sum + e.duration, 0),
		[events],
	);

	const handleAddBetween = (index: number) => {
		openPlannerWithAutoSlot(index);
	};

	const cycleTravelMode = (eventIndex: number) => {
		const modes: TravelMode[] = ["walking", "driving", "transit"];
		const current = events[eventIndex]?.travelModeToNext ?? "driving";
		const next = modes[(modes.indexOf(current) + 1) % modes.length];
		updateTravelMode(eventIndex, next);
	};

	const travelModeIcon = (mode: TravelMode): keyof typeof Feather.glyphMap => {
		switch (mode) {
			case "walking":
				return "user";
			case "driving":
				return "navigation";
			case "transit":
				return "layers";
			default:
				return "circle";
		}
	};

	const travelModeLabel = (mode: TravelMode) => {
		switch (mode) {
			case "walking":
				return "Пешком";
			case "driving":
				return "Авто";
			case "transit":
				return "Транспорт";
			default:
				return mode;
		}
	};

	const detailInboundLeg = useMemo(() => {
		if (!detailEvent) return null;
		const seg = segments.find((s) => s.toEventId === detailEvent.id);
		if (!seg) return null;
		if (seg.fromEventId === "origin") {
			return {
				fromLabel: origin?.label ?? "Старт маршрута",
				minutes: seg.durationMinutes,
				km: (seg.distanceMeters / 1000).toFixed(1),
				mode: seg.travelMode as TravelMode,
			};
		}
		const fromEv = events.find((e) => e.id === seg.fromEventId);
		return {
			fromLabel: fromEv?.customTitle ?? "Предыдущая точка",
			minutes: seg.durationMinutes,
			km: (seg.distanceMeters / 1000).toFixed(1),
			mode: seg.travelMode as TravelMode,
		};
	}, [detailEvent, segments, events, origin]);

	const mapViewCenter =
		mapCenter ??
		deviceCoords ??
		(events[0]?.coords ?? { lat: 55.75, lng: 37.62 });

	const mapSection = (
		<View style={styles.mapWrapper}>
			<YandexMap
				center={mapViewCenter}
				zoom={14}
				markers={mapMarkers}
				userLocation={
					deviceCoords
						? { lat: deviceCoords.lat, lng: deviceCoords.lng }
						: undefined
				}
				origin={
					origin && origin.id !== "from_first_stop"
						? {
								lat: origin.coords.lat,
								lng: origin.coords.lng,
								label: origin.label,
							}
						: undefined
				}
				segmentLines={segmentLines}
				routingEnabled={true}
				onMarkerPress={(id) => {
					const ev = events.find((e) => e.id === id);
					if (ev) setMapCenter(ev.coords);
				}}
				height={
					viewMode === "map" ? Dimensions.get("window").height - 120 : 240
				}
				fitAllMarkers={true}
			/>
		</View>
	);

	const segmentBetween = (fromIndex: number) => {
		const seg = segments.find(
			(s) =>
				s.fromEventId === events[fromIndex]?.id &&
				s.toEventId === events[fromIndex + 1]?.id,
		);
		if (!seg) return null;
		const km = (seg.distanceMeters / 1000).toFixed(1);
		return (
			<View style={styles.legRow}>
				<View style={styles.legLine} />
				<View style={styles.legContent}>
					<Text style={styles.legText}>
						{seg.durationMinutes} мин • {km} км
					</Text>
					<TouchableOpacity
						style={styles.legModeButton}
						onPress={() => cycleTravelMode(fromIndex)}
					>
						<Feather
							name={travelModeIcon(seg.travelMode)}
							size={16}
							color="#3b82f6"
						/>
						<Text style={styles.legModeText}>
							{travelModeLabel(seg.travelMode)}
						</Text>
					</TouchableOpacity>
				</View>
				<TouchableOpacity
					style={styles.addBetweenButton}
					onPress={() => handleAddBetween(fromIndex + 1)}
				>
					<Feather name="plus" size={18} color="#3b82f6" />
				</TouchableOpacity>
			</View>
		);
	};

	const timelineSection = (
		<ScrollView
			style={styles.timelineScroll}
			contentContainerStyle={styles.timelineContent}
			showsVerticalScrollIndicator={false}
		>
			{plannedDayTimeline.length > 0 ? (
				<View style={styles.serverTimelineBlock}>
					<Text style={styles.serverTimelineHeading}>События дня</Text>
					<Text style={styles.serverTimelineHint}>
						Из профиля (сервер). Маршрут ниже — локальный план.
					</Text>
					{plannedDayTimeline.map((ev) => (
						<View
							key={`${ev.id}_${ev.timestamp}`}
							style={styles.serverTimelineRow}
						>
							<View style={styles.serverTimelineTimeCol}>
								<Text style={styles.serverTimelineTime}>
									{formatTimelineClock(ev.timestamp)}
								</Text>
								{typeof ev.duration === "number" ? (
									<Text style={styles.serverTimelineDur}>
										{ev.duration} мин
									</Text>
								) : null}
							</View>
							<View style={styles.serverTimelineMain}>
								<Text
									style={styles.serverTimelineTitle}
									numberOfLines={2}
									ellipsizeMode="tail"
								>
									{ev.title}
								</Text>
								{ev.note ? (
									<Text
										style={styles.serverTimelineNote}
										numberOfLines={2}
										ellipsizeMode="tail"
									>
										{ev.note}
									</Text>
								) : null}
								<Text style={styles.serverTimelineId} numberOfLines={1}>
									{ev.id}
								</Text>
							</View>
							<TouchableOpacity
								style={styles.serverTimelineDelete}
								onPress={() => void deleteTimelineEvent(ev.timestamp, ev.id)}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
							>
								<Feather name="trash-2" size={18} color="#ef4444" />
							</TouchableOpacity>
						</View>
					))}
				</View>
			) : null}
			{events.length === 0 && (
				<View style={styles.emptyTimeline}>
					<Feather name="map-pin" size={48} color="#d1d5db" />
					<Text style={styles.emptyTitle}>Маршрут пуст</Text>
					<Text style={styles.emptySubtitle}>Начните план на сегодня</Text>
					<TouchableOpacity
						style={styles.planDayButton}
						onPress={() => openPlannerWithAutoSlot(0)}
					>
						<Feather name="plus-circle" size={18} color="white" />
						<Text style={styles.planDayButtonText}>Спланировать сегодня</Text>
					</TouchableOpacity>
				</View>
			)}
			{events.map((event, index) => (
				<React.Fragment key={event.id}>
					<View style={styles.eventCard}>
						<View style={styles.eventDragRow}>
							<View style={styles.eventTimeBlock}>
								<Text style={styles.eventTime}>{event.arrivalTime}</Text>
								<Text style={styles.eventDuration}>{event.duration} мин</Text>
							</View>
							<View style={styles.eventReorderButtons}>
								<TouchableOpacity
									style={[
										styles.reorderBtn,
										index === 0 && styles.reorderBtnDisabled,
									]}
									onPress={() => {
										if (index > 0) {
											const next = [...events];
											[next[index - 1], next[index]] = [
												next[index],
												next[index - 1],
											];
											setEvents(next);
										}
									}}
									disabled={index === 0}
								>
									<Feather
										name="chevron-up"
										size={18}
										color={index === 0 ? "#d1d5db" : "#374151"}
									/>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.reorderBtn,
										index === events.length - 1 && styles.reorderBtnDisabled,
									]}
									onPress={() => {
										if (index < events.length - 1) {
											const next = [...events];
											[next[index], next[index + 1]] = [
												next[index + 1],
												next[index],
											];
											setEvents(next);
										}
									}}
									disabled={index === events.length - 1}
								>
									<Feather
										name="chevron-down"
										size={18}
										color={index === events.length - 1 ? "#d1d5db" : "#374151"}
									/>
								</TouchableOpacity>
							</View>
						</View>
						<TouchableOpacity
							style={styles.eventBodyTouch}
							onPress={() => openEventDetail(event)}
							activeOpacity={0.8}
						>
							<View style={styles.eventBody}>
								<Text
									style={styles.eventTitle}
									numberOfLines={1}
									ellipsizeMode="tail"
								>
									{event.customTitle || `Точка ${index + 1}`}
								</Text>
								<Text style={styles.eventCategory} numberOfLines={1}>
									Досуг
								</Text>
							</View>
						</TouchableOpacity>
						<View style={styles.eventActions}>
							<TouchableOpacity
								style={styles.editEventButton}
								onPress={() => openEventDetail(event)}
							>
								<Feather name="edit-2" size={18} color="#3b82f6" />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.deleteEventButton}
								onPress={() => removeEvent(event.id)}
							>
								<Feather name="trash-2" size={18} color="#ef4444" />
							</TouchableOpacity>
						</View>
					</View>
					{index < events.length - 1 && segmentBetween(index)}
				</React.Fragment>
			))}
		</ScrollView>
	);

	return (
		<SafeAreaView style={styles.container}>
			{/* Выбор даты плана */}
			<View style={styles.dateRow}>
				<Text style={styles.dateRowLabel}>План на</Text>
				<TouchableOpacity
					style={styles.dateChip}
					onPress={openPlanCalendar}
				>
					<Feather name="calendar" size={18} color="#3b82f6" />
					<Text
						style={styles.dateChipText}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{formatPlanDate(selectedDate)}
					</Text>
					<Feather name="chevron-down" size={16} color="#6b7280" />
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.planDayButton}
					onPress={() => setPlannerVisible(true)}
				>
					<Feather name="plus-circle" size={18} color="white" />
					<Text style={styles.planDayButtonText} numberOfLines={1}>
						Спланировать
					</Text>
				</TouchableOpacity>
			</View>
			{showDatePicker && (
				<Modal
					transparent
					animationType="fade"
					visible={showDatePicker}
					onRequestClose={() => setShowDatePicker(false)}
				>
					<View style={styles.datePickerOverlay}>
						<Pressable
							style={StyleSheet.absoluteFillObject}
							onPress={() => setShowDatePicker(false)}
						/>
						<View style={styles.datePickerCard}>
							<Text style={styles.datePickerTitle}>Календарь</Text>
							<Text style={styles.datePickerSubtitle}>
								Выберите день плана (не раньше сегодня)
							</Text>
							<PlanCalendarPicker
								selectedDate={selectedDate}
								visibleMonth={calendarVisibleMonth}
								minDate={pickerMinDate}
								onSelectDay={(d) => {
									setSelectedDate(d);
									setShowDatePicker(false);
								}}
								onPrevMonth={() =>
									setCalendarVisibleMonth(
										(m) =>
											new Date(m.getFullYear(), m.getMonth() - 1, 1),
									)
								}
								onNextMonth={() =>
									setCalendarVisibleMonth(
										(m) =>
											new Date(m.getFullYear(), m.getMonth() + 1, 1),
									)
								}
							/>
							<TouchableOpacity
								style={styles.datePickerDone}
								onPress={() => setShowDatePicker(false)}
							>
								<Text style={styles.datePickerDoneText}>Закрыть</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}

			{/* Переключатель режимов */}
			<View style={styles.header}>
				<View style={styles.segmentedControl}>
					{(["split", "map", "timeline"] as const).map((mode) => (
						<TouchableOpacity
							key={mode}
							style={[
								styles.segmentButton,
								viewMode === mode && styles.segmentButtonActive,
							]}
							onPress={() => setViewMode(mode)}
						>
							<Feather
								name={
									mode === "split" ? "layout" : mode === "map" ? "map" : "list"
								}
								size={18}
								color={viewMode === mode ? "#fff" : "#6b7280"}
							/>
							<Text
								style={[
									styles.segmentLabel,
									viewMode === mode && styles.segmentLabelActive,
								]}
								numberOfLines={1}
								ellipsizeMode="tail"
							>
								{mode === "split"
									? "50/50"
									: mode === "map"
										? "Карта"
										: "Список"}
							</Text>
						</TouchableOpacity>
					))}
				</View>
				<TouchableOpacity
					style={styles.routeSummaryButton}
					onPress={() => setRouteSummaryVisible(true)}
				>
					<Feather name="bar-chart-2" size={18} color="#3b82f6" />
					<Text
						style={styles.routeSummaryButtonText}
						numberOfLines={1}
					>
						Маршрут
					</Text>
				</TouchableOpacity>
			</View>

			{/* Контент */}
			{viewMode === "split" && (
				<View style={styles.splitContainer}>
					{mapSection}
					{timelineSection}
				</View>
			)}
			{viewMode === "map" && (
				<View style={styles.fullMapContainer}>
					{mapSection}
					<TouchableOpacity
						style={styles.showListFloatingButton}
						onPress={() => setViewMode("timeline")}
					>
						<Feather name="list" size={22} color="#374151" />
						<Text style={styles.showListFloatingText}>Список</Text>
					</TouchableOpacity>
				</View>
			)}
			{viewMode === "timeline" && (
				<View style={styles.fullTimelineContainer}>
					{timelineSection}
					<TouchableOpacity
						style={styles.showMapFloatingButton}
						onPress={() => setViewMode("map")}
					>
						<Feather name="map" size={22} color="#374151" />
						<Text style={styles.showListFloatingText}>Карта</Text>
					</TouchableOpacity>
				</View>
			)}

			{viewMode === "split" && (
				<TouchableOpacity
					style={styles.fab}
					onPress={() => openPlannerWithAutoSlot()}
				>
					<Feather name="plus" size={24} color="white" />
				</TouchableOpacity>
			)}

			<PlannerModal
				visible={plannerVisible}
				onClose={() => {
					setPlannerVisible(false);
					setPlannerInitialTimeSlot(null);
				}}
				initialTimeSlot={plannerInitialTimeSlot || undefined}
				initialStep={plannerInitialTimeSlot ? 2 : undefined}
				initialPlanType={plannerInitialTimeSlot ? "single" : undefined}
				selectedDate={selectedDate}
			/>

			<Modal
				visible={detailEvent != null}
				transparent
				animationType="fade"
				onRequestClose={() => setDetailEvent(null)}
			>
				<View style={styles.modalOverlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => setDetailEvent(null)}
					/>
					<ScrollView
						style={styles.detailScroll}
						contentContainerStyle={styles.detailScrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						nestedScrollEnabled
					>
						<TouchableOpacity
							style={styles.editEventCard}
							activeOpacity={1}
							onPress={() => {}}
						>
							<Text style={styles.modalTitle}>Место в маршруте</Text>
							{detailEvent ? (
								<>
									<Text style={styles.detailOrderHint}>
										Точка{" "}
										{events.findIndex((e) => e.id === detailEvent.id) + 1} из{" "}
										{events.length}
									</Text>
									<Text style={styles.detailSectionLabel}>Координаты</Text>
									<Text style={styles.detailBodyText}>
										{detailEvent.coords.lat.toFixed(5)},{" "}
										{detailEvent.coords.lng.toFixed(5)}
									</Text>
									{detailEvent.address ? (
										<>
											<Text style={styles.detailSectionLabel}>Адрес</Text>
											<Text style={styles.detailBodyText}>
												{detailEvent.address}
											</Text>
										</>
									) : null}
									{detailEvent.description ? (
										<>
											<Text style={styles.detailSectionLabel}>Описание</Text>
											<Text style={styles.detailBodyText}>
												{detailEvent.description}
											</Text>
										</>
									) : null}
									<Text style={styles.detailSectionLabel}>Часы работы</Text>
									<Text style={styles.detailBodyText}>
										{detailEvent.openingHours?.trim() ||
											"Не нашли время работы"}
									</Text>
									<Text style={styles.detailSectionLabel}>Бюджет</Text>
									<Text style={styles.detailBodyText}>
										{detailEvent.budgetNote?.trim() ||
											"Не нашли информацию о бюджете"}
									</Text>
									<Text style={styles.detailSectionLabel}>В плане сейчас</Text>
									<Text style={styles.detailBodyText}>
										Прибытие {detailEvent.arrivalTime}, убытие{" "}
										{calculateEndTime(
											detailEvent.arrivalTime,
											detailEvent.duration,
										)}
										{" · "}
										на месте {detailEvent.duration} мин
									</Text>
									{detailInboundLeg ? (
										<>
											<Text style={styles.detailSectionLabel}>
												Дорога до этой точки
											</Text>
											<Text style={styles.detailBodyText}>
												От «{detailInboundLeg.fromLabel}»: ~
												{detailInboundLeg.minutes} мин,{" "}
												{detailInboundLeg.km} км (
												{travelModeLabel(detailInboundLeg.mode)})
											</Text>
										</>
									) : null}
									{detailEvent.placeId ? (
										<>
											<Text style={styles.detailSectionLabel}>ID в данных</Text>
											<Text style={styles.detailMono}>{detailEvent.placeId}</Text>
										</>
									) : null}
								</>
							) : null}
							<TouchableOpacity
								style={styles.favRow}
								onPress={toggleDetailFavorite}
							>
								<Feather
									name="heart"
									size={22}
									color={
										detailEvent &&
										isFavorite(detailEvent.placeId || detailEvent.id)
											? "#ef4444"
											: "#cbd5e1"
									}
								/>
								<Text style={styles.favRowText}>
									{detailEvent &&
									isFavorite(detailEvent.placeId || detailEvent.id)
										? "В избранном"
										: "В избранное"}
								</Text>
							</TouchableOpacity>
							<Text style={styles.editLabel}>Название</Text>
							<TextInput
								style={styles.editInput}
								value={editTitle}
								onChangeText={setEditTitle}
								placeholder="Название"
							/>
							<Text style={styles.editLabel}>Прибытие (ЧЧ:ММ)</Text>
							<TextInput
								style={styles.editInput}
								value={editArrival}
								onChangeText={setEditArrival}
								placeholder="09:30"
							/>
							<View style={styles.detailTimeChips}>
								{detailEvent ? (
									<>
										<TouchableOpacity
											style={styles.detailTimeChip}
											onPress={() => {
												const i = events.findIndex((e) => e.id === detailEvent.id);
												const floor =
													isSameLocalCalendarDay(selectedDate, new Date())
														? minutesSinceLocalMidnight()
														: 0;
												const afterPrev =
													i > 0
														? timeToMinutes(events[i - 1].arrivalTime) +
															events[i - 1].duration
														: floor;
												const m = Math.max(floor, afterPrev);
												setEditArrival(minutesToTime(m));
											}}
										>
											<Text style={styles.detailTimeChipText}>Мин. допустимое</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.detailTimeChip}
											onPress={() => {
												const [hh, mm] = editArrival.split(":").map(Number);
												const d = new Date();
												d.setHours(
													Number.isFinite(hh) ? hh : 12,
													Number.isFinite(mm) ? mm : 0,
													0,
													0,
												);
												setDetailWheelDate(d);
												setDetailArrivalPicker((v) => !v);
											}}
										>
											<Feather name="clock" size={16} color="#1d4ed8" />
											<Text style={styles.detailTimeChipText}>На часах</Text>
										</TouchableOpacity>
									</>
								) : null}
							</View>
							{detailArrivalPicker ? (
								<DateTimePicker
									value={detailWheelDate}
									mode="time"
									is24Hour
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={(ev, date) => {
										if (Platform.OS === "android") {
											setDetailArrivalPicker(false);
										}
										if (
											ev &&
											"type" in ev &&
											(ev as { type?: string }).type === "dismissed"
										) {
											return;
										}
										if (!date) return;
										setDetailWheelDate(date);
										const hh = String(date.getHours()).padStart(2, "0");
										const mm = String(date.getMinutes()).padStart(2, "0");
										setEditArrival(`${hh}:${mm}`);
									}}
								/>
							) : null}
							<Text style={styles.editLabel}>Пребывание (мин)</Text>
							<TextInput
								style={styles.editInput}
								value={editDuration}
								onChangeText={setEditDuration}
								keyboardType="number-pad"
							/>
							<View style={styles.editRow}>
								<TouchableOpacity
									style={styles.editCancelBtn}
									onPress={() => setDetailEvent(null)}
								>
									<Text style={styles.editCancelText}>Закрыть</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.editSaveBtn}
									onPress={saveDetailEvent}
								>
									<Text style={styles.editSaveText}>Сохранить</Text>
								</TouchableOpacity>
							</View>
						</TouchableOpacity>
					</ScrollView>
				</View>
			</Modal>

			{/* Модальное окно сводки маршрута */}
			<Modal
				visible={routeSummaryVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setRouteSummaryVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => setRouteSummaryVisible(false)}
					/>
					<ScrollView
						style={styles.routeSummaryScroll}
						contentContainerStyle={styles.routeSummaryScrollContent}
						keyboardShouldPersistTaps="handled"
					>
						<TouchableOpacity
							style={styles.modalCard}
							activeOpacity={1}
							onPress={() => {}}
						>
						<Text style={styles.modalTitle}>Сводка маршрута</Text>
						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>Точек:</Text>
							<Text style={styles.modalValue}>{events.length}</Text>
						</View>
						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>В пути:</Text>
							<Text style={styles.modalValue}>
								{Math.floor(totalTravelMinutes / 60)} ч{" "}
								{totalTravelMinutes % 60} мин
							</Text>
						</View>
						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>На месте:</Text>
							<Text style={styles.modalValue}>
								{Math.floor(totalActivityMinutes / 60)} ч{" "}
								{totalActivityMinutes % 60} мин
							</Text>
						</View>
						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>Расстояние:</Text>
							<Text style={styles.modalValue}>
								{totalDistance >= 1000
									? `${(totalDistance / 1000).toFixed(1)} км`
									: `${totalDistance} м`}
							</Text>
						</View>
						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>Бюджет:</Text>
							<Text style={styles.modalValue}>—</Text>
						</View>
						<TouchableOpacity
							style={styles.modalCloseButton}
							onPress={() => setRouteSummaryVisible(false)}
						>
							<Text style={styles.modalCloseText}>Закрыть</Text>
						</TouchableOpacity>
						</TouchableOpacity>
					</ScrollView>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	dateRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		gap: 10,
	},
	dateRowLabel: {
		fontSize: 14,
		color: "#6b7280",
		flexShrink: 0,
	},
	dateChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "#eff6ff",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#bfdbfe",
		flexGrow: 0,
		flexShrink: 1,
		minWidth: 120,
		maxWidth: "62%",
	},
	dateChipText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1d4ed8",
		flexShrink: 1,
		minWidth: 0,
	},
	planDayButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "#3b82f6",
		borderRadius: 20,
		flexShrink: 0,
	},
	planDayButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "white",
	},
	datePickerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	datePickerCard: {
		backgroundColor: "white",
		borderRadius: 20,
		padding: 20,
		width: "100%",
		maxWidth: 360,
		zIndex: 2,
		elevation: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 24,
	},
	datePickerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 4,
		textAlign: "center",
	},
	datePickerSubtitle: {
		fontSize: 13,
		color: "#64748b",
		textAlign: "center",
		marginBottom: 8,
		lineHeight: 18,
		paddingHorizontal: 8,
	},
	serverTimelineBlock: {
		marginBottom: 16,
		padding: 14,
		backgroundColor: "#f0fdf4",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#bbf7d0",
	},
	serverTimelineHeading: {
		fontSize: 15,
		fontWeight: "700",
		color: "#166534",
		marginBottom: 4,
	},
	serverTimelineHint: {
		fontSize: 12,
		color: "#15803d",
		marginBottom: 10,
	},
	serverTimelineRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: "#d1fae5",
	},
	serverTimelineTimeCol: {
		width: 52,
		marginRight: 10,
	},
	serverTimelineTime: {
		fontSize: 14,
		fontWeight: "700",
		color: "#14532d",
	},
	serverTimelineDur: {
		fontSize: 11,
		color: "#166534",
		marginTop: 2,
	},
	serverTimelineMain: {
		flex: 1,
		minWidth: 0,
	},
	serverTimelineTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#14532d",
		flexShrink: 1,
	},
	serverTimelineNote: {
		fontSize: 13,
		color: "#166534",
		marginTop: 2,
		flexShrink: 1,
	},
	serverTimelineId: {
		fontSize: 11,
		color: "#86efac",
		marginTop: 4,
	},
	serverTimelineDelete: {
		padding: 4,
		marginLeft: 4,
	},
	datePickerDone: {
		marginTop: 20,
		backgroundColor: "#1e293b",
		paddingVertical: 14,
		borderRadius: 14,
		alignItems: "center",
	},
	datePickerDoneText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		gap: 8,
	},
	segmentedControl: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: "#f1f5f9",
		borderRadius: 12,
		padding: 4,
		minWidth: 0,
	},
	segmentButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
		paddingVertical: 8,
		borderRadius: 10,
		gap: 4,
		minWidth: 0,
	},
	segmentButtonActive: {
		backgroundColor: "#3b82f6",
	},
	segmentLabel: {
		fontSize: 12,
		color: "#6b7280",
		fontWeight: "600",
		flexShrink: 1,
		minWidth: 0,
	},
	segmentLabelActive: {
		color: "white",
	},
	routeSummaryButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 8,
		gap: 4,
		backgroundColor: "#eff6ff",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#bfdbfe",
		flexShrink: 0,
		maxWidth: "34%",
		minWidth: 96,
	},
	routeSummaryButtonText: {
		fontSize: 13,
		color: "#1d4ed8",
		fontWeight: "600",
		flexShrink: 0,
	},
	detailTimeChips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 12,
		marginTop: -6,
	},
	detailTimeChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	detailTimeChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#334155",
	},
	splitContainer: {
		flex: 1,
	},
	mapWrapper: {
		height: 240,
		backgroundColor: "#e5e7eb",
	},
	fullMapContainer: {
		flex: 1,
		position: "relative",
	},
	fullTimelineContainer: {
		flex: 1,
		position: "relative",
	},
	timelineScroll: {
		flex: 1,
	},
	timelineContent: {
		padding: 16,
		paddingBottom: 100,
	},
	emptyTimeline: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 48,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 8,
		textAlign: "center",
		paddingHorizontal: 24,
	},
	eventCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 14,
		marginBottom: 0,
		gap: 8,
		minWidth: 0,
		...(Platform.OS === "web"
			? { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.08,
					shadowRadius: 8,
					elevation: 3,
				}),
		borderWidth: 1,
		borderColor: "#f1f5f9",
	},
	eventDragRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	eventReorderButtons: {
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},
	reorderBtn: {
		padding: 2,
	},
	reorderBtnDisabled: {
		opacity: 0.5,
	},
	eventBodyTouch: {
		flex: 1,
	},
	eventTimeBlock: {
		marginRight: 4,
	},
	eventTime: {
		fontSize: 15,
		fontWeight: "700",
		color: "#1f2937",
	},
	eventDuration: {
		fontSize: 11,
		color: "#6b7280",
		marginTop: 2,
	},
	eventBody: {
		flex: 1,
		minWidth: 0,
	},
	eventTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111827",
		lineHeight: 20,
	},
	eventCategory: {
		fontSize: 12,
		color: "#6b7280",
		marginTop: 2,
	},
	eventActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	editEventButton: {
		padding: 8,
	},
	deleteEventButton: {
		padding: 8,
	},
	editEventCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 22,
		width: "100%",
		maxWidth: 420,
		alignSelf: "center",
	},
	editLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 6,
		marginTop: 10,
	},
	editInput: {
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 10,
		padding: 12,
		fontSize: 16,
	},
	editRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 20,
	},
	editCancelBtn: {
		flex: 1,
		paddingVertical: 14,
		alignItems: "center",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	editCancelText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
	},
	editSaveBtn: {
		flex: 1,
		paddingVertical: 14,
		alignItems: "center",
		borderRadius: 12,
		backgroundColor: "#3b82f6",
	},
	editSaveText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	legRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 6,
		paddingLeft: 20,
	},
	legLine: {
		width: 2,
		height: 24,
		backgroundColor: "#e5e7eb",
		borderRadius: 1,
		marginRight: 12,
	},
	legContent: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	legText: {
		fontSize: 13,
		color: "#6b7280",
	},
	legModeButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: "#eff6ff",
		borderRadius: 8,
	},
	legModeText: {
		fontSize: 12,
		color: "#3b82f6",
		fontWeight: "500",
	},
	addBetweenButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#f1f5f9",
		justifyContent: "center",
		alignItems: "center",
	},
	showListFloatingButton: {
		position: "absolute",
		bottom: 24,
		right: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 24,
		...(Platform.OS === "web"
			? { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 12,
					elevation: 6,
				}),
	},
	showMapFloatingButton: {
		position: "absolute",
		bottom: 24,
		right: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 24,
		...(Platform.OS === "web"
			? { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 12,
					elevation: 6,
				}),
	},
	showListFloatingText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
	},
	fab: {
		position: "absolute",
		right: 20,
		bottom: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#3b82f6",
		justifyContent: "center",
		alignItems: "center",
		...(Platform.OS === "web"
			? { boxShadow: "0 4px 14px rgba(59,130,246,0.4)" }
			: {
					shadowColor: "#3b82f6",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.4,
					shadowRadius: 12,
					elevation: 8,
				}),
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	detailScroll: {
		width: "100%",
		maxHeight: Dimensions.get("window").height * 0.88,
	},
	detailScrollContent: {
		paddingVertical: 20,
		paddingHorizontal: 4,
		alignItems: "center",
	},
	routeSummaryScroll: {
		width: "100%",
		maxHeight: Dimensions.get("window").height * 0.75,
	},
	routeSummaryScrollContent: {
		paddingVertical: 16,
		paddingHorizontal: 8,
		alignItems: "center",
	},
	detailOrderHint: {
		fontSize: 14,
		fontWeight: "600",
		color: "#3b82f6",
		textAlign: "center",
		marginBottom: 14,
	},
	detailSectionLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: "#64748b",
		textTransform: "uppercase",
		letterSpacing: 0.4,
		marginTop: 12,
		marginBottom: 4,
	},
	detailBodyText: {
		fontSize: 15,
		color: "#1f2937",
		lineHeight: 22,
		flexShrink: 1,
		width: "100%",
	},
	detailMono: {
		fontSize: 12,
		color: "#6b7280",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
	favRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingVertical: 12,
		marginBottom: 8,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#f1f5f9",
	},
	favRowText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#374151",
	},
	modalCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 24,
		width: "100%",
		maxWidth: 360,
		alignSelf: "center",
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#111827",
		marginBottom: 20,
		textAlign: "center",
	},
	modalRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
	},
	modalLabel: {
		fontSize: 15,
		color: "#6b7280",
		lineHeight: 20,
	},
	modalValue: {
		fontSize: 15,
		fontWeight: "600",
		color: "#111827",
		lineHeight: 20,
	},
	modalCloseButton: {
		marginTop: 20,
		backgroundColor: "#3b82f6",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	modalCloseText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
});
