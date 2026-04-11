import type React from "react";
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { ParametersStep } from "../../components/planner/ParametersStep";
import { SearchResultsStep } from "../../components/planner/SearchResultsStep";
import { RoutePlanningStep } from "../../components/planner/RoutePlanningStep";
import { CustomActivityStep } from "../../components/planner/CustomActivityStep";
import { ProgressIndicator } from "../../components/planner/ProgressIndicator";

interface PlannerContentProps {
	onPlanSaved: () => void;
}

export const PlannerContent: React.FC<PlannerContentProps> = ({
	onPlanSaved,
}) => {
	const { currentStep, planningRequest } = usePlanner();

	// Определяем общее количество шагов и метки
	const { totalSteps, stepLabels } = useMemo(() => {
		// Убираем выбор "single/chain": везде логика работает как "single".
		// Оставляем 4 шага для визуальной совместимости, но шаг "Тип" не отображаем.
		return {
			totalSteps: 4,
			stepLabels: ["", "Параметры", "Результаты", "Маршрут"],
		};
	}, []);

	// Нормализуем текущий шаг для индикатора
	const normalizedStep = useMemo(() => {
		// Для single: 0->0, 1->1, 2->1, 3->2, 4->3
		if (currentStep === 0) return 0;
		if (currentStep === 1 || currentStep === 2) return 1;
		if (currentStep === 3) return 2;
		if (currentStep === 4) return 3;
		return 0;
	}, [currentStep]);

	const renderStep = () => {
		switch (currentStep) {
			case 0:
				// Шаг 0: больше не показываем выбор типа (цепочка отключена)
				return <ParametersStep />;
			case 1:
				// Шаг 1: для single всегда сразу параметры
				return <ParametersStep />;
			case 2:
				// Шаг 2: Параметры поиска или создание кастомной активности
				if (planningRequest.activityType === "custom") {
					return <CustomActivityStep onPlanSaved={onPlanSaved} />;
				}
				return <ParametersStep />;
			case 3:
				// Шаг 3: Результаты поиска (только если не custom)
				if (planningRequest.activityType === "custom") {
					// Если custom, уже создали активность на шаге 2, возвращаемся
					return <CustomActivityStep onPlanSaved={onPlanSaved} />;
				}
				return <SearchResultsStep onPlanSaved={onPlanSaved} />;
			case 4:
				// Шаг 4: Планирование маршрута
				return <RoutePlanningStep onPlanSaved={onPlanSaved} />;
			default:
				return <ParametersStep />;
		}
	};

	return (
		<View style={styles.container}>
			{currentStep > 0 && (
				<ProgressIndicator
					currentStep={normalizedStep}
					totalSteps={totalSteps}
					stepLabels={stepLabels}
				/>
			)}
			{renderStep()}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
});
