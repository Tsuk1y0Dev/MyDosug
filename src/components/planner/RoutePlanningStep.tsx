import React, { useMemo, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	Platform,
} from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useSchedule } from "../../services/schedule/ScheduleContext";
import { useFavorites } from "../../services/favorites/FavoritesContext";
import { Feather } from "@expo/vector-icons";
import { PlannedActivity } from "../../types/planner";
import { formatDuration, timeToMinutes } from "../../utils/timingUtils";
import { YandexMap } from "../maps/YandexMap";

interface RoutePlanningStepProps {
	onPlanSaved: () => void;
}

export const RoutePlanningStep: React.FC<RoutePlanningStepProps> = ({
	onPlanSaved,
}) => {
	const {
		currentPlan,
		removeFromPlan,
		setCurrentStep,
		planningRequest,
		resetPlanner,
		planningDate,
		updatePlanningRequest,
		searchPlaces,
	} = usePlanner();
	const { addPlannedActivities, schedule } = useSchedule();
	const { addSavedRoute } = useFavorites();

	const checkTimeConflicts = (
		activities: PlannedActivity[],
	): { hasConflicts: boolean; conflicts: string[] } => {
		const conflicts: string[] = [];
		const allActivities = [
			...schedule,
			...activities.map((a) => ({
				id: a.id,
				title: a.place.name,
				startTime: a.startTime,
				endTime: a.endTime,
				location: a.place.address,
				type: "activity" as const,
			})),
		];

		for (let i = 0; i < allActivities.length; i++) {
			for (let j = i + 1; j < allActivities.length; j++) {
				const a = allActivities[i];
				const b = allActivities[j];

				const aStart = timeToMinutes(a.startTime);
				const aEnd = timeToMinutes(a.endTime);
				const bStart = timeToMinutes(b.startTime);
				const bEnd = timeToMinutes(b.endTime);

				if (
					(aStart < bEnd && aEnd > bStart) ||
					(bStart < aEnd && bEnd > aStart)
				) {
					conflicts.push(`${a.title} и ${b.title} пересекаются во времени`);
				}
			}
		}

		return { hasConflicts: conflicts.length > 0, conflicts };
	};

	const calculateTotalStats = useMemo(() => {
		const totalDuration = currentPlan.totalDuration;
		const totalCost = currentPlan.totalCost;
		const activityCount = currentPlan.activities.length;

		return { totalDuration, totalCost, activityCount };
	}, [
		currentPlan.totalDuration,
		currentPlan.totalCost,
		currentPlan.activities.length,
	]);

	const handleSavePlan = () => {
		if (currentPlan.activities.length === 0) {
			Alert.alert("Пустой план", "Добавьте хотя бы одну активность в план");
			return;
		}

		const { hasConflicts, conflicts } = checkTimeConflicts(
			currentPlan.activities,
		);

		if (hasConflicts) {
			Alert.alert(
				"Обнаружены конфликты времени",
				`Некоторые активности пересекаются по времени:\n\n${conflicts.slice(0, 3).join("\n")}${conflicts.length > 3 ? "\n...и другие" : ""}\n\nВы можете:\n• Сохранить план и решить конфликты позже\n• Вернуться и изменить время`,
				[
					{
						text: "Отмена",
						style: "cancel",
					},
					{
						text: "Сохранить всё равно",
						onPress: () => savePlanConfirmed(),
					},
				],
			);
		} else {
			savePlanConfirmed();
		}
	};

	const savePlanConfirmed = () => {
		addPlannedActivities(currentPlan.activities, planningDate);

		if (
			planningRequest.planType === "chain" &&
			currentPlan.activities.length > 1
		) {
			const routeToSave = {
				...currentPlan,
				id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			};
			addSavedRoute(routeToSave);
		}

		resetPlanner();

		Alert.alert(
			" План сохранен!",
			`Добавлено ${currentPlan.activities.length} активностей в ваше расписание\n\nОбщая продолжительность: ${formatDuration(currentPlan.totalDuration)}\nПримерная стоимость: ${currentPlan.totalCost}₽`,
			[
				{
					text: "Отлично!",
					onPress: onPlanSaved,
				},
			],
		);
	};

	const PlanActivity = ({
		activity,
		index,
	}: {
		activity: PlannedActivity;
		index: number;
	}) => (
		<View style={styles.activityItem}>
			<View style={styles.activityHeader}>
				<View style={styles.activityNumber}>
					<Text style={styles.activityNumberText}>{index + 1}</Text>
				</View>
				<View style={styles.activityInfo}>
					<Text style={styles.activityName}>{activity.place.name}</Text>
					<Text style={styles.activityTime}>
						{activity.startTime} - {activity.endTime}
					</Text>
					<Text
						style={styles.activityAddress}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{activity.place.address}
					</Text>
				</View>
				<TouchableOpacity
					style={styles.removeButton}
					onPress={() => removeFromPlan(activity.id)}
				>
					<Feather name="x" size={20} color="#ef4444" />
				</TouchableOpacity>
			</View>

			<View style={styles.activityDetails}>
				<View style={styles.detailRow}>
					<Feather name="clock" size={14} color="#6b7280" />
					<Text style={styles.detailText}>
						Продолжительность:{" "}
						{formatDuration(
							timeToMinutes(activity.endTime) -
								timeToMinutes(activity.startTime),
						)}
					</Text>
				</View>

				{activity.travelTimeFromPrevious > 0 && (
					<View style={styles.detailRow}>
						<Feather name="navigation" size={14} color="#6b7280" />
						<Text style={styles.detailText}>
							В пути: {formatDuration(activity.travelTimeFromPrevious)}
						</Text>
					</View>
				)}

				{activity.place.averageBill && activity.place.averageBill > 0 && (
					<View style={styles.detailRow}>
						<Feather name="credit-card" size={14} color="#6b7280" />
						<Text style={styles.detailText}>
							~{activity.place.averageBill}₽
						</Text>
					</View>
				)}

				<View style={styles.features}>
					{activity.place.features.wheelchair && (
						<View style={styles.featureTag}>
							<Text style={styles.featureText}>♿</Text>
						</View>
					)}
					{activity.place.features.vegetarian && (
						<View style={styles.featureTag}>
							<Text style={styles.featureText}>🌱</Text>
						</View>
					)}
					{activity.place.features.outdoor && (
						<View style={styles.featureTag}>
							<Text style={styles.featureText}>🌳</Text>
						</View>
					)}
					{activity.place.features.childFriendly && (
						<View style={styles.featureTag}>
							<Text style={styles.featureText}>👶</Text>
						</View>
					)}
				</View>
			</View>

			{index < currentPlan.activities.length - 1 && (
				<View style={styles.connection}>
					<Feather name="arrow-down" size={16} color="#9ca3af" />
					<Text style={styles.connectionText}>
						{formatDuration(
							currentPlan.activities[index + 1].travelTimeFromPrevious,
						)}{" "}
						в пути до следующей точки
					</Text>
				</View>
			)}
		</View>
	);

	const { totalDuration, totalCost, activityCount } = calculateTotalStats;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => setCurrentStep(3)}
				>
					<Feather name="arrow-left" size={24} color="#374151" />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={styles.title}>Ваш маршрут</Text>
					<Text style={styles.subtitle}>
						{activityCount} мест • {formatDuration(totalDuration)} • ~
						{totalCost}₽
					</Text>
				</View>
				<View style={styles.placeholder} />
			</View>

			{currentPlan.activities.length > 0 && (
				<View style={styles.statsContainer}>
					<View style={styles.statItem}>
						<Text style={styles.statValue}>{activityCount}</Text>
						<Text style={styles.statLabel}>активности</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statValue}>
							{formatDuration(totalDuration)}
						</Text>
						<Text style={styles.statLabel}>время</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statValue}>~{totalCost}₽</Text>
						<Text style={styles.statLabel}>бюджет</Text>
					</View>
				</View>
			)}

			<ScrollView
				style={styles.activitiesList}
				showsVerticalScrollIndicator={false}
			>
				{currentPlan.activities.length === 0 ? (
					<View style={styles.emptyState}>
						<Feather name="map" size={48} color="#d1d5db" />
						<Text style={styles.emptyStateTitle}>План пуст</Text>
						<Text style={styles.emptyStateText}>
							Добавьте места из списка рекомендаций, чтобы построить маршрут
						</Text>
					</View>
				) : (
					[...currentPlan.activities]
						.sort((a, b) => {
							const aTime = timeToMinutes(a.startTime);
							const bTime = timeToMinutes(b.startTime);
							return aTime - bTime;
						})
						.map((activity, index) => (
							<PlanActivity
								key={activity.id}
								activity={activity}
								index={index}
							/>
						))
				)}
			</ScrollView>

			{currentPlan.activities.length > 0 && (
				<View style={styles.mapButtonContainer}>
					<TouchableOpacity
						style={styles.viewMapRouteButton}
						onPress={() => {
							Alert.alert(
								"Маршрут на карте",
								`Маршрут включает ${currentPlan.activities.length} мест:\n\n${currentPlan.activities.map((a, i) => `${i + 1}. ${a.place.name} (${a.startTime} - ${a.endTime})`).join("\n")}\n\nОбщее время: ${formatDuration(currentPlan.totalDuration)}\nПримерная стоимость: ${currentPlan.totalCost}₽`,
								[{ text: "ОК" }],
							);
						}}
					>
						<Feather name="map" size={20} color="#3b82f6" />
						<Text style={styles.viewMapRouteText}>Маршрут на карте</Text>
					</TouchableOpacity>
				</View>
			)}

			<View style={styles.actionButtons}>
				{planningRequest.planType !== "single" && (
					<TouchableOpacity
						style={styles.addMoreButton}
						onPress={() => setCurrentStep(3)}
					>
						<Feather name="plus" size={20} color="#3b82f6" />
						<Text style={styles.addMoreButtonText}>
							{currentPlan.activities.length > 0
								? "Добавить ещё"
								: "Добавить места"}
						</Text>
					</TouchableOpacity>
				)}

				{currentPlan.activities.length > 0 && (
					<TouchableOpacity
						style={styles.savePlanButton}
						onPress={handleSavePlan}
					>
						<Feather name="check" size={20} color="white" />
						<Text style={styles.savePlanText}>Сохранить план</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
	},
	backButton: {
		padding: 8,
	},
	headerCenter: {
		alignItems: "center",
		flex: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		marginTop: 4,
	},
	placeholder: {
		width: 40,
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		padding: 16,
		backgroundColor: "#f8fafc",
		marginHorizontal: 20,
		marginTop: 16,
		borderRadius: 12,
	},
	statItem: {
		alignItems: "center",
	},
	statValue: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#1f2937",
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		color: "#6b7280",
	},
	activitiesList: {
		flex: 1,
		padding: 20,
	},
	activityItem: {
		backgroundColor: "white",
		borderRadius: 16,
		marginBottom: 16,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#e5e7eb",
		...(Platform.OS === "web"
			? {
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.08,
					shadowRadius: 8,
					elevation: 3,
				}),
	},
	activityHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: 16,
		backgroundColor: "#f8fafc",
	},
	activityNumber: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#3b82f6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
		marginTop: 2,
	},
	activityNumberText: {
		color: "white",
		fontSize: 14,
		fontWeight: "bold",
	},
	activityInfo: {
		flex: 1,
	},
	activityName: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 4,
	},
	activityTime: {
		fontSize: 14,
		lineHeight: 18,
		color: "#3b82f6",
		fontWeight: "500",
		marginBottom: 2,
	},
	activityAddress: {
		fontSize: 12,
		lineHeight: 16,
		color: "#6b7280",
	},
	removeButton: {
		padding: 4,
	},
	activityDetails: {
		padding: 16,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	detailText: {
		fontSize: 14,
		color: "#6b7280",
		marginLeft: 8,
	},
	features: {
		flexDirection: "row",
		marginTop: 8,
	},
	featureTag: {
		backgroundColor: "#f0f9ff",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
	},
	featureText: {
		fontSize: 12,
		color: "#0369a1",
	},
	connection: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 12,
		backgroundColor: "#f8fafc",
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	connectionText: {
		fontSize: 12,
		color: "#6b7280",
		marginLeft: 8,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateText: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 20,
		paddingHorizontal: 40,
	},
	mapButtonContainer: {
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		backgroundColor: "white",
	},
	viewMapRouteButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		borderRadius: 12,
		backgroundColor: "#eff6ff",
		borderWidth: 1,
		borderColor: "#3b82f6",
		gap: 8,
	},
	viewMapRouteText: {
		fontSize: 16,
		color: "#3b82f6",
		fontWeight: "600",
	},
	actionButtons: {
		flexDirection: "row",
		padding: 20,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		backgroundColor: "white",
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 18,
		borderRadius: 16,
	},
	addMoreButton: {
		backgroundColor: "white",
		borderWidth: 2,
		borderColor: "#3b82f6",
	},
	addMoreButtonText: {
		color: "#3b82f6",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
	savePlanButton: {
		backgroundColor: "#10b981",
		...(Platform.OS === "web"
			? {
					boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
				}
			: {
					shadowColor: "#10b981",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 12,
					elevation: 5,
				}),
	},
	savePlanText: {
		fontSize: 16,
		color: "white",
		fontWeight: "600",
		marginLeft: 8,
	},
});

