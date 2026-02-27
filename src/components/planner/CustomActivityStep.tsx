import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	Platform,
} from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useSchedule } from "../../services/schedule/ScheduleContext";
import { Activity } from "../../types/schedule";
import { Feather } from "@expo/vector-icons";
import { calculateEndTime } from "../../utils/timingUtils";
import { YandexMap } from "../maps/YandexMap";

interface CustomActivityStepProps {
	onPlanSaved?: () => void;
}

export const CustomActivityStep: React.FC<CustomActivityStepProps> = ({
	onPlanSaved,
}) => {
	const { planningRequest, setCurrentStep, planningDate } = usePlanner();
	const { addActivity } = useSchedule();

	const [customActivity, setCustomActivity] = useState({
		title: "",
		location: "",
		description: "",
		duration: 60, // минуты
		coordinates: { lat: 52.0339, lng: 113.501 }, // Координаты по умолчанию (Чита)
	});

	const handleSaveCustomActivity = () => {
		if (!customActivity.title.trim()) {
			Alert.alert("Ошибка", "Введите название активности");
			return;
		}

		if (!customActivity.location.trim()) {
			Alert.alert("Ошибка", "Укажите местоположение активности");
			return;
		}

		const newActivity: Activity = {
			id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			title: customActivity.title,
			startTime: planningRequest.startTime,
			endTime: calculateEndTime(
				planningRequest.startTime,
				customActivity.duration,
			),
			location: customActivity.location,
			type: "custom",
			description: customActivity.description,
			date: planningDate ? planningDate.toISOString().split("T")[0] : undefined,
		};

		addActivity(newActivity);

		Alert.alert(
			"✅ Успешно!",
			`Активность "${customActivity.title}" добавлена в расписание\n\nВремя: ${planningRequest.startTime} - ${calculateEndTime(planningRequest.startTime, customActivity.duration)}`,
			[
				{
					text: "Отлично!",
					onPress: () => {
						// Закрываем модальное окно через onPlanSaved
						if (onPlanSaved) {
							onPlanSaved();
						} else {
							// Или возвращаемся на предыдущий шаг
							setCurrentStep(1);
						}
					},
				},
			],
		);
	};

	const durationOptions = [30, 60, 90, 120, 180];

	return (
		<View style={styles.container}>
			{/* Заголовок с кнопкой назад */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.headerBackButton}
					onPress={() => {
						// Возвращаемся к шагу параметров (шаг 2)
						setCurrentStep(2);
					}}
				>
					<Feather name="arrow-left" size={24} color="#374151" />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.title}>Создать свою активность</Text>
					<Text style={styles.subtitle}>
						Добавьте мероприятие, которого нет в нашем каталоге
					</Text>
				</View>
			</View>

			<ScrollView style={styles.form}>
				<View style={styles.field}>
					<Text style={styles.label}>Название активности *</Text>
					<TextInput
						style={styles.input}
						placeholder="Например: Встреча с друзьями"
						value={customActivity.title}
						onChangeText={(text) =>
							setCustomActivity((prev) => ({ ...prev, title: text }))
						}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Местоположение *</Text>
					<TextInput
						style={styles.input}
						placeholder="Адрес или название места"
						value={customActivity.location}
						onChangeText={(text) =>
							setCustomActivity((prev) => ({ ...prev, location: text }))
						}
					/>
				</View>

				{/* Карта выбора точки */}
				<View style={styles.field}>
					<Text style={styles.label}>Местоположение на карте</Text>
					<View style={styles.mapContainer}>
						<YandexMap
							center={customActivity.coordinates}
							markers={[]}
							height={220}
							selectionMode
							selectedPoint={customActivity.coordinates}
							onSelectPoint={(coords) =>
								setCustomActivity((prev) => ({
									...prev,
									coordinates: coords,
								}))
							}
						/>
						<Text style={styles.coordinatesText}>
							Координаты: {customActivity.coordinates.lat.toFixed(4)},{" "}
							{customActivity.coordinates.lng.toFixed(4)}
						</Text>
						<Text style={styles.mapHint}>
							Нажмите по карте, чтобы выбрать точку
						</Text>
					</View>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Описание</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Дополнительная информация..."
						value={customActivity.description}
						onChangeText={(text) =>
							setCustomActivity((prev) => ({ ...prev, description: text }))
						}
						multiline
						numberOfLines={3}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Продолжительность</Text>
					<View style={styles.durationOptions}>
						{durationOptions.map((duration) => (
							<TouchableOpacity
								key={duration}
								style={[
									styles.durationOption,
									customActivity.duration === duration &&
										styles.durationOptionSelected,
								]}
								onPress={() =>
									setCustomActivity((prev) => ({ ...prev, duration }))
								}
							>
								<Text
									style={[
										styles.durationText,
										customActivity.duration === duration &&
											styles.durationTextSelected,
									]}
								>
									{duration} мин
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View style={styles.timeInfo}>
					<Text style={styles.timeInfoText}>
						Время: {planningRequest.startTime} -{" "}
						{calculateEndTime(
							planningRequest.startTime,
							customActivity.duration,
						)}
					</Text>
				</View>
			</ScrollView>

			<View style={styles.buttons}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => {
						// Возвращаемся к шагу параметров (шаг 2)
						setCurrentStep(2);
					}}
					activeOpacity={0.7}
				>
					<Feather name="arrow-left" size={20} color="#3b82f6" />
					<Text style={styles.backButtonText}>Назад</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.saveButton,
						(!customActivity.title.trim() || !customActivity.location.trim()) &&
							styles.saveButtonDisabled,
					]}
					disabled={
						!customActivity.title.trim() || !customActivity.location.trim()
					}
					onPress={handleSaveCustomActivity}
				>
					<Feather name="check" size={20} color="white" />
					<Text style={styles.saveButtonText}>Сохранить активность</Text>
				</TouchableOpacity>
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
		alignItems: "flex-start",
		padding: 20,
		paddingTop: Platform.OS === "ios" ? 50 : 20,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	headerBackButton: {
		padding: 8,
		marginRight: 12,
		marginTop: 4,
	},
	headerContent: {
		flex: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		lineHeight: 20,
	},
	form: {
		flex: 1,
		padding: 20,
	},
	field: {
		marginBottom: 24,
		backgroundColor: "white",
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: "white",
	},
	textArea: {
		height: 80,
		textAlignVertical: "top",
	},
	mapPlaceholder: {
		height: 200,
		backgroundColor: "#f8fafc",
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#e5e7eb",
		borderStyle: "dashed",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	mapPlaceholderText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
		marginTop: 8,
	},
	mapDescription: {
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
		marginTop: 8,
		lineHeight: 20,
	},
	coordinatesText: {
		fontSize: 12,
		color: "#9ca3af",
		marginTop: 8,
	},
	mapButton: {
		marginTop: 16,
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "#3b82f6",
		borderRadius: 8,
	},
	mapButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	durationOptions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	durationOption: {
		backgroundColor: "#f8fafc",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	durationOptionSelected: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	durationText: {
		fontSize: 14,
		color: "#374151",
		fontWeight: "500",
	},
	durationTextSelected: {
		color: "white",
	},
	timeInfo: {
		backgroundColor: "#f0f9ff",
		padding: 16,
		borderRadius: 8,
		marginTop: 8,
	},
	timeInfoText: {
		fontSize: 14,
		color: "#0369a1",
		fontWeight: "500",
		textAlign: "center",
	},
	buttons: {
		flexDirection: "row",
		gap: 12,
		padding: 20,
		paddingBottom: Platform.OS === "ios" ? 30 : 20,
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
		...(Platform.OS === "web"
			? {
					boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -2 },
					shadowOpacity: 0.05,
					shadowRadius: 10,
					elevation: 5,
				}),
	},
	backButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 18,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: "#3b82f6",
		backgroundColor: "white",
	},
	backButtonText: {
		color: "#3b82f6",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
	saveButton: {
		flex: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 18,
		borderRadius: 16,
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
	saveButtonDisabled: {
		backgroundColor: "#9ca3af",
	},
	saveButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
});
