import React, { useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Platform,
} from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useUser } from "../../context/UserContext";
import { Feather } from "@expo/vector-icons";
import { activityCategories } from "../../data/categories";
import { CategoryPickerModal } from "../CategoryPickerModal";
import {
	SearchCriteria,
	SearchCriteriaFilters,
	GoalType,
} from "../../types/searchCriteria";

const CHITA_CENTER = { lat: 52.03, lng: 113.5 };

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
	const { setCurrentStep, setSearchCriteria, updatePlanningRequest } =
		usePlanner();
	const { profile } = useUser();

	const savedLocations = profile?.savedLocations ?? [];
	const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
	const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
		null,
	);
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [subCategoryId, setSubCategoryId] = useState<string | null>(null);
	const [budgetMax, setBudgetMax] = useState(3000);
	const [goal, setGoal] = useState<GoalType | null>(null);
	const [filters, setFilters] = useState<SearchCriteriaFilters>({});
	const [showCategoryModal, setShowCategoryModal] = useState(false);

	const startCoords =
		selectedStartId && savedLocations.length
			? (savedLocations.find((l) => l.id === selectedStartId)?.coords ??
				CHITA_CENTER)
			: CHITA_CENTER;

	const toggleFilter = useCallback((key: keyof SearchCriteriaFilters) => {
		setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const toggleCategory = (catId: string) => {
		setExpandedCategoryId((prev) => (prev === catId ? null : catId));
	};

	const selectSubcategory = (catId: string, subId: string) => {
		setCategoryId(catId);
		setSubCategoryId(subId);
	};

	const handleShowResults = () => {
		const criteria: SearchCriteria = {
			startCoords,
			categoryId: categoryId ?? undefined,
			subCategoryId: subCategoryId ?? undefined,
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

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Точка старта — сохранённые места */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Точка старта</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.startScroll}
					>
						{!savedLocations.length ? (
							<TouchableOpacity
								style={[styles.startChip, styles.startChipSelected]}
								onPress={() => setSelectedStartId(null)}
							>
								<Text style={styles.startChipIcon}>📍</Text>
								<Text
									style={[styles.startChipText, styles.startChipTextSelected]}
								>
									Текущая геолокация
								</Text>
							</TouchableOpacity>
						) : (
							<>
								<TouchableOpacity
									style={[
										styles.startChip,
										selectedStartId === null && styles.startChipSelected,
									]}
									onPress={() => setSelectedStartId(null)}
								>
									<Text style={styles.startChipIcon}>📍</Text>
									<Text
										style={[
											styles.startChipText,
											selectedStartId === null && styles.startChipTextSelected,
										]}
									>
										Текущая
									</Text>
								</TouchableOpacity>
								{savedLocations.map((loc) => (
									<TouchableOpacity
										key={loc.id}
										style={[
											styles.startChip,
											selectedStartId === loc.id && styles.startChipSelected,
										]}
										onPress={() => setSelectedStartId(loc.id)}
									>
										<Text style={styles.startChipIcon}>{loc.icon}</Text>
										<Text
											style={[
												styles.startChipText,
												selectedStartId === loc.id &&
													styles.startChipTextSelected,
											]}
											numberOfLines={1}
										>
											{loc.name}
										</Text>
									</TouchableOpacity>
								))}
							</>
						)}
					</ScrollView>
				</View>

				{/* Категории — модальное меню + аккордеон */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Категория</Text>
					<TouchableOpacity
						style={styles.categoryModalButton}
						onPress={() => setShowCategoryModal(true)}
					>
						<Text style={styles.categoryModalButtonText}>
							{categoryId
								? `${activityCategories.find((c) => c.id === categoryId)?.icon ?? "📋"} ${
										activityCategories.find((c) => c.id === categoryId)?.name ??
										""
									}${subCategoryId ? ` → ${activityCategories.find((c) => c.id === categoryId)?.subcategories.find((s) => s.id === subCategoryId)?.name ?? ""}` : ""}`
								: "Открыть выбор категории"}
						</Text>
						<Feather name="chevron-right" size={20} color="#6b7280" />
					</TouchableOpacity>
					<CategoryPickerModal
						visible={showCategoryModal}
						onClose={() => setShowCategoryModal(false)}
						selectedCategoryId={categoryId}
						selectedSubCategoryId={subCategoryId}
						onSelect={(catId, subId) => {
							setCategoryId(catId);
							setSubCategoryId(subId ?? null);
						}}
					/>
					{activityCategories.map((cat) => (
						<View key={cat.id} style={styles.accordionItem}>
							<TouchableOpacity
								style={styles.accordionHeader}
								onPress={() => toggleCategory(cat.id)}
								activeOpacity={0.7}
							>
								<Text style={styles.accordionIcon}>{cat.icon}</Text>
								<Text style={styles.accordionTitle}>{cat.name}</Text>
								<Feather
									name={
										expandedCategoryId === cat.id
											? "chevron-up"
											: "chevron-down"
									}
									size={20}
									color="#6b7280"
								/>
							</TouchableOpacity>
							{expandedCategoryId === cat.id && (
								<View style={styles.accordionBody}>
									<TouchableOpacity
										style={[
											styles.subItem,
											categoryId === cat.id &&
												!subCategoryId &&
												styles.subItemSelected,
										]}
										onPress={() => {
											setCategoryId(cat.id);
											setSubCategoryId(null);
										}}
									>
										<Text style={styles.subItemText}>Все в категории</Text>
										{categoryId === cat.id && !subCategoryId && (
											<Feather name="check" size={18} color="#3b82f6" />
										)}
									</TouchableOpacity>
									{cat.subcategories.map((sub) => (
										<TouchableOpacity
											key={sub.id}
											style={[
												styles.subItem,
												categoryId === cat.id &&
													subCategoryId === sub.id &&
													styles.subItemSelected,
											]}
											onPress={() => selectSubcategory(cat.id, sub.id)}
										>
											<Text style={styles.subItemIcon}>{sub.icon || "•"}</Text>
											<Text style={styles.subItemText} numberOfLines={1}>
												{sub.name}
											</Text>
											{categoryId === cat.id && subCategoryId === sub.id && (
												<Feather name="check" size={18} color="#3b82f6" />
											)}
										</TouchableOpacity>
									))}
								</View>
							)}
						</View>
					))}
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
