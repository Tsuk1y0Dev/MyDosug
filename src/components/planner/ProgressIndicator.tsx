import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels = [],
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  step < currentStep && styles.stepCircleCompleted,
                  step === currentStep && styles.stepCircleActive,
                ]}
              >
                {step < currentStep ? (
                  <Feather name="check" size={16} color="white" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    step === currentStep && styles.stepNumberActive,
                  ]}>
                    {step + 1}
                  </Text>
                )}
              </View>
              {stepLabels[index] && (
                <Text style={[
                  styles.stepLabel,
                  step === currentStep && styles.stepLabelActive,
                  step < currentStep && styles.stepLabelCompleted,
                ]}>
                  {stepLabels[index]}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  step < currentStep && styles.progressLineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.textInverse,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: colors.textSecondary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
    maxWidth: 60,
  },
  progressLineCompleted: {
    backgroundColor: colors.success,
  },
});

