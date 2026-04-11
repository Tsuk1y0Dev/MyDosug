import React, { useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameLocalDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** Первая ячейка — понедельник недели, содержащей 1-е число `visibleMonth`. */
export function buildMonthGrid(visibleMonth: Date): { date: Date; inMonth: boolean }[] {
	const y = visibleMonth.getFullYear();
	const m = visibleMonth.getMonth();
	const first = new Date(y, m, 1);
	const startPad = (first.getDay() + 6) % 7;
	const dim = new Date(y, m + 1, 0).getDate();
	const prevDim = new Date(y, m, 0).getDate();
	const out: { date: Date; inMonth: boolean }[] = [];

	for (let i = 0; i < startPad; i++) {
		const day = prevDim - startPad + i + 1;
		out.push({ date: new Date(y, m - 1, day), inMonth: false });
	}
	for (let d = 1; d <= dim; d++) {
		out.push({ date: new Date(y, m, d), inMonth: true });
	}
	while (out.length < 42) {
		const last = out[out.length - 1].date;
		out.push({
			date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
			inMonth: false,
		});
	}
	return out.slice(0, 42);
}

function monthTitleRu(d: Date): string {
	const raw = d.toLocaleString("ru-RU", { month: "long", year: "numeric" });
	return raw.charAt(0).toUpperCase() + raw.slice(1);
}

type Props = {
	selectedDate: Date;
	/** Первый день отображаемого месяца (например new Date(y, m, 1)). */
	visibleMonth: Date;
	minDate: Date;
	onSelectDay: (day: Date) => void;
	onPrevMonth: () => void;
	onNextMonth: () => void;
};

export const PlanCalendarPicker: React.FC<Props> = ({
	selectedDate,
	visibleMonth,
	minDate,
	onSelectDay,
	onPrevMonth,
	onNextMonth,
}) => {
	const cells = useMemo(
		() => buildMonthGrid(visibleMonth),
		[visibleMonth],
	);
	const today = startOfLocalDay(new Date());
	const minT = startOfLocalDay(minDate).getTime();

	const canPrevMonth = useMemo(() => {
		const v = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
		const mn = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
		return v.getTime() > mn.getTime();
	}, [visibleMonth, minDate]);

	return (
		<View style={styles.wrap}>
			<View style={styles.monthNav}>
				<TouchableOpacity
					style={[styles.navBtn, !canPrevMonth && styles.navBtnDisabled]}
					onPress={onPrevMonth}
					disabled={!canPrevMonth}
					hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
				>
					<Feather
						name="chevron-left"
						size={26}
						color={canPrevMonth ? "#1e293b" : "#cbd5e1"}
					/>
				</TouchableOpacity>
				<Text style={styles.monthTitle} numberOfLines={1}>
					{monthTitleRu(visibleMonth)}
				</Text>
				<TouchableOpacity
					style={styles.navBtn}
					onPress={onNextMonth}
					hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
				>
					<Feather name="chevron-right" size={26} color="#1e293b" />
				</TouchableOpacity>
			</View>

			<View style={styles.weekRow}>
				{WEEKDAYS.map((w) => (
					<Text key={w} style={styles.weekday}>
						{w}
					</Text>
				))}
			</View>

			<View style={styles.grid}>
				{cells.map(({ date, inMonth }, idx) => {
					const start = startOfLocalDay(date).getTime();
					const disabled = start < minT;
					const selected = sameLocalDay(date, selectedDate);
					const isToday = sameLocalDay(date, today);

					return (
						<TouchableOpacity
							key={`${idx}-${date.getTime()}`}
							style={styles.cellTouch}
							disabled={disabled}
							activeOpacity={disabled ? 1 : 0.7}
							onPress={() => onSelectDay(startOfLocalDay(date))}
						>
							<View
								style={[
									styles.cellInner,
									!inMonth && styles.cellOtherMonth,
									disabled && styles.cellDisabled,
									selected && styles.cellSelected,
									isToday && !selected && styles.cellToday,
								]}
							>
								<Text
									style={[
										styles.cellText,
										!inMonth && styles.cellTextMuted,
										disabled && styles.cellTextDisabled,
										selected && styles.cellTextSelected,
									]}
									numberOfLines={1}
								>
									{date.getDate()}
								</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		width: "100%",
		paddingBottom: 4,
	},
	monthNav: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 18,
		paddingHorizontal: 4,
	},
	navBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#f1f5f9",
		alignItems: "center",
		justifyContent: "center",
	},
	navBtnDisabled: {
		backgroundColor: "#f8fafc",
	},
	monthTitle: {
		flex: 1,
		textAlign: "center",
		fontSize: 19,
		fontWeight: "700",
		color: "#0f172a",
		letterSpacing: Platform.OS === "ios" ? -0.3 : 0,
		paddingHorizontal: 8,
	},
	weekRow: {
		flexDirection: "row",
		marginBottom: 10,
	},
	weekday: {
		width: "14.2857%",
		textAlign: "center",
		fontSize: 12,
		fontWeight: "700",
		color: "#94a3b8",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	cellTouch: {
		width: "14.2857%",
		aspectRatio: 1,
		padding: 3,
	},
	cellInner: {
		flex: 1,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 40,
	},
	cellOtherMonth: {
		opacity: 0.35,
	},
	cellDisabled: {
		opacity: 0.22,
	},
	cellToday: {
		borderWidth: 2,
		borderColor: "#93c5fd",
		backgroundColor: "#eff6ff",
	},
	cellSelected: {
		backgroundColor: "#3b82f6",
		borderWidth: 0,
		...(Platform.OS === "web"
			? { boxShadow: "0 4px 14px rgba(59, 130, 246, 0.45)" }
			: {
					shadowColor: "#3b82f6",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.35,
					shadowRadius: 8,
					elevation: 4,
				}),
	},
	cellText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1e293b",
	},
	cellTextMuted: {
		color: "#64748b",
		fontWeight: "500",
	},
	cellTextDisabled: {
		color: "#cbd5e1",
	},
	cellTextSelected: {
		color: "#ffffff",
		fontWeight: "700",
	},
});
