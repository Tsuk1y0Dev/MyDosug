import React, { useState, useMemo, useRef, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	Alert,
	Platform,
} from "react-native";
import { useAuth } from "../../services/auth/AuthContext";
import { useSchedule } from "../../services/schedule/ScheduleContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/types";
import { Activity, FreeSlot } from "../../types/schedule";
import { timeToMinutes } from "../../utils/timingUtils";
import { ActivityBlock } from "../../components/home/ActivityBlock";
import { AddSlotButton } from "../../components/home/AddSlotButton";
import { Timeline } from "../../components/home/Timeline";
import { PlannerModal } from "./PlannerModal";
import { ActivityMenu } from "../../components/home/ActivityMenu";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Main">;

const HOUR_HEIGHT = 80;
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export const HomeScreen = () => {
	const { logout, user } = useAuth();
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { schedule, deleteActivity, updateActivity } = useSchedule();
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [draggingActivityId, setDraggingActivityId] = useState<string | null>(
		null,
	);
	const [plannerVisible, setPlannerVisible] = useState(false);
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<
		{ startTime: string; endTime: string } | undefined
	>();
	const [welcomeOpacity, setWelcomeOpacity] = useState(1);
	const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
		null,
	);
	const [showActivityMenu, setShowActivityMenu] = useState(false);

	// Форматирование даты для отображения
	const formatDate = useCallback((date: Date): string => {
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		if (date.toDateString() === today.toDateString()) {
			return "Сегодня";
		} else if (date.toDateString() === tomorrow.toDateString()) {
			return "Завтра";
		} else {
			const days = [
				"Понедельник",
				"Вторник",
				"Среда",
				"Четверг",
				"Пятница",
				"Суббота",
				"Воскресенье",
			];
			const dayName = days[date.getDay()];
			const day = date.getDate();
			const month = date.getMonth() + 1;
			return `${dayName}, ${day}.${month}`;
		}
	}, []);

	const handleDateChange = (event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowDatePicker(false);
		}
		if (date) {
			setSelectedDate(date);
		}
	};

	// Refs для синхронного скролла
	const timelineScrollRef = useRef<ScrollView>(null);
	const activitiesScrollRef = useRef<ScrollView>(null);

	// Фильтруем активности по выбранной дате
	const filteredSchedule = useMemo(() => {
		const dateStr = selectedDate.toISOString().split("T")[0];
		const filtered = schedule.filter((activity) => {
			// Если дата не указана, показываем для сегодня
			if (!activity.date) {
				return new Date().toISOString().split("T")[0] === dateStr;
			}
			return activity.date === dateStr;
		});
		// Сортируем по времени начала
		return filtered.sort((a, b) => {
			const aTime = timeToMinutes(a.startTime);
			const bTime = timeToMinutes(b.startTime);
			return aTime - bTime;
		});
	}, [schedule, selectedDate]);

	//Исчезновение экрана приветствия
	React.useEffect(() => {
		const timer = setTimeout(() => {
			setWelcomeOpacity(0);
		}, 3000); // Исчезает через 3 секунды
		return () => clearTimeout(timer);
	}, []);

	const timeSlots = useMemo(() => {
		const slots = [];
		for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
			slots.push(`${hour.toString().padStart(2, "0")}:00`);
		}
		return slots;
	}, []);

	const timeToPosition = useCallback((time: string): number => {
		const [hours, minutes] = time.split(":").map(Number);
		return (hours - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
	}, []);

	const positionToTime = useCallback((position: number): string => {
		const totalMinutes = (position / HOUR_HEIGHT) * 60;
		const hours = Math.floor(totalMinutes / 60) + START_HOUR;
		const minutes = Math.round(totalMinutes % 60);
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
	}, []);

	// Обработчики синхронного скролла с debounce для мобильных
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleTimelineScroll = useCallback((event: any) => {
		const { y } = event.nativeEvent.contentOffset;
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}
		scrollTimeoutRef.current = setTimeout(() => {
			if (activitiesScrollRef.current) {
				activitiesScrollRef.current.scrollTo({ y, animated: false });
			}
		}, 10);
	}, []);

	const handleActivitiesScroll = useCallback((event: any) => {
		const { y } = event.nativeEvent.contentOffset;
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}
		scrollTimeoutRef.current = setTimeout(() => {
			if (timelineScrollRef.current) {
				timelineScrollRef.current.scrollTo({ y, animated: false });
			}
		}, 10);
	}, []);

	const freeSlots = useMemo((): FreeSlot[] => {
		if (filteredSchedule.length === 0) {
			return []; // Не показываем окна, если нет активностей
		}

		const busySlots = filteredSchedule
			.map((activity) => ({
				start: timeToPosition(activity.startTime),
				end: timeToPosition(activity.endTime),
			}))
			.sort((a, b) => a.start - b.start);

		const slots: FreeSlot[] = [];

		// Только между активностями, не в начале/конце дня
		for (let i = 0; i < busySlots.length - 1; i++) {
			const currentSlot = busySlots[i];
			const nextSlot = busySlots[i + 1];

			if (nextSlot.start > currentSlot.end) {
				const durationPixels = nextSlot.start - currentSlot.end;
				const durationMinutes = Math.round((durationPixels / HOUR_HEIGHT) * 60);

				if (durationMinutes >= 30) {
					// Минимум 30 минут
					slots.push({
						startTime: currentSlot.end,
						endTime: nextSlot.start,
						duration: durationPixels,
						startTimeString: positionToTime(currentSlot.end),
						endTimeString: positionToTime(nextSlot.start),
					});
				}
			}
		}

		return slots;
	}, [filteredSchedule, timeToPosition, positionToTime]);

	const handleActivityPress = (activity: Activity) => {
		setSelectedActivity(activity);
		setShowActivityMenu(true);
	};

	const handleEditActivity = (activity: Activity) => {
		// Открываем планировщик с предзаполненными данными
		setSelectedTimeSlot({
			startTime: activity.startTime,
			endTime: activity.endTime,
		});
		setPlannerVisible(true);
	};

	const handleDeleteActivity = (activityId: string) => {
		deleteActivity(activityId);
	};

	const handleDragStart = (activityId: string) => {
		setDraggingActivityId(activityId);
	};

	const handleDragEnd = (
		activityId: string,
		newStartTime: string,
		newEndTime: string,
	) => {
		updateActivity(activityId, {
			startTime: newStartTime,
			endTime: newEndTime,
		});
		setDraggingActivityId(null);
	};

	const handleActivitySwap = (draggedId: string, targetId: string) => {
		const draggedActivity = filteredSchedule.find((a) => a.id === draggedId);
		const targetActivity = filteredSchedule.find((a) => a.id === targetId);

		if (!draggedActivity || !targetActivity) return;

		// Меняем временные интервалы местами
		updateActivity(draggedId, {
			startTime: targetActivity.startTime,
			endTime: targetActivity.endTime,
		});

		updateActivity(targetId, {
			startTime: draggedActivity.startTime,
			endTime: draggedActivity.endTime,
		});

		setDraggingActivityId(null);
	};

	const handleAddActivity = (slot?: FreeSlot) => {
		if (slot) {
			setSelectedTimeSlot({
				startTime: slot.startTimeString!,
				endTime: slot.endTimeString!,
			});
		} else {
			setSelectedTimeSlot(undefined);
		}
		setPlannerVisible(true);
	};

	const handlePlannerClose = () => {
		setPlannerVisible(false);
		setSelectedTimeSlot(undefined);
	};

	const handleLogout = () => {
		Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
			{ text: "Отмена", style: "cancel" },
			{ text: "Выйти", style: "destructive", onPress: logout },
		]);
	};

	const getCurrentTimePosition = () => {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		return timeToPosition(
			`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Заголовок */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.headerLeft}
					onPress={() => setShowDatePicker(true)}
				>
					<Feather name="calendar" size={24} color="#3b82f6" />
					<View style={styles.headerText}>
						<Text style={styles.title}>Расписание</Text>
						<Text style={styles.subtitle}>{formatDate(selectedDate)}</Text>
					</View>
					<Feather
						name="chevron-down"
						size={16}
						color="#6b7280"
						style={styles.dateChevron}
					/>
				</TouchableOpacity>

				{showDatePicker &&
					(Platform.OS === "web" ? (
						<View style={styles.datePickerOverlay}>
							<input
								type="date"
								value={selectedDate.toISOString().split("T")[0]}
								onChange={(e) => {
									if (e.target.value) {
										setSelectedDate(new Date(e.target.value));
										setShowDatePicker(false);
									}
								}}
								onBlur={() => setShowDatePicker(false)}
								autoFocus
								style={
									{
										position: "absolute",
										top: "100%",
										left: 0,
										marginTop: 8,
										padding: 12,
										border: "1px solid #e5e7eb",
										borderRadius: 8,
										fontSize: 16,
										zIndex: 1000,
										backgroundColor: "white",
										boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
									} as any
								}
							/>
						</View>
					) : (
						<DateTimePicker
							value={selectedDate}
							mode="date"
							display="default"
							onChange={handleDateChange}
							minimumDate={new Date()}
						/>
					))}

				<View style={styles.headerRight}>
					{!user && (
						<TouchableOpacity
							style={styles.loginButton}
							onPress={() => {
								// @ts-ignore - navigation to Auth screen
								navigation.navigate("Auth", { screen: "Login" });
							}}
						>
							<Feather name="log-in" size={20} color="#3b82f6" />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Информация о пользователе */}
			{welcomeOpacity > 0 && (
				<View style={[styles.userInfo, { opacity: welcomeOpacity }]}>
					<Text style={styles.userGreeting}>Добро пожаловать!</Text>
					<Text style={styles.userEmail}>{user?.email || "Гость"}</Text>
					<View style={styles.scheduleStats}>
						<Text style={styles.statsText}>
							{filteredSchedule.length} активностей • {freeSlots.length}{" "}
							свободных окон
						</Text>
					</View>
				</View>
			)}

			{/* Временная шкала и активности */}
			<View style={styles.timelineContainer}>
				<Timeline
					timeSlots={timeSlots}
					hourHeight={HOUR_HEIGHT}
					contentHeight={TOTAL_HOURS * HOUR_HEIGHT}
					scrollRef={timelineScrollRef}
					onScroll={handleTimelineScroll}
				/>

				<View style={styles.activitiesColumn}>
					<ScrollView
						style={styles.activitiesScrollView}
						contentContainerStyle={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
						showsVerticalScrollIndicator={false}
						ref={activitiesScrollRef}
						onScroll={handleActivitiesScroll}
						scrollEventThrottle={16}
						nestedScrollEnabled={true}
						bounces={false}
					>
						<View
							style={[
								styles.activitiesContent,
								{ height: TOTAL_HOURS * HOUR_HEIGHT },
							]}
						>
							{/* Текущее время индикатор */}
							<View
								style={[
									styles.currentTimeLine,
									{ top: getCurrentTimePosition() },
								]}
							>
								<View style={styles.currentTimeDot} />
								<View style={styles.currentTimeLineVertical} />
							</View>

							{/* Индикатор перетаскивания */}
							{draggingActivityId && (
								<View style={styles.dragOverlay}>
									<Feather name="refresh-cw" size={16} color="#3b82f6" />
									<Text style={styles.dragOverlayText}>
										Перетащите для обмена
									</Text>
								</View>
							)}

							{/* Свободные слоты ТОЛЬКО между активностями */}
							{freeSlots.map((slot, index) => (
								<AddSlotButton
									key={index}
									slot={slot}
									onPress={handleAddActivity}
								/>
							))}

							{/* Активности */}
							{filteredSchedule.map((activity) => (
								<ActivityBlock
									key={activity.id}
									activity={activity}
									onPress={handleActivityPress}
									onDragStart={handleDragStart}
									onDragEnd={handleDragEnd}
									onSwap={handleActivitySwap}
									timeToPosition={timeToPosition}
									positionToTime={positionToTime}
									hourHeight={HOUR_HEIGHT}
									isDragging={draggingActivityId === activity.id}
									allActivities={filteredSchedule}
								/>
							))}
						</View>
					</ScrollView>
				</View>
			</View>

			{/* Плавающая кнопка добавления */}
			<TouchableOpacity
				style={styles.floatingButton}
				onPress={() => handleAddActivity()}
			>
				<Feather name="plus" size={24} color="white" />
			</TouchableOpacity>

			{/* Модальное окно планировщика */}
			<PlannerModal
				visible={plannerVisible}
				onClose={handlePlannerClose}
				initialTimeSlot={selectedTimeSlot}
				selectedDate={selectedDate}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#ffffff",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	dateChevron: {
		marginLeft: 8,
	},
	headerText: {
		marginLeft: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 2,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
	},
	statsButton: {
		padding: 8,
		marginRight: 8,
		backgroundColor: "#f8fafc",
		borderRadius: 8,
	},
	logoutButton: {
		padding: 8,
		backgroundColor: "#fef2f2",
		borderRadius: 8,
	},
	loginButton: {
		padding: 8,
		backgroundColor: "#eff6ff",
		borderRadius: 8,
	},
	userInfo: {
		paddingHorizontal: 20,
		paddingVertical: 20,
		backgroundColor: "#667eea",
	},
	userGreeting: {
		fontSize: 18,
		fontWeight: "600",
		color: "white",
		marginBottom: 4,
	},
	userEmail: {
		fontSize: 14,
		color: "rgba(255, 255, 255, 0.8)",
		marginBottom: 12,
	},
	scheduleStats: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		alignSelf: "flex-start",
	},
	statsText: {
		fontSize: 12,
		color: "white",
		fontWeight: "500",
	},
	timelineContainer: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: "#fafafa",
	},
	activitiesColumn: {
		flex: 1,
		backgroundColor: "white",
	},
	activitiesScrollView: {
		flex: 1,
	},
	activitiesContent: {
		position: "relative",
	},
	currentTimeLine: {
		position: "absolute",
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "#ef4444",
		zIndex: 50,
		flexDirection: "row",
		alignItems: "center",
	},
	currentTimeDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#ef4444",
		marginLeft: -4,
	},
	currentTimeLineVertical: {
		flex: 1,
		height: 2,
		backgroundColor: "#ef4444",
	},
	dragOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(59, 130, 246, 0.1)",
		padding: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
	},
	dragOverlayText: {
		color: "#3b82f6",
		fontWeight: "600",
		fontSize: 12,
		marginLeft: 8,
	},
	floatingButton: {
		position: "absolute",
		right: 20,
		bottom: 20,
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#3b82f6",
		justifyContent: "center",
		alignItems: "center",
		...(Platform.OS === "web"
			? {
					boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: {
						width: 0,
						height: 4,
					},
					shadowOpacity: 0.3,
					shadowRadius: 8,
					elevation: 8,
				}),
	},
	datePickerOverlay: {
		position: "relative",
	},
});
