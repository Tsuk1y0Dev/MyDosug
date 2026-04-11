import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	Platform,
	Modal,
	SafeAreaView,
} from "react-native";
import * as Location from "expo-location";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useSchedule } from "../../services/schedule/ScheduleContext";
import { useRoute as useDayRoute } from "../../services/planner/RouteContext";
import { useDeviceCoords } from "../../hooks/useDeviceCoords";
import { useFavorites } from "../../services/favorites/FavoritesContext";
import { Activity } from "../../types/schedule";
import { Feather } from "@expo/vector-icons";
import { calculateEndTime } from "../../utils/timingUtils";
import { YandexMap } from "../maps/YandexMap";
import { buildUserCreatedPlace } from "../../utils/placeConverters";
import type { RouteEvent } from "../../types/route";

interface CustomActivityStepProps {
	onPlanSaved?: () => void;
}

function formatCoords(c: { lat: number; lng: number }) {
	return `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
}

function parseCoordsText(text: string): { lat: number; lng: number } | null {
	const parts = text
		.split(/[,;]+/)
		.map((s) => s.trim())
		.filter(Boolean);
	if (parts.length < 2) return null;
	const lat = parseFloat(parts[0].replace(",", "."));
	const lng = parseFloat(parts[1].replace(",", "."));
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
}

const DEFAULT_COORDS = { lat: 55.75, lng: 37.62 };

export const CustomActivityStep: React.FC<CustomActivityStepProps> = ({
	onPlanSaved,
}) => {
	const {
		planningRequest,
		setCurrentStep,
		planningDate,
		catalogStandalone,
		dismissCatalogStandalone,
	} = usePlanner();
	const { addActivity } = useSchedule();
	const { insertEventWithOrigin, events } = useDayRoute();
	const { addUserCreatedPlace } = useFavorites();
	const deviceCoords = useDeviceCoords();

	const [customActivity, setCustomActivity] = useState({
		title: "",
		description: "",
	});
	const [coordinates, setCoordinates] = useState(DEFAULT_COORDS);
	const [coordText, setCoordText] = useState(formatCoords(DEFAULT_COORDS));
	const [durationMinutes, setDurationMinutes] = useState(60);
	const [durationText, setDurationText] = useState("60");
	const [mapModalVisible, setMapModalVisible] = useState(false);

	const applyCoords = useCallback((c: { lat: number; lng: number }) => {
		setCoordinates(c);
		setCoordText(formatCoords(c));
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted" || cancelled) return;
				const pos = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});
				if (cancelled) return;
				const c = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				applyCoords(c);
			} catch {
				// оставляем DEFAULT_COORDS
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [applyCoords]);

	const onCoordTextBlur = () => {
		const parsed = parseCoordsText(coordText);
		if (parsed) {
			applyCoords(parsed);
		} else {
			setCoordText(formatCoords(coordinates));
			Alert.alert("Координаты", "Введите две числа: широта и долгота через запятую.");
		}
	};

	const onDurationTextBlur = () => {
		const n = parseInt(durationText.replace(/\D/g, ""), 10);
		if (!Number.isFinite(n) || n < 1) {
			setDurationText(String(durationMinutes));
			return;
		}
		const clamped = Math.min(24 * 60, Math.max(1, n));
		setDurationMinutes(clamped);
		setDurationText(String(clamped));
	};

	const mapPreviewCenter = useMemo(() => coordinates, [coordinates]);

	const handleSaveCustomActivity = () => {
		if (!customActivity.title.trim()) {
			Alert.alert("Ошибка", "Введите название активности");
			return;
		}

		const coords = parseCoordsText(coordText) ?? coordinates;
		if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
			Alert.alert("Ошибка", "Укажите корректные координаты (широта, долгота)");
			return;
		}

		const activityId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const newActivity: Activity = {
			id: activityId,
			title: customActivity.title.trim(),
			startTime: planningRequest.startTime,
			endTime: calculateEndTime(
				planningRequest.startTime,
				durationMinutes,
			),
			location: formatCoords(coords),
			coordinates: coords,
			type: "custom",
			description: customActivity.description,
			duration: durationMinutes,
			date: planningDate ? planningDate.toISOString().split("T")[0] : undefined,
		};

		const place = buildUserCreatedPlace(
			`place-${activityId}`,
			newActivity.title,
			coords,
			customActivity.description.trim(),
		);
		addUserCreatedPlace(place);

		if (catalogStandalone) {
			if (onPlanSaved) onPlanSaved();
			else dismissCatalogStandalone();
			return;
		}

		addActivity(newActivity);

		const routeEvent: RouteEvent = {
			id: `ev-${activityId}`,
			placeId: place.id,
			customTitle: newActivity.title,
			coords,
			arrivalTime: planningRequest.startTime,
			duration: durationMinutes,
			travelModeToNext: "driving",
			lockTimes: true,
			description: customActivity.description.trim() || undefined,
			address: formatCoords(coords),
			openingHours: "Не нашли время работы",
			budgetNote: "Не нашли информацию о бюджете",
		};

		const afterSave = () => {
			if (onPlanSaved) onPlanSaved();
			else setCurrentStep(1);
		};

		const wasEmpty = events.length === 0;
		if (!wasEmpty) {
			insertEventWithOrigin(events.length, routeEvent, "unchanged");
			afterSave();
			return;
		}

		Alert.alert(
			"Первое место",
			"Построить маршрут от вашей геолокации до этой точки?",
			[
				{
					text: "Нет, только точки плана",
					style: "cancel",
					onPress: () => {
						insertEventWithOrigin(events.length, routeEvent, {
							id: "from_first_stop",
							label: newActivity.title,
							coords,
						});
						afterSave();
					},
				},
				{
					text: "Да, от меня",
					onPress: () => {
						if (deviceCoords) {
							insertEventWithOrigin(events.length, routeEvent, {
								id: "default",
								label: "Вы здесь",
								coords: deviceCoords,
							});
							afterSave();
						} else {
							Alert.alert(
								"Геолокация",
								"Не удалось получить координаты. Маршрут начнётся с первой точки.",
								[
									{
										text: "Понятно",
										onPress: () => {
											insertEventWithOrigin(events.length, routeEvent, {
												id: "from_first_stop",
												label: newActivity.title,
												coords,
											});
											afterSave();
										},
									},
								],
							);
						}
					},
				},
			],
		);
	};

	const canSave =
		customActivity.title.trim().length > 0 && parseCoordsText(coordText) != null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.headerBackButton}
					onPress={() =>
						catalogStandalone
							? dismissCatalogStandalone()
							: setCurrentStep(2)
					}
				>
					<Feather name="arrow-left" size={24} color="#374151" />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.title}>Создать свою активность</Text>
					<Text style={styles.subtitle}>
						Название, координаты на карте и при желании описание
					</Text>
				</View>
			</View>

			<ScrollView style={styles.form}>
				<View style={styles.field}>
					<Text style={styles.label}>Название активности *</Text>
					<TextInput
						style={styles.input}
						placeholder="Например: встреча с друзьями"
						value={customActivity.title}
						onChangeText={(text) =>
							setCustomActivity((prev) => ({ ...prev, title: text }))
						}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Координаты * (широта, долгота)</Text>
					<TextInput
						style={styles.input}
						placeholder="52.034000, 113.501000"
						value={coordText}
						onChangeText={setCoordText}
						onBlur={onCoordTextBlur}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<Text style={styles.hint}>
						Только числа через запятую; при выборе на карте поле обновится
						автоматически
					</Text>
					<TouchableOpacity
						style={styles.openMapBtn}
						onPress={() => setMapModalVisible(true)}
					>
						<Feather name="map" size={18} color="#fff" />
						<Text style={styles.openMapBtnText}>Выбрать точку на карте</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Описание (по желанию)</Text>
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
					<Text style={styles.label}>Продолжительность (минуты, шаг 1 мин)</Text>
					<TextInput
						style={styles.input}
						value={durationText}
						onChangeText={setDurationText}
						onBlur={onDurationTextBlur}
						keyboardType="number-pad"
						placeholder="60"
					/>
				</View>

				<View style={styles.timeInfo}>
					<Text style={styles.timeInfoText}>
						Время: {planningRequest.startTime} —{" "}
						{calculateEndTime(
							planningRequest.startTime,
							durationMinutes,
						)}
					</Text>
				</View>
			</ScrollView>

			<View style={styles.buttons}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => setCurrentStep(2)}
					activeOpacity={0.7}
				>
					<Feather name="arrow-left" size={20} color="#3b82f6" />
					<Text style={styles.backButtonText}>Назад</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
					disabled={!canSave}
					onPress={handleSaveCustomActivity}
				>
					<Feather name="check" size={20} color="white" />
					<Text style={styles.saveButtonText}>Сохранить активность</Text>
				</TouchableOpacity>
			</View>

			<Modal
				visible={mapModalVisible}
				animationType="slide"
				onRequestClose={() => setMapModalVisible(false)}
			>
				<SafeAreaView style={styles.mapModalContainer}>
					<View style={styles.mapModalHeader}>
						<TouchableOpacity onPress={() => setMapModalVisible(false)}>
							<Text style={styles.mapModalCancel}>Отмена</Text>
						</TouchableOpacity>
						<Text style={styles.mapModalTitle}>Выберите точку</Text>
						<TouchableOpacity
							onPress={() => setMapModalVisible(false)}
						>
							<Text style={styles.mapModalDone}>Готово</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.mapModalBody}>
						<YandexMap
							center={mapPreviewCenter}
							zoom={15}
							markers={[]}
							height={Platform.OS === "web" ? 360 : 420}
							selectionMode
							selectedPoint={coordinates}
							onSelectPoint={(c) => {
								applyCoords(c);
							}}
							routingEnabled={false}
							fitAllMarkers={false}
						/>
						<Text style={styles.mapModalCoords}>
							{formatCoords(coordinates)}
						</Text>
					</View>
				</SafeAreaView>
			</Modal>
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
	hint: {
		fontSize: 12,
		color: "#9ca3af",
		marginTop: 8,
		lineHeight: 16,
	},
	openMapBtn: {
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#3b82f6",
		paddingVertical: 12,
		borderRadius: 12,
	},
	openMapBtnText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
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
	mapModalContainer: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	mapModalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	mapModalTitle: {
		fontSize: 17,
		fontWeight: "600",
		color: "#111827",
	},
	mapModalCancel: {
		fontSize: 16,
		color: "#6b7280",
	},
	mapModalDone: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3b82f6",
	},
	mapModalBody: {
		flex: 1,
		padding: 12,
		minHeight: 400,
	},
	mapModalCoords: {
		marginTop: 10,
		textAlign: "center",
		fontSize: 14,
		color: "#64748b",
	},
});
