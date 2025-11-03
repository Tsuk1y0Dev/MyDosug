import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { PlanTypeStep } from '../../components/planner/PlanTypeStep';
import { TimeSelectionStep } from '../../components/planner/TimeSelectionStep';
import { ParametersStep } from '../../components/planner/ParametersStep';
import { SearchResultsStep } from '../../components/planner/SearchResultsStep';
import { RoutePlanningStep } from '../../components/planner/RoutePlanningStep';
import { CustomActivityStep } from '../../components/planner/CustomActivityStep';

interface PlannerContentProps {
  onPlanSaved: () => void;
}

export const PlannerContent: React.FC<PlannerContentProps> = ({ onPlanSaved }) => {
  const { currentStep, planningRequest } = usePlanner();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <PlanTypeStep />;
      case 1:
        return <TimeSelectionStep />;
      case 2:
        // Используем тип активности для определения, показывать ли кастомную активность
        // Добавляем проверку на существование planType
        if (planningRequest.planType === 'single' && planningRequest.activityType === 'custom') {
          return <CustomActivityStep />;
        }
        return <ParametersStep />;
      case 3:
        return <SearchResultsStep />;
      case 4:
        return <RoutePlanningStep onPlanSaved={onPlanSaved} />;
      default:
        return <PlanTypeStep />;
    }
  };

  return (
    <View style={styles.container}>
      {renderStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 60,
  },
});