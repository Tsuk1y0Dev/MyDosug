import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Platform,
	KeyboardAvoidingView,
	ScrollView,
	Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { minutesToTime, timeToMinutes } from "../../utils/timingUtils";
import { isOpenAtMinutesFromRaw } from "../../utils/openingHoursRu";

type Props = {
	visible: boolean;
	onClose: () => void;
	/** Возвращает время прибытия HH:mm и длительность в минутах */
	onConfirm: (arrivalTime: string, durationMinutes: number) => void;
	placeTitle: string;
	/** Рекомендуемое время прибытия (с учётом логистики) */
	defaultArrival: string;
	defaultDurationMinutes: number;
	/** Минимально допустимое время прибытия (минуты от полуночи) */
	minArrivalMinutes: number;
	/** Название события/старт для текста конфликта */
	blockingEventTitle: string;
	/** Строка opening_hours из OSM — для предупреждения «может быть закрыто» */
	openingHoursRaw?: string;
	planningDate?: Date;
};

export function AddToRouteTimeModal({
	visible,
	onClose,
	onConfirm,
	placeTitle,
	defaultArrival,
	defaultDurationMinutes,
	minArrivalMinutes,
	blockingEventTitle,
	openingHoursRaw,
	planningDate,
}: Props) {
	const [arrival, setArrival] = useState(defaultArrival);
	const [durationText, setDurationText] = useState(
		String(defaultDurationMinutes),
	);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [wheelDate, setWheelDate] = useState(() => new Date());

	const parseArrivalMin = useCallback(
		(t: string): number | null => {
			let s = t.trim();
			if (!/^\d{1,2}:\d{2}$/.test(s)) return null;
			const [h, m] = s.split(":").map(Number);
			if (h > 23 || m > 59) return null;
			s = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
			try {
				return timeToMinutes(s);
			} catch {
				return null;
			}
		},
		[],
	);

	useEffect(() => {
		if (visible) {
			setArrival(defaultArrival);
			setDurationText(String(defaultDurationMinutes));
			setShowTimePicker(false);
			const [h, m] = defaultArrival.split(":").map(Number);
			const d = new Date();
			d.setHours(
				Number.isFinite(h) ? h : 12,
				Number.isFinite(m) ? m : 0,
				0,
				0,
			);
			setWheelDate(d);
		}
	}, [visible, defaultArrival, defaultDurationMinutes]);

	const currentArrivalMin = useMemo(() => {
		const p = parseArrivalMin(arrival);
		if (p === null) return minArrivalMinutes;
		return Math.max(minArrivalMinutes, p);
	}, [arrival, minArrivalMinutes, parseArrivalMin]);

	const quickTimes = useMemo(() => {
		const minM = minArrivalMinutes;
		const out: { label: string; time: string }[] = [];
		const uniq = new Set<string>();
		const add = (label: string, mins: number) => {
			const clamped = Math.min(
				24 * 60 - 1,
				Math.max(minM, mins),
			);
			const t = minutesToTime(clamped);
			if (uniq.has(t)) return;
			uniq.add(t);
			out.push({ label, time: t });
		};
		add("Минимум", minM);
		const base = currentArrivalMin;
		const next15 = Math.floor(base / 15) * 15 + 15;
		add("Следующий 15 мин", next15);
		const nextHour = Math.ceil((base + 1) / 60) * 60;
		add("Следующий час", nextHour);
		add("Рекомендация", timeToMinutes(defaultArrival));
		return out;
	}, [minArrivalMinutes, currentArrivalMin, defaultArrival]);

	const openWheel = useCallback(() => {
		const p = parseArrivalMin(arrival);
		const m = p ?? minArrivalMinutes;
		const d = new Date();
		d.setHours(Math.floor(m / 60), m % 60, 0, 0);
		setWheelDate(d);
		setShowTimePicker((v) => !v);
	}, [arrival, minArrivalMinutes, parseArrivalMin]);

	const arrivalConflict =
		visible &&
		(() => {
			let t = arrival.trim();
			if (!/^\d{1,2}:\d{2}$/.test(t)) return false;
			const [h, m] = t.split(":").map(Number);
			if (h > 23 || m > 59) return false;
			t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
			try {
				return timeToMinutes(t) < minArrivalMinutes;
			} catch {
				return false;
			}
		})();

	const runConfirm = () => {
		const dur = parseInt(durationText.replace(/\D/g, ""), 10);
		if (!Number.isFinite(dur) || dur < 1) {
			return;
		}
		let t = arrival.trim();
		if (!/^\d{1,2}:\d{2}$/.test(t)) {
			return;
		}
		const [h, m] = t.split(":").map(Number);
		if (h > 23 || m > 59) return;
		t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		let arrMin: number;
		try {
			arrMin = timeToMinutes(t);
		} catch {
			return;
		}
		if (arrMin < minArrivalMinutes) {
			return;
		}
		onConfirm(t, Math.min(24 * 60, dur));
		onClose();
	};

	const handleConfirm = () => {
		const dur = parseInt(durationText.replace(/\D/g, ""), 10);
		if (!Number.isFinite(dur) || dur < 1) {
			return;
		}
		let t = arrival.trim();
		if (!/^\d{1,2}:\d{2}$/.test(t)) {
			return;
		}
		const [h, m] = t.split(":").map(Number);
		if (h > 23 || m > 59) return;
		t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		let arrMin: number;
		try {
			arrMin = timeToMinutes(t);
		} catch {
			return;
		}
		if (arrMin < minArrivalMinutes) {
			return;
		}

		if (openingHoursRaw?.trim() && planningDate) {
			const open = isOpenAtMinutesFromRaw(
				openingHoursRaw,
				planningDate,
				arrMin,
			);
			if (open === false) {
				Alert.alert(
					"Часы работы",
					"По данным о часах в это время место может быть закрыто. Всё равно добавить в план?",
					[
						{ text: "Отмена", style: "cancel" },
						{ text: "Добавить", onPress: runConfirm },
					],
				);
				return;
			}
		}
		runConfirm();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<TouchableOpacity
					style={styles.backdrop}
					activeOpacity={1}
					onPress={onClose}
				/>
				<View style={styles.card}>
					<Text style={styles.title}>В маршрут</Text>
					<Text style={styles.subtitle} numberOfLines={2}>
						{placeTitle}
					</Text>

					<Text style={styles.label}>Время прибытия</Text>
					<Text style={styles.hint}>
						Рекомендуем: {defaultArrival} (с учётом дороги после «
						{blockingEventTitle}»)
					</Text>
					<TextInput
						style={[styles.input, arrivalConflict && styles.inputError]}
						value={arrival}
						onChangeText={setArrival}
						placeholder="09:30"
						keyboardType="numbers-and-punctuation"
					/>
					{arrivalConflict ? (
						<Text style={styles.errorText}>
							Не раньше {minutesToTime(minArrivalMinutes)} (после «
							{blockingEventTitle}», без учёта дороги).
						</Text>
					) : null}

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.chipsRow}
					>
						{quickTimes.map((q) => (
							<TouchableOpacity
								key={q.label + q.time}
								style={styles.timeChip}
								onPress={() => setArrival(q.time)}
							>
								<Text style={styles.timeChipText}>{q.label}</Text>
								<Text style={styles.timeChipSub}>{q.time}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>

					<TouchableOpacity style={styles.clockBtn} onPress={openWheel}>
						<Feather name="clock" size={18} color="#1d4ed8" />
						<Text style={styles.clockBtnText}>Выбрать время</Text>
					</TouchableOpacity>
					{showTimePicker ? (
						<DateTimePicker
							value={wheelDate}
							mode="time"
							is24Hour
							display={Platform.OS === "ios" ? "spinner" : "default"}
							onChange={(ev, date) => {
								if (Platform.OS === "android") {
									setShowTimePicker(false);
								}
								if (
									ev &&
									"type" in ev &&
									(ev as { type?: string }).type === "dismissed"
								) {
									return;
								}
								if (!date) return;
								setWheelDate(date);
								const hh = String(date.getHours()).padStart(2, "0");
								const mm = String(date.getMinutes()).padStart(2, "0");
								setArrival(`${hh}:${mm}`);
							}}
						/>
					) : null}

					<Text style={styles.label}>Пребывание (мин.)</Text>
					<TextInput
						style={styles.input}
						value={durationText}
						onChangeText={setDurationText}
						keyboardType="number-pad"
						placeholder="60"
					/>

					<View style={styles.row}>
						<TouchableOpacity style={styles.btnGhost} onPress={onClose}>
							<Text style={styles.btnGhostText}>Отмена</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.btnPrimary,
								arrivalConflict && styles.btnPrimaryDisabled,
							]}
							onPress={handleConfirm}
							disabled={arrivalConflict}
						>
							<Feather name="check" size={18} color="#fff" />
							<Text style={styles.btnPrimaryText}>Добавить</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.45)",
	},
	card: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 20,
	},
	hint: {
		fontSize: 12,
		color: "#6b7280",
		marginBottom: 8,
		lineHeight: 16,
	},
	inputError: {
		borderColor: "#ef4444",
	},
	errorText: {
		fontSize: 12,
		color: "#dc2626",
		marginTop: -8,
		marginBottom: 12,
		lineHeight: 16,
	},
	btnPrimaryDisabled: {
		opacity: 0.45,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 16,
	},
	label: {
		fontSize: 13,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 6,
	},
	input: {
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 10,
		padding: 12,
		fontSize: 16,
		marginBottom: 14,
	},
	row: {
		flexDirection: "row",
		gap: 10,
		marginTop: 8,
	},
	btnGhost: {
		flex: 1,
		paddingVertical: 14,
		alignItems: "center",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	btnGhostText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
	},
	btnPrimary: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: "#3b82f6",
	},
	btnPrimaryText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	chipsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
		paddingVertical: 4,
	},
	timeChip: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		minWidth: 100,
	},
	timeChipText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#64748b",
	},
	timeChipSub: {
		fontSize: 15,
		fontWeight: "700",
		color: "#0f172a",
		marginTop: 2,
	},
	clockBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 14,
		paddingVertical: 10,
	},
	clockBtnText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1d4ed8",
	},
});
