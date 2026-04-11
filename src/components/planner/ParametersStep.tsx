import React, { useState, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Platform,
	Modal,
	FlatList,
	Alert,
} from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { Feather } from "@expo/vector-icons";
import { activityCategories } from "../../data/categories";
import {
	SearchCriteria,
	SearchCriteriaFilters,
	GoalType,
} from "../../types/searchCriteria";
import { useFavorites } from "../../services/favorites/FavoritesContext";
import { useRoute as useDayRoute } from "../../services/planner/RouteContext";
import type { Place } from "../../types/planner";
import type { RouteEvent, RouteOrigin } from "../../types/route";
import { AddToRouteTimeModal } from "./AddToRouteTimeModal";
import { useDeviceCoords } from "../../hooks/useDeviceCoords";
import { getRouteInsertTiming } from "../../utils/routeInsertTiming";
import {
	isSameLocalCalendarDay,
	minutesSinceLocalMidnight,
} from "../../utils/timingUtils";

const MAP_FALLBACK_CENTER = { lat: 55.75, lng: 37.62 };

const GOAL_OPTIONS: { value: GoalType; label: string; icon: string }[] = [
	{ value: "work", label: "Работа", icon: "briefcase" },
	{ value: "relax", label: "Релакс", icon: "coffee" },
	{ value: "fun", label: "Весело", icon: "smile" },
	{ value: "romantic", label: "Романтика", icon: "heart" },
	{ value: "active", label: "Активно", icon: "activity" },
	{ value: "educational", label: "Познавательно", icon: "book-open" },
];

const FILTER_CHIPS: { key: keyof SearchCriteriaFilters; label: string }[] = [
	{ key: "wheelchairAccessible", label: "♿ Пандус / коляска" },
	{ key: "elevatorOrRamp", label: "⬆ Лифт / пандус" },
	{ key: "stepFreeEntrance", label: "🚪 Без ступенек" },
	{ key: "accessibleToilet", label: "🚻 Доступный туалет" },
	{ key: "parkingNearby", label: "🅿 Парковка" },
	{ key: "publicTransportNearby", label: "🚌 Остановка рядом" },
	{ key: "outdoor", label: "🌳 Открытый воздух" },
	{ key: "childFriendly", label: "👶 С детьми" },
	{ key: "wifi", label: "📶 Wi‑Fi" },
	{ key: "vegetarian", label: "🌱 Вегетарианское" },
];

