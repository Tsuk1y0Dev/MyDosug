import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export const SupportContent = () => {
	return (
		<ScrollView>
			<Text style={styles.h1}>Помощь и поддержка</Text>
			<Text style={styles.p}>
				Ниже приведены рекомендации по использованию приложения и порядок
				обращения в поддержку.
			</Text>

			<Text style={styles.h2}>1. Частые вопросы</Text>
			<Text style={styles.p}>
				Если маршрут построен не так, как ожидается, проверьте исходную точку,
				последовательность мест и выбранный тип передвижения между точками.
			</Text>

			<Text style={styles.h2}>2. Проблемы с геолокацией</Text>
			<Text style={styles.p}>
				Разрешите доступ к геопозиции в настройках устройства или выберите
				альтернативный источник стартовой точки: центр города или точку на карте.
			</Text>

			<Text style={styles.h2}>3. Уведомления</Text>
			<Text style={styles.p}>
				Уведомления работают только при выданном системном разрешении. Если
				разрешение было отклонено, включите его в настройках устройства.
			</Text>

			<Text style={styles.h2}>4. Обращение в поддержку</Text>
			<Text style={styles.p}>
				При обращении укажите модель устройства, версию ОС, версию приложения и
				краткое описание проблемы с шагами воспроизведения.
			</Text>

			<Text style={styles.h2}>5. Сроки обработки</Text>
			<Text style={styles.p}>
				Запросы обрабатываются в рабочее время в разумный срок. Сложные
				технические вопросы могут требовать дополнительной диагностики.
			</Text>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	h1: { fontSize: 22, fontWeight: "800", color: "#111827", margin: 16 },
	h2: {
		fontSize: 16,
		fontWeight: "700",
		color: "#111827",
		marginHorizontal: 16,
		marginTop: 14,
	},
	p: {
		fontSize: 14,
		color: "#374151",
		marginHorizontal: 16,
		marginTop: 8,
		lineHeight: 20,
	},
});

