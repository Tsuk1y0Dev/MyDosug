import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PlannerProvider, usePlanner } from '../../services/planner/PlannerContext';
import { TimeSelectionStep } from '../../components/planner/TimeSelectionStep';
import { ParametersStep } from '../../components/planner/ParametersStep';
import { SearchResultsStep } from '../../components/planner/SearchResultsStep';
import { RoutePlanningStep } from '../../components/planner/RoutePlanningStep';

const PlannerContent = () => {
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
        return <RoutePlanningStep />;
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

export const PlannerScreen = () => {
  return (
    <PlannerProvider>
      <PlannerContent />
    </PlannerProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});