export const ParametersStep = () => {
	const {
		setCurrentStep,
		setSearchCriteria,
		updatePlanningRequest,
		planningRequest,
		planningDate,
	} = usePlanner();
	const { favoritePlaces, userCreatedPlaces } = useFavorites();
	const {
		insertEventWithOrigin,
		events,
		pendingInsertIndex,
		origin,
		segments,
	} = useDayRoute();
	const deviceCoords = useDeviceCoords();
	const [favModalPlace, setFavModalPlace] = useState<Place | null>(null);
	const [savedPickerOpen, setSavedPickerOpen] = useState(false);

	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
	const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);
	const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
		null,
	);
	const [budgetMax, setBudgetMax] = useState(3000);
	const [goal, setGoal] = useState<GoalType | null>(null);
	const [filters, setFilters] = useState<SearchCriteriaFilters>({});

	const startCoords = deviceCoords ?? MAP_FALLBACK_CENTER;

	const planningDayFloorMinutes = useMemo(() => {
		return isSameLocalCalendarDay(planningDate, new Date())
			? minutesSinceLocalMidnight()
			: 0;
	}, [planningDate.getTime()]);

	const favModalTiming = useMemo(() => {
		if (!favModalPlace) return null;
		return getRouteInsertTiming({
			events,
			segments,
			origin,
			insertIndex: pendingInsertIndex ?? events.length,
			newCoords: favModalPlace.coordinates,
			floorMinutes: planningDayFloorMinutes,
		});
	}, [
		favModalPlace,
		events,
		segments,
		origin,
		pendingInsertIndex,
		planningDayFloorMinutes,
	]);

	const savedCatalog = useMemo(
		() => [...favoritePlaces, ...userCreatedPlaces],
		[favoritePlaces, userCreatedPlaces],
	);

	const toggleFilter = useCallback((key: keyof SearchCriteriaFilters) => {
		setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const handleShowResults = () => {
		const criteria: SearchCriteria = {
			startCoords,
			categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
			subCategoryIds: selectedSubCategoryIds.length ? selectedSubCategoryIds : undefined,
			budgetMin: 0,
			budgetMax,
			goal: goal ?? undefined,
			filters: Object.fromEntries(
				Object.entries(filters).filter(([, v]) => v === true),
			) as SearchCriteriaFilters,
		};
		setSearchCriteria(criteria);
		setCurrentStep(3);
	};

	const handleCustomActivity = () => {
		updatePlanningRequest({ activityType: "custom" });
		setCurrentStep(2);
	};

	const finishInsert = useCallback(
		(
			ev: RouteEvent,
			originUpdate: "unchanged" | RouteOrigin | null,
		) => {
			insertEventWithOrigin(pendingInsertIndex ?? events.length, ev, originUpdate);
			setFavModalPlace(null);
		},
		[insertEventWithOrigin, events.length, pendingInsertIndex],
	);

	const confirmFavToRoute = useCallback(
		(arrivalTime: string, durationMinutes: number) => {
			const place = favModalPlace;
			if (!place) return;
			const ev: RouteEvent = {
				id: `ev-${Date.now()}-${place.id}`,
				placeId: place.id,
				customTitle: place.name,
				coords: place.coordinates,
				arrivalTime,
				duration: durationMinutes,
				travelModeToNext: "driving",
				lockTimes: true,
				description: place.description,
				address: place.address,
				openingHours:
					place.workingHours?.trim() || "Не нашли время работы",
				budgetNote: place.averageBill
					? `~${place.averageBill} ₽`
					: "Не нашли информацию о бюджете",
			};
			const wasEmpty = events.length === 0;
			if (!wasEmpty) {
				finishInsert(ev, "unchanged");
				return;
			}
			Alert.alert(
				"Первое место",
				"Построить маршрут от вашей геолокации до этой точки?",
				[
					{
						text: "Нет, только точки плана",
						style: "cancel",
						onPress: () =>
							finishInsert(ev, {
								id: "from_first_stop",
								label: place.name,
								coords: place.coordinates,
							}),
					},
					{
						text: "Да, от меня",
						onPress: () => {
							if (deviceCoords) {
								finishInsert(ev, {
									id: "default",
									label: "Вы здесь",
									coords: deviceCoords,
								});
							} else {
								Alert.alert(
									"Геолокация",
									"Не удалось получить координаты. Маршрут начнётся с первой точки.",
									[
										{
											text: "Понятно",
											onPress: () =>
												finishInsert(ev, {
													id: "from_first_stop",
													label: place.name,
													coords: place.coordinates,
												}),
										},
									],
								);
							}
						},
					},
				],
			);
		},
		[favModalPlace, events.length, deviceCoords, finishInsert],
	);

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{favoritePlaces.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Быстро из избранного</Text>
						<Text style={styles.favHint}>
							Добавьте сохранённое место в дневной маршрут (время можно
							изменить)
						</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.favScroll}
						>
							{favoritePlaces.map((p) => (
								<TouchableOpacity
									key={p.id}
									style={styles.favChip}
									onPress={() => setFavModalPlace(p)}
									activeOpacity={0.85}
								>
									<Feather name="heart" size={16} color="#ef4444" />
									<Text style={styles.favChipText} numberOfLines={1}>
										{p.name}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				)}

				{/* Категории — список с выпадающими подкатегориями */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Категория</Text>
					{activityCategories.map((cat) => {
						const subIds = cat.subcategories.map((s) => s.id);
						const isAllInCategorySelected = selectedCategoryIds.includes(cat.id);
						const selectedCountFromSubs = subIds.filter((id) =>
							selectedSubCategoryIds.includes(id),
						).length;
						const displayCount = isAllInCategorySelected
							? subIds.length
							: selectedCountFromSubs;
						const isExpanded = expandedCategoryId === cat.id;

						return (
							<View key={cat.id} style={styles.accordionItem}>
								<TouchableOpacity
									style={[
										styles.accordionHeader,
										displayCount > 0 ? styles.accordionHeaderSelected : null,
									]}
									onPress={() =>
										setExpandedCategoryId((prev) =>
											prev === cat.id ? null : cat.id,
										)
									}
									activeOpacity={0.7}
								>
									<Text style={styles.accordionIcon}>{cat.icon}</Text>
									<Text style={styles.accordionTitle}>{cat.name}</Text>

									{displayCount > 0 && (
										<Text style={styles.categoryCount}>{displayCount}</Text>
									)}

									<Feather
										name={isExpanded ? "chevron-up" : "chevron-down"}
										size={20}
										color="#6b7280"
									/>
								</TouchableOpacity>

								{isExpanded && (
									<View style={styles.accordionBody}>
										{/* Выбор всей категории */}
										<TouchableOpacity
											style={[
												styles.subItem,
												isAllInCategorySelected && styles.subItemSelected,
											]}
											onPress={() => {
												setSelectedSubCategoryIds((prev) =>
													prev.filter((id) => !subIds.includes(id)),
												);
												setSelectedCategoryIds((prev) => {
													const already = prev.includes(cat.id);
													if (already) return prev.filter((id) => id !== cat.id);
													return [...prev, cat.id];
												});
											}}
										>
											<Text style={styles.subItemText}>Все в категории</Text>
											{isAllInCategorySelected && (
												<Feather name="check" size={18} color="#3b82f6" />
											)}
										</TouchableOpacity>

										{/* Выбор подкатегорий */}
										{cat.subcategories.map((sub) => {
											const isSelected = selectedSubCategoryIds.includes(sub.id);

											return (
												<TouchableOpacity
													key={sub.id}
													style={[
														styles.subItem,
														isSelected && styles.subItemSelected,
													]}
													onPress={() => {
														// Если выбрали конкретную подкатегорию — “вся категория” больше не активна.
														setSelectedCategoryIds((prev) =>
															prev.filter((id) => id !== cat.id),
														);
														setSelectedSubCategoryIds((prev) => {
															if (prev.includes(sub.id)) {
																return prev.filter((id) => id !== sub.id);
															}
															return [...prev, sub.id];
														});
													}}
												>
													<Text style={styles.subItemIcon}>{sub.icon || "•"}</Text>
													<Text
														style={styles.subItemText}
														numberOfLines={1}
														ellipsizeMode="tail"
													>
														{sub.name}
													</Text>
													{isSelected && (
														<Feather name="check" size={18} color="#3b82f6" />
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								)}
							</View>
						);
					})}
				</View>

				{/* Фильтры — чипы */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Удобства и доступность</Text>
					<View style={styles.chipsWrap}>
						{FILTER_CHIPS.map(({ key, label }) => (
							<TouchableOpacity
								key={key}
								style={[styles.chip, filters[key] && styles.chipSelected]}
								onPress={() => toggleFilter(key)}
							>
								<Text
									style={[
										styles.chipText,
										filters[key] && styles.chipTextSelected,
									]}
									numberOfLines={1}
									ellipsizeMode="tail"
								>
									{label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Бюджет — слайдер */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Бюджет до</Text>
					<Text style={styles.budgetValue}>{budgetMax} ₽</Text>
					{Platform.OS === "web" ? (
						<input
							type="range"
							min={0}
							max={5000}
							step={100}
							value={budgetMax}
							onChange={(e) => setBudgetMax(Number(e.target.value))}
							style={styles.webRange as any}
						/>
					) : (
						<View style={styles.sliderRow}>
							<TouchableOpacity
								style={styles.sliderBtn}
								onPress={() => setBudgetMax(Math.max(0, budgetMax - 500))}
							>
								<Feather name="minus" size={18} color="#374151" />
							</TouchableOpacity>
							<View style={styles.sliderTrack}>
								<View
									style={[
										styles.sliderFill,
										{ width: `${(budgetMax / 5000) * 100}%` },
									]}
								/>
							</View>
							<TouchableOpacity
								style={styles.sliderBtn}
								onPress={() => setBudgetMax(Math.min(5000, budgetMax + 500))}
							>
								<Feather name="plus" size={18} color="#374151" />
							</TouchableOpacity>
						</View>
					)}
					<View style={styles.sliderLabels}>
						<Text style={styles.sliderLabel}>0</Text>
						<Text style={styles.sliderLabel}>2500</Text>
						<Text style={styles.sliderLabel}>5000 ₽</Text>
					</View>
				</View>

				{/* Цель / настроение */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Цель</Text>
					<View style={styles.goalWrap}>
						{GOAL_OPTIONS.map((opt) => (
							<TouchableOpacity
								key={opt.value}
								style={[
									styles.goalChip,
									goal === opt.value && styles.goalChipSelected,
								]}
								onPress={() => setGoal(goal === opt.value ? null : opt.value)}
							>
								<Feather
									name={opt.icon as any}
									size={16}
									color={goal === opt.value ? "#fff" : "#6b7280"}
								/>
								<Text
									style={[
										styles.goalChipText,
										goal === opt.value && styles.goalChipTextSelected,
									]}
								>
									{opt.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Своя активность */}
				<TouchableOpacity
					style={styles.customButton}
					onPress={handleCustomActivity}
				>
					<Feather name="edit-3" size={20} color="#f59e0b" />
					<Text style={styles.customButtonText}>Создать свою активность</Text>
					<Text style={styles.customButtonSubtext}>
						Название + точка на карте
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.addSavedButton}
					onPress={() => setSavedPickerOpen(true)}
					activeOpacity={0.85}
				>
					<Feather name="bookmark" size={20} color="#dc2626" />
					<Text style={styles.addSavedButtonText}>Добавить из сохранённых</Text>
					<Text style={styles.addSavedButtonSub}>
						Избранное и созданные вами места
					</Text>
				</TouchableOpacity>

				{/* Показать результаты */}
				<TouchableOpacity
					style={styles.primaryButton}
					onPress={handleShowResults}
				>
					<Feather name="search" size={20} color="white" />
					<Text style={styles.primaryButtonText}>Показать результаты</Text>
				</TouchableOpacity>

				<View style={{ height: 40 }} />
			</ScrollView>

			<AddToRouteTimeModal
				visible={!!favModalPlace}
				onClose={() => setFavModalPlace(null)}
				onConfirm={confirmFavToRoute}
				placeTitle={favModalPlace?.name ?? ""}
				defaultArrival={
					favModalTiming?.suggestedArrival ?? planningRequest.startTime
				}
				defaultDurationMinutes={60}
				minArrivalMinutes={favModalTiming?.minArrivalMinutes ?? 0}
				blockingEventTitle={favModalTiming?.blockingLabel ?? "начала дня"}
				openingHoursRaw={favModalPlace?.workingHours}
				planningDate={planningDate}
			/>

			<Modal
				visible={savedPickerOpen}
				animationType="slide"
				transparent
				onRequestClose={() => setSavedPickerOpen(false)}
			>
				<TouchableOpacity
					style={styles.savedPickerOverlay}
					activeOpacity={1}
					onPress={() => setSavedPickerOpen(false)}
				>
					<TouchableOpacity
						style={styles.savedPickerCard}
						activeOpacity={1}
						onPress={() => {}}
					>
						<View style={styles.savedPickerHeader}>
							<Text style={styles.savedPickerTitle}>Сохранённые места</Text>
							<TouchableOpacity onPress={() => setSavedPickerOpen(false)}>
								<Feather name="x" size={22} color="#374151" />
							</TouchableOpacity>
						</View>
						{savedCatalog.length === 0 ? (
							<Text style={styles.savedPickerEmpty}>
								Пока нет избранного и своих мест — добавьте их из поиска или
								создайте активность.
							</Text>
						) : (
							<FlatList
								data={savedCatalog}
								keyExtractor={(p) => p.id}
								style={styles.savedPickerList}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.savedPickerRow}
										onPress={() => {
											setSavedPickerOpen(false);
											setFavModalPlace(item);
										}}
									>
										<Feather name="map-pin" size={18} color="#3b82f6" />
										<Text style={styles.savedPickerRowText} numberOfLines={2}>
											{item.name}
										</Text>
										<Feather name="chevron-right" size={18} color="#9ca3af" />
									</TouchableOpacity>
								)}
							/>
						)}
					</TouchableOpacity>
				</TouchableOpacity>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 100,
	},
	header: {
		marginBottom: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 15,
		color: "#6b7280",
		lineHeight: 22,
	},
	favHint: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 10,
		lineHeight: 18,
	},
	favScroll: {
		gap: 8,
		paddingVertical: 4,
	},
	favChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		maxWidth: 220,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "#fef2f2",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#fecaca",
		marginRight: 8,
	},
	favChipText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "600",
		color: "#991b1b",
	},
	section: {
		marginBottom: 20,
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		overflow: "hidden",
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 12,
	},
	categoryModalButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: "#f8fafc",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		marginBottom: 12,
	},
	categoryModalButtonText: {
		fontSize: 15,
		color: "#374151",
		fontWeight: "500",
		flex: 1,
	},
	startScroll: {
		flexDirection: "row",
		gap: 10,
		paddingVertical: 4,
	},
	startChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	startChipSelected: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	startChipIcon: {
		fontSize: 16,
	},
	startChipText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "500",
		color: "#374151",
		maxWidth: 120,
	},
	startChipTextSelected: {
		color: "white",
	},
	accordionItem: {
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
	},
	accordionHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 4,
		gap: 10,
	},
	accordionHeaderSelected: {
		backgroundColor: "#eff6ff",
		borderRadius: 12,
		paddingHorizontal: 6,
	},
	accordionIcon: {
		fontSize: 22,
	},
	accordionTitle: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
		color: "#111827",
	},
	accordionBody: {
		paddingLeft: 32,
		paddingBottom: 12,
	},
	categoryCount: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6b7280", // тёмно-серый счетчик
		marginRight: 4,
	},
	subItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 8,
		gap: 8,
		borderRadius: 8,
	},
	subItemSelected: {
		backgroundColor: "#eff6ff",
	},
	subItemIcon: {
		fontSize: 18,
	},
	subItemText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 18,
		color: "#374151",
	},
	chipsWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	chipSelected: {
		backgroundColor: "#dbeafe",
		borderColor: "#3b82f6",
	},
	chipText: {
		fontSize: 13,
		lineHeight: 16,
		color: "#374151",
	},
	chipTextSelected: {
		color: "#1d4ed8",
		fontWeight: "600",
	},
	budgetValue: {
		fontSize: 18,
		fontWeight: "700",
		color: "#059669",
		marginBottom: 8,
	},
	webRange: {
		width: "100%",
		height: 8,
		marginVertical: 4,
	},
	sliderRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 4,
	},
	sliderBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#f1f5f9",
		justifyContent: "center",
		alignItems: "center",
	},
	sliderTrack: {
		flex: 1,
		height: 8,
		backgroundColor: "#e5e7eb",
		borderRadius: 4,
		overflow: "hidden",
	},
	sliderFill: {
		height: "100%",
		backgroundColor: "#3b82f6",
		borderRadius: 4,
	},
	sliderLabels: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 4,
	},
	sliderLabel: {
		fontSize: 12,
		color: "#9ca3af",
	},
	goalWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	goalChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	goalChipSelected: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	goalChipText: {
		fontSize: 13,
		color: "#374151",
		fontWeight: "500",
	},
	goalChipTextSelected: {
		color: "white",
	},
	customButton: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 10,
		padding: 16,
		borderRadius: 16,
		backgroundColor: "#fffbeb",
		borderWidth: 2,
		borderColor: "#fcd34d",
		borderStyle: "dashed",
		marginBottom: 20,
	},
	customButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#b45309",
	},
	customButtonSubtext: {
		fontSize: 12,
		color: "#92400e",
		width: "100%",
		marginLeft: 30,
	},
	addSavedButton: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 10,
		padding: 16,
		borderRadius: 16,
		backgroundColor: "white",
		borderWidth: 2,
		borderColor: "#ef4444",
		marginBottom: 20,
	},
	addSavedButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#b91c1c",
	},
	addSavedButtonSub: {
		fontSize: 12,
		color: "#991b1b",
		width: "100%",
		marginLeft: 30,
	},
	savedPickerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "flex-end",
	},
	savedPickerCard: {
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 28,
		maxHeight: "72%",
	},
	savedPickerHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	savedPickerTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#111827",
	},
	savedPickerEmpty: {
		fontSize: 14,
		color: "#6b7280",
		lineHeight: 20,
		paddingVertical: 12,
	},
	savedPickerList: {
		flexGrow: 0,
	},
	savedPickerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
	},
	savedPickerRowText: {
		flex: 1,
		fontSize: 15,
		color: "#1f2937",
		fontWeight: "500",
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingVertical: 16,
		borderRadius: 14,
		backgroundColor: "#3b82f6",
	},
	primaryButtonText: {
		fontSize: 17,
		fontWeight: "600",
		color: "white",
	},
});
