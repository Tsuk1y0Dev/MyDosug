import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { Feather } from '@expo/vector-icons';
import { mockStartPoints, activityTypes, moodTypes, companyTypes } from '../../data/mockPlaces';
import { Platform } from 'react-native';

export const ParametersStep = () => {
  const { planningRequest, updatePlanningRequest, searchPlaces, setCurrentStep } = usePlanner();
  const [customAddress, setCustomAddress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStartPointSelect = (point: any) => {
    updatePlanningRequest({ startPoint: point });
  };

  const handleBudgetChange = (value: number) => {
    updatePlanningRequest({ budget: value });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Параметры активности</Text>
        <Text style={styles.subtitle}>Настройте параметры для поиска подходящих мест</Text>

        {/* Точка старта */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Точка старта</Text>
          <View style={styles.startPoints}>
            {mockStartPoints.map((point, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.startPoint,
                  planningRequest.startPoint.type === point.type && styles.startPointSelected,
                ]}
                onPress={() => handleStartPointSelect(point)}
              >
                <Text style={[
                  styles.startPointText,
                  planningRequest.startPoint.type === point.type && styles.startPointTextSelected,
                ]}>
                  {point.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.addressInput}
            placeholder="Или введите адрес вручную..."
            value={customAddress}
            onChangeText={setCustomAddress}
            onSubmitEditing={() => {
              if (customAddress.trim()) {
                handleStartPointSelect({
                  type: 'custom',
                  address: customAddress.trim(),
                });
              }
            }}
          />
        </View>

        {/* Бюджет */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Бюджет</Text>
            <Text style={styles.budgetValue}>До {planningRequest.budget} ₽</Text>
            
            {Platform.OS === 'web' ? (
                <View style={styles.webSliderContainer}>
                <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={planningRequest.budget}
                    onChange={(e) => handleBudgetChange(Number(e.target.value))}
                    style={styles.webSlider}
                />
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0</Text>
                    <Text style={styles.sliderLabel}>2500</Text>
                    <Text style={styles.sliderLabel}>5000+</Text>
                </View>
                </View>
            ) : (
                <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack}>
                    <View 
                    style={[
                        styles.sliderProgress,
                        { width: `${(planningRequest.budget / 5000) * 100}%` }
                    ]} 
                    />
                </View>
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0</Text>
                    <Text style={styles.sliderLabel}>2500</Text>
                    <Text style={styles.sliderLabel}>5000+</Text>
                </View>
                </View>
            )}
        </View>


        {/* Тип активности */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Тип активности</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.activityTypes}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.activityType,
                    planningRequest.activityType === type.value && styles.activityTypeSelected,
                  ]}
                  onPress={() => updatePlanningRequest({ activityType: type.value })}
                >
                  <Text style={styles.activityTypeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.activityTypeText,
                    planningRequest.activityType === type.value && styles.activityTypeTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Настроение */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>😊 Настроение</Text>
          <View style={styles.moodContainer}>
            {moodTypes.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                style={[
                  styles.moodItem,
                  planningRequest.mood === mood.value && { backgroundColor: mood.color },
                  planningRequest.mood === mood.value && styles.moodItemSelected
                ]}
                onPress={() => {
                  // Toggle: если уже выбрано это настроение, снимаем выбор
                  if (planningRequest.mood === mood.value) {
                    updatePlanningRequest({ mood: undefined });
                  } else {
                    updatePlanningRequest({ mood: mood.value });
                  }
                }}
              >
                <Text style={styles.moodIcon}>{mood.icon}</Text>
                <Text style={[
                  styles.moodText,
                  planningRequest.mood === mood.value && styles.moodTextSelected,
                ]}>
                  {mood.label}
                </Text>
                {planningRequest.mood === mood.value && (
                  <Feather name="check" size={16} color="white" style={styles.moodCheckIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Компания */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Компания</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.companyTypes}>
              {companyTypes.map((company) => (
                <TouchableOpacity
                  key={company.value}
                  style={[
                    styles.companyType,
                    planningRequest.company === company.value && styles.companyTypeSelected,
                  ]}
                  onPress={() => updatePlanningRequest({ company: company.value })}
                >
                  <Text style={styles.companyIcon}>{company.icon}</Text>
                  <Text style={[
                    styles.companyText,
                    planningRequest.company === company.value && styles.companyTextSelected,
                  ]}>
                    {company.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Расширенные настройки */}
        <TouchableOpacity 
          style={styles.advancedHeader}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedTitle}>⚙️ Расширенные настройки</Text>
          <Feather 
            name={showAdvanced ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>♿ Доступно для инвалидов</Text>
              <Switch
                value={planningRequest.filters.wheelchairAccessible}
                onValueChange={(value) => updatePlanningRequest({
                  filters: { ...planningRequest.filters, wheelchairAccessible: value }
                })}
              />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>🌱 Вегетарианское меню</Text>
              <Switch
                value={planningRequest.filters.vegetarian}
                onValueChange={(value) => updatePlanningRequest({
                  filters: { ...planningRequest.filters, vegetarian: value }
                })}
              />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>🌳 На открытом воздухе</Text>
              <Switch
                value={planningRequest.filters.outdoor}
                onValueChange={(value) => updatePlanningRequest({
                  filters: { ...planningRequest.filters, outdoor: value }
                })}
              />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>👶 Подходит для детей</Text>
              <Switch
                value={planningRequest.filters.childFriendly}
                onValueChange={(value) => updatePlanningRequest({
                  filters: { ...planningRequest.filters, childFriendly: value }
                })}
              />
            </View>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(1)}
          >
            <Feather name="arrow-left" size={20} color="#3b82f6" />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.searchButton}
            onPress={searchPlaces}
          >
            <Text style={styles.searchButtonText}>Найти места</Text>
            <Feather name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  startPoints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  startPoint: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  startPointSelected: {
    backgroundColor: '#3b82f6',
  },
  startPointText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  startPointTextSelected: {
    color: 'white',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  sliderProgress: {
    height: 6,
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  budgetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  budgetButtonSelected: {
    backgroundColor: '#10b981',
  },
  budgetButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  budgetButtonTextSelected: {
    color: 'white',
  },
  activityTypes: {
    flexDirection: 'row',
  },
  activityType: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 80,
  },
  activityTypeSelected: {
    backgroundColor: '#3b82f6',
  },
  activityTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  activityTypeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  activityTypeTextSelected: {
    color: 'white',
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    width: '48%',
  },
  moodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  moodTextSelected: {
    color: 'white',
  },
  companyTypes: {
    flexDirection: 'row',
  },
  companyType: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 80,
  },
  companyTypeSelected: {
    backgroundColor: '#3b82f6',
  },
  companyIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  companyText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  companyTextSelected: {
    color: 'white',
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  advancedSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#374151',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 2,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  webSliderContainer: {
  marginBottom: 16,
},
webSlider: {
  width: '100%',
  marginBottom: 8,
},
moodItemSelected: {
  borderWidth: 2,
  borderColor: '#3b82f6',
},
moodCheckIcon: {
  position: 'absolute',
  top: 4,
  right: 4,
},
});