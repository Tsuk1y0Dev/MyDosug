import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { TimeSelectionStep } from '../../components/planner/TimeSelectionStep';
import { ParametersStep } from '../../components/planner/ParametersStep';
import { SearchResultsStep } from '../../components/planner/SearchResultsStep';
import { RoutePlanningStep } from '../../components/planner/RoutePlanningStep';

interface PlannerContentProps {
  onPlanSaved: () => void;
}

export const PlannerContent: React.FC<PlannerContentProps> = ({ onPlanSaved }) => {
  const { currentStep } = usePlanner();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TimeSelectionStep />;
      case 2:
        return <ParametersStep />;
      case 3:
        return <SearchResultsStep />;
      case 4:
        return <RoutePlanningStep onPlanSaved={onPlanSaved} />;
      default:
        return <TimeSelectionStep />;
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
    paddingTop: 60, // Для кнопки закрытия
  },
});