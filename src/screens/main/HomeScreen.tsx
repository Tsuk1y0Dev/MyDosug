import React, { useState, useMemo, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	Modal,
	Dimensions,
	Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "../../services/planner/RouteContext";
import { useUser } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { YandexMap } from "../../components/maps/YandexMap";
import { RouteEvent, TravelMode } from "../../types/route";
import { PlannerModal } from "./PlannerModal";
import { timeToMinutes, minutesToTime } from "../../utils/timingUtils";

const CHITA_CENTER = { lat: 52.03, lng: 113.5 };

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

export const HomeScreen = () => {
	const navigation = useNavigation<any>();
	const {
		origin,
		events,
		segments,
		setOrigin,
		insertEvent,
		removeEvent,
		setEvents,
		updateTravelMode,
		setPendingInsertIndex,
	} = useRoute();
	const { profile } = useUser();

	const [viewMode, setViewMode] = useState<ViewMode>("timeline");
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
		CHITA_CENTER,
	);
	const [routeSummaryVisible, setRouteSummaryVisible] = useState(false);
	const [selectedDate, setSelectedDate] = useState(() => new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [plannerVisible, setPlannerVisible] = useState(false);
	const [plannerInitialTimeSlot, setPlannerInitialTimeSlot] = useState<{
		startTime: string;
		endTime: string;
	} | null>(null);

	const MIN_ACTIVITY_DURATION_MIN = 60;
	const DAY_START = "09:00";
	const DAY_END = "23:00";

	const findFirstFreeSlot = (
		list: RouteEvent[],
		minDurationMinutes: number,
	) => {
		if (list.length === 0) {
			const startMinutes = timeToMinutes(DAY_START);
			return {
				startTime: DAY_START,
				endTime: minutesToTime(startMinutes + minDurationMinutes),
			};
		}

		const eventsSorted = [...list].sort(
			(a, b) => timeToMinutes(a.arrivalTime) - timeToMinutes(b.arrivalTime),
		);

		let cursor = timeToMinutes(DAY_START);
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

		const fallbackStartMinutes = timeToMinutes(DAY_START);
		return {
			startTime: DAY_START,
			endTime: minutesToTime(fallbackStartMinutes + minDurationMinutes),
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
				slot = {
					startTime: minutesToTime(prevEnd),
					endTime: minutesToTime(prevEnd + MIN_ACTIVITY_DURATION_MIN),
				};
			} else {
				slot = findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN);
			}
		} else if (
			insertIndex != null &&
			insertIndex === events.length &&
			events.length > 0
		) {
			// Вставка в конец — сразу после последнего события, если влезаем в рабочий день
			const last = events[events.length - 1];
			const lastStart = timeToMinutes(last.arrivalTime);
			const lastEnd = lastStart + last.duration;
			const dayEndMinutes = timeToMinutes(DAY_END);
			const gap = dayEndMinutes - lastEnd;

			if (gap >= MIN_ACTIVITY_DURATION_MIN) {
				slot = {
					startTime: minutesToTime(lastEnd),
					endTime: minutesToTime(lastEnd + MIN_ACTIVITY_DURATION_MIN),
				};
			} else {
				slot = findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN);
			}
		} else {
			// Общий случай — первое свободное окно дня
			slot = findFirstFreeSlot(events, MIN_ACTIVITY_DURATION_MIN);
		}

		if (insertIndex != null) {
			setPendingInsertIndex(insertIndex);
		} else {
			setPendingInsertIndex(events.length);
		}

		setPlannerInitialTimeSlot(slot);
		setPlannerVisible(true);
	};

	// Инициализация origin из профиля или по умолчанию (Чита)
	useEffect(() => {
		if (origin != null) return;
		const startPoint = profile?.defaultStartPoint;
		if (!startPoint) {
			setOrigin({ id: "default", label: "Чита", coords: CHITA_CENTER });
			return;
		}
		const fromSaved =
			startPoint.type === "current"
				? CHITA_CENTER
				: (profile?.savedLocations?.find(
						(l) =>
							(l.type === "home" && startPoint.type === "home") ||
							(l.type === "office" && startPoint.type === "work"),
					)?.coords ?? CHITA_CENTER);
		const coords =
			startPoint &&
			"coordinates" in startPoint &&
			(startPoint as { coordinates?: { lat: number; lng: number } }).coordinates
				? (startPoint as { coordinates: { lat: number; lng: number } })
						.coordinates
				: fromSaved;
		setOrigin({
			id: "profile_origin",
			label: startPoint.label || "Старт",
			coords,
		});
	}, [profile, origin, setOrigin]);

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
		if (origin && events.length > 0) {
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

	const handleEventPress = (event: RouteEvent) => {
		setMapCenter(event.coords);
	};

	const handleAddAtEnd = () => {
		openPlannerWithAutoSlot(events.length);
	};

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

	const mapSection = (
		<View style={styles.mapWrapper}>
			<YandexMap
				center={mapCenter}
				zoom={0}
				markers={mapMarkers}
				origin={
					origin
						? {
								lat: origin.coords.lat,
								lng: origin.coords.lng,
								label: origin.label,
							}
						: undefined
				}
				segmentLines={segmentLines}
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
			{events.length === 0 && (
				<View style={styles.emptyTimeline}>
					<Feather name="map-pin" size={48} color="#d1d5db" />
					<Text style={styles.emptyTitle}>Маршрут пуст</Text>
					<Text style={styles.emptySubtitle}>
						Добавьте точки: «Спланировать» или экран Поиск
					</Text>
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
							onPress={() => handleEventPress(event)}
							activeOpacity={0.8}
						>
							<View style={styles.eventBody}>
								<Text style={styles.eventTitle} numberOfLines={1}>
									{event.customTitle || `Точка ${index + 1}`}
								</Text>
								<Text style={styles.eventCategory}>Досуг</Text>
							</View>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.deleteEventButton}
							onPress={() => removeEvent(event.id)}
						>
							<Feather name="trash-2" size={18} color="#ef4444" />
						</TouchableOpacity>
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
					onPress={() => setShowDatePicker(true)}
				>
					<Feather name="calendar" size={18} color="#3b82f6" />
					<Text style={styles.dateChipText}>
						{formatPlanDate(selectedDate)}
					</Text>
					<Feather name="chevron-down" size={16} color="#6b7280" />
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.planDayButton}
					onPress={() => setPlannerVisible(true)}
				>
					<Feather name="plus-circle" size={18} color="white" />
					<Text style={styles.planDayButtonText}>Спланировать</Text>
				</TouchableOpacity>
			</View>
			{showDatePicker && (
				<Modal
					transparent
					animationType="fade"
					visible={showDatePicker}
					onRequestClose={() => setShowDatePicker(false)}
				>
					<TouchableOpacity
						style={styles.datePickerOverlay}
						activeOpacity={1}
						onPress={() => setShowDatePicker(false)}
					>
						<View style={styles.datePickerCard}>
							<Text style={styles.datePickerTitle}>Выберите дату</Text>
							{Platform.OS === "web" ? (
								<input
									type="date"
									value={selectedDate.toISOString().split("T")[0]}
									onChange={(e) => {
										if (e.target.value) {
											setSelectedDate(new Date(e.target.value));
											setShowDatePicker(false);
										}
									}}
									style={
										{ padding: 12, fontSize: 16, marginVertical: 8 } as any
									}
								/>
							) : (
								<DateTimePicker
									value={selectedDate}
									mode="date"
									display="spinner"
									minimumDate={new Date()}
									onChange={(_, d) => {
										if (d) setSelectedDate(d);
										if (Platform.OS === "android") setShowDatePicker(false);
									}}
								/>
							)}
							<TouchableOpacity
								style={styles.datePickerDone}
								onPress={() => setShowDatePicker(false)}
							>
								<Text style={styles.datePickerDoneText}>Готово</Text>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
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
					<Text style={styles.routeSummaryButtonText}>Маршрут</Text>
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

			{(viewMode === "timeline" || viewMode === "split") && (
				<TouchableOpacity style={styles.fab} onPress={openPlannerWithAutoSlot}>
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

			{/* Модальное окно сводки маршрута */}
			<Modal
				visible={routeSummaryVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setRouteSummaryVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setRouteSummaryVisible(false)}
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
				</TouchableOpacity>
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
	},
	dateChipText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1d4ed8",
	},
	planDayButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "#3b82f6",
		borderRadius: 20,
	},
	planDayButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "white",
	},
	datePickerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	datePickerCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 24,
		width: "100%",
		maxWidth: 340,
	},
	datePickerTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 8,
		textAlign: "center",
	},
	datePickerDone: {
		marginTop: 16,
		backgroundColor: "#3b82f6",
		paddingVertical: 14,
		borderRadius: 12,
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	segmentedControl: {
		flexDirection: "row",
		backgroundColor: "#f1f5f9",
		borderRadius: 10,
		padding: 4,
	},
	segmentButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 6,
	},
	segmentButtonActive: {
		backgroundColor: "#3b82f6",
	},
	segmentLabel: {
		fontSize: 13,
		color: "#6b7280",
		fontWeight: "500",
	},
	segmentLabelActive: {
		color: "white",
	},
	routeSummaryButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 6,
	},
	routeSummaryButtonText: {
		fontSize: 14,
		color: "#3b82f6",
		fontWeight: "600",
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
	},
	eventTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111827",
	},
	eventCategory: {
		fontSize: 12,
		color: "#6b7280",
		marginTop: 2,
	},
	deleteEventButton: {
		padding: 8,
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
		padding: 24,
	},
	modalCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 24,
		width: "100%",
		maxWidth: 340,
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
	},
	modalValue: {
		fontSize: 15,
		fontWeight: "600",
		color: "#111827",
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
