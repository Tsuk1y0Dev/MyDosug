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

	const { totalSteps, stepLabels } = useMemo(() => {
		return {
			totalSteps: 4,
			stepLabels: ["", "Параметры", "Результаты", "Маршрут"],
		};
	}, []);

	const normalizedStep = useMemo(() => {
		if (currentStep === 0) return 0;
		if (currentStep === 1 || currentStep === 2) return 1;
		if (currentStep === 3) return 2;
		if (currentStep === 4) return 3;
		return 0;
	}, [currentStep]);

	const renderStep = () => {
		switch (currentStep) {
			case 0:
				return <ParametersStep />;
			case 1:
				return <ParametersStep />;
			case 2:
				if (planningRequest.activityType === "custom") {
					return <CustomActivityStep onPlanSaved={onPlanSaved} />;
				}
				return <ParametersStep />;
			case 3:
				if (planningRequest.activityType === "custom") {
					return <CustomActivityStep onPlanSaved={onPlanSaved} />;
				}
				return <SearchResultsStep onPlanSaved={onPlanSaved} />;
			case 4:
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
