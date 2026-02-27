import type React from "react";
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { usePlanner } from "../../services/planner/PlannerContext";
import { PlanTypeStep } from "../../components/planner/PlanTypeStep";
import { TimeSelectionStep } from "../../components/planner/TimeSelectionStep";
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
		if (planningRequest.planType === "single") {
			// Для одного мероприятия: тип плана -> параметры -> результаты -> маршрут (4 шага)
			return {
				totalSteps: 4,
				stepLabels: ["Тип", "Параметры", "Результаты", "Маршрут"],
			};
		} else {
			// Для цепочки: тип плана -> время -> параметры -> результаты -> маршрут (5 шагов)
			return {
				totalSteps: 5,
				stepLabels: ["Тип", "Время", "Параметры", "Результаты", "Маршрут"],
			};
		}
	}, [planningRequest.planType]);

	// Нормализуем текущий шаг для индикатора
	const normalizedStep = useMemo(() => {
		if (planningRequest.planType === "single") {
			// Для single: 0->0, 1->1 (ParametersStep), 2->1 (если custom), 3->2, 4->3
			if (currentStep === 0) return 0;
			if (currentStep === 1 || currentStep === 2) return 1;
			if (currentStep === 3) return 2;
			if (currentStep === 4) return 3;
			return 0;
		} else {
			// Для chain: 0->0, 1->1, 2->2, 3->3, 4->4
			return Math.min(currentStep, totalSteps - 1);
		}
	}, [currentStep, planningRequest.planType, totalSteps]);

	const renderStep = () => {
		switch (currentStep) {
			case 0:
				// Шаг 0: Выбор типа плана (одно мероприятие или цепочка)
				return <PlanTypeStep />;
			case 1:
				// Шаг 1: Выбор времени (только для цепочки) или параметры (для одного мероприятия)
				if (planningRequest.planType === "chain") {
					return <TimeSelectionStep />;
				}
				// Для одного мероприятия сразу переходим к параметрам
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
				return <PlanTypeStep />;
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

