import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform, Modal } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { Feather } from '@expo/vector-icons';
import { mockStartPoints, activityTypes, moodTypes, companyTypes } from '../../data/mockPlaces';
import { activityCategories } from '../../data/categories';

export const ParametersStep = () => {
  const { planningRequest, updatePlanningRequest, searchPlaces, setCurrentStep } = usePlanner();
  const [customAddress, setCustomAddress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleStartPointSelect = useCallback((point: any) => {
    updatePlanningRequest({ startPoint: point });
  }, [updatePlanningRequest]);

  const handleBudgetChange = useCallback((value: number) => {
    updatePlanningRequest({ budget: value });
  }, [updatePlanningRequest]);

  // Функция для определения, показывать ли дополнительные фильтры
  const shouldShowAdditionalFilters = useMemo(
    () => planningRequest.activityType !== 'custom',
    [planningRequest.activityType]
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Параметры поиска</Text>
          <Text style={styles.subtitle}>
            {planningRequest.activityType === 'custom' 
              ? 'Создайте свою уникальную активность' 
              : 'Укажите предпочтения для поиска идеальных мест'}
          </Text>
        </View>

        {/* Точка старта */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Точка старта</Text>
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

        {/* Тип активности */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Тип активности</Text>
          </View>
          
          {/* Выбранная категория */}
          {planningRequest.activityType && planningRequest.activityType !== 'custom' && (() => {
            const selectedCategory = activityCategories.find(cat => cat.id === planningRequest.activityType);
            return selectedCategory ? (
              <TouchableOpacity
                style={styles.selectedCategoryCard}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={styles.selectedCategoryIcon}>{selectedCategory.icon}</Text>
                <View style={styles.selectedCategoryInfo}>
                  <Text style={styles.selectedCategoryName}>{selectedCategory.name}</Text>
                  <Text style={styles.selectedCategorySubtext}>
                    {selectedCategory.subcategories.length} подкатегорий
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#6b7280" />
              </TouchableOpacity>
            ) : null;
          })()}

          {/* Кнопка выбора категории */}
          {!planningRequest.activityType || planningRequest.activityType === 'custom' ? (
            <TouchableOpacity
              style={styles.selectCategoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Feather name="grid" size={20} color="#3b82f6" />
              <Text style={styles.selectCategoryText}>Выбрать категорию</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.changeCategoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Feather name="edit-2" size={16} color="#6b7280" />
              <Text style={styles.changeCategoryText}>Изменить категорию</Text>
            </TouchableOpacity>
          )}

          {/* Кнопка "Своя активность" - отдельно */}
          <TouchableOpacity
            style={[
              styles.customActivityButton,
              planningRequest.activityType === 'custom' && styles.customActivityButtonActive
            ]}
            onPress={() => {
              if (planningRequest.activityType === 'custom') {
                // Если уже выбрана, переходим к созданию
                setCurrentStep(3);
              } else {
                // Выбираем тип "custom"
                updatePlanningRequest({ activityType: 'custom' });
                setCurrentStep(3);
              }
            }}
          >
            <Feather 
              name={planningRequest.activityType === 'custom' ? "check-circle" : "plus-circle"} 
              size={20} 
              color={planningRequest.activityType === 'custom' ? "white" : "#f59e0b"} 
            />
            <Text style={[
              styles.customActivityText,
              planningRequest.activityType === 'custom' && styles.customActivityTextActive
            ]}>
              {planningRequest.activityType === 'custom' ? 'Своя активность выбрана' : 'Создать свою активность'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Модальное окно выбора категории */}
        <Modal
          visible={showCategoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите категорию</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Feather name="x" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {selectedCategoryId ? (
                  // Показываем подкатегории
                  <>
                    <TouchableOpacity
                      style={styles.backToCategoriesButton}
                      onPress={() => setSelectedCategoryId(null)}
                    >
                      <Feather name="arrow-left" size={20} color="#3b82f6" />
                      <Text style={styles.backToCategoriesText}>Назад к категориям</Text>
                    </TouchableOpacity>
                    {(() => {
                      const category = activityCategories.find(cat => cat.id === selectedCategoryId);
                      return category ? (
                        <View>
                          <Text style={styles.subcategoriesTitle}>
                            {category.icon} {category.name}
                          </Text>
                          <View style={styles.subcategoriesList}>
                            <TouchableOpacity
                              style={[
                                styles.subcategoryItem,
                                planningRequest.activityType === category.id && styles.subcategoryItemSelected
                              ]}
                              onPress={() => {
                                updatePlanningRequest({ activityType: category.id as any });
                                setShowCategoryModal(false);
                                setSelectedCategoryId(null);
                              }}
                            >
                              <Text style={styles.subcategoryItemText}>Все {category.name.toLowerCase()}</Text>
                              {planningRequest.activityType === category.id && (
                                <Feather name="check" size={20} color="#3b82f6" />
                              )}
                            </TouchableOpacity>
                            {category.subcategories.map(subcat => (
                              <TouchableOpacity
                                key={subcat.id}
                                style={styles.subcategoryItem}
                                onPress={() => {
                                  // В будущем можно добавить выбор подкатегории
                                  updatePlanningRequest({ activityType: category.id as any });
                                  setShowCategoryModal(false);
                                  setSelectedCategoryId(null);
                                }}
                              >
                                <Text style={styles.subcategoryItemIcon}>{subcat.icon || '•'}</Text>
                                <View style={styles.subcategoryItemInfo}>
                                  <Text style={styles.subcategoryItemName}>{subcat.name}</Text>
                                  {subcat.description && (
                                    <Text style={styles.subcategoryItemDescription}>{subcat.description}</Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : null;
                    })()}
                  </>
                ) : (
                  // Показываем категории
                  <View style={styles.categoriesList}>
                    {activityCategories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryItem,
                          planningRequest.activityType === category.id && styles.categoryItemSelected
                        ]}
                        onPress={() => {
                          if (category.subcategories.length > 0) {
                            setSelectedCategoryId(category.id);
                          } else {
                            updatePlanningRequest({ activityType: category.id as any });
                            setShowCategoryModal(false);
                          }
                        }}
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <View style={styles.categoryInfo}>
                          <Text style={[
                            styles.categoryName,
                            planningRequest.activityType === category.id && styles.categoryNameSelected
                          ]}>
                            {category.name}
                          </Text>
                          {category.subcategories.length > 0 && (
                            <Text style={styles.categorySubtext}>
                              {category.subcategories.length} подкатегорий
                            </Text>
                          )}
                        </View>
                        {planningRequest.activityType === category.id && (
                          <Feather name="check" size={20} color="#3b82f6" />
                        )}
                        {category.subcategories.length > 0 && (
                          <Feather name="chevron-right" size={20} color="#9ca3af" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Дополнительные параметры (только для не-custom активностей) */}
        {shouldShowAdditionalFilters && (
          <>
            {/* Бюджет */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Бюджет</Text>
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
                    style={{
                      ...styles.webSlider,
                      outline: 'none',
                      cursor: 'pointer',
                    } as any}
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
                    <TouchableOpacity
                      style={[
                        styles.sliderThumb,
                        { left: `${(planningRequest.budget / 5000) * 100}%` }
                      ]}
                      onPressIn={(e) => {
                        // Начало перетаскивания
                      }}
                    />
                  </View>
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0</Text>
                    <Text style={styles.sliderLabel}>2500</Text>
                    <Text style={styles.sliderLabel}>5000+</Text>
                  </View>
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => handleBudgetChange(Math.max(0, planningRequest.budget - 500))}
                    >
                      <Feather name="minus" size={16} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => handleBudgetChange(Math.min(5000, planningRequest.budget + 500))}
                    >
                      <Feather name="plus" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Настроение */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Настроение</Text>
              </View>
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Компания</Text>
              </View>
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
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.advancedHeader}
                onPress={() => setShowAdvanced(!showAdvanced)}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Расширенные настройки</Text>
                  <Feather 
                    name={showAdvanced ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </View>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedSection}>
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Доступно для инвалидов</Text>
                    <Switch
                      value={planningRequest.filters.wheelchairAccessible}
                      onValueChange={(value) => updatePlanningRequest({
                        filters: { ...planningRequest.filters, wheelchairAccessible: value }
                      })}
                    />
                  </View>
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Вегетарианское меню</Text>
                    <Switch
                      value={planningRequest.filters.vegetarian}
                      onValueChange={(value) => updatePlanningRequest({
                        filters: { ...planningRequest.filters, vegetarian: value }
                      })}
                    />
                  </View>
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>На открытом воздухе</Text>
                    <Switch
                      value={planningRequest.filters.outdoor}
                      onValueChange={(value) => updatePlanningRequest({
                        filters: { ...planningRequest.filters, outdoor: value }
                      })}
                    />
                  </View>
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Подходит для детей</Text>
                    <Switch
                      value={planningRequest.filters.childFriendly}
                      onValueChange={(value) => updatePlanningRequest({
                        filters: { ...planningRequest.filters, childFriendly: value }
                      })}
                    />
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* Секция для кастомной активности */}
        {planningRequest.activityType === 'custom' && (
          <View style={styles.customInfoSection}>
            <Feather name="info" size={24} color="#3b82f6" />
            <Text style={styles.customInfoText}>
              Вы создаете свою активность. После нажатия кнопки "Создать активность" 
              вы сможете указать название, местоположение и описание.
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              // Если planType === 'chain', возвращаемся к шагу выбора времени (1)
              // Если planType === 'single', возвращаемся к шагу выбора типа плана (0)
              if (planningRequest.planType === 'chain') {
                setCurrentStep(1);
              } else {
                setCurrentStep(0);
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#3b82f6" />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => {
              if (planningRequest.activityType === 'custom') {
                // Для кастомной активности переходим к созданию (шаг 2)
                setCurrentStep(2);
              } else {
                // Для обычных активностей ищем места (шаг 3)
                searchPlaces();
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.searchButtonText}>
              {planningRequest.activityType === 'custom' ? 'Создать активность' : 'Найти места'}
            </Text>
            <Feather 
              name={planningRequest.activityType === 'custom' ? 'plus' : 'search'} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  startPoints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  startPoint: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  },
  sliderContainer: {
    marginBottom: 16,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    backgroundColor: 'transparent',
  },
  sliderTrack: {
    height: 40,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
    position: 'relative',
    justifyContent: 'center',
    marginHorizontal: 0,
    width: '100%',
  },
  sliderProgress: {
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 16,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    position: 'absolute',
    marginLeft: -12,
    top: 8,
    borderWidth: 3,
    borderColor: 'white',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    } : {
      // Убрана тень для мобильных
    }),
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webSliderContainer: {
    marginBottom: 16,
  },
  webSlider: {
    width: '100%',
    marginBottom: 8,
    height: 6,
    borderRadius: 3,
  } as any, // Web-specific styles (outline, cursor) not supported in React Native StyleSheet
  activityTypes: {
    flexDirection: 'row',
  },
  activityType: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 14,
    marginRight: 12,
    minWidth: 90,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityTypeSelected: {
    backgroundColor: '#3b82f6',
  },
  activityTypeCustom: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  activityTypeCustomSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderStyle: 'solid',
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
  subcategoryHint: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    width: '48%',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  moodItemSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
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
  moodCheckIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  customInfoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  customInfoText: {
    fontSize: 14,
    color: '#0369a1',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
    backgroundColor: 'white',
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
    padding: 18,
    borderRadius: 16,
    flex: 2,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    } : {
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 12,
  },
  selectedCategoryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  selectedCategoryInfo: {
    flex: 1,
  },
  selectedCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedCategorySubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  selectCategoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  changeCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
  },
  changeCategoryText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  customActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  customActivityButtonActive: {
    backgroundColor: '#fef3c7',
    borderStyle: 'solid',
  },
  customActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 8,
  },
  customActivityTextActive: {
    color: '#92400e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 500,
  },
  backToCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backToCategoriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  categoriesList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#3b82f6',
  },
  categorySubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  subcategoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 16,
    paddingBottom: 8,
  },
  subcategoriesList: {
    padding: 16,
    paddingTop: 0,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subcategoryItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  subcategoryItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  subcategoryItemInfo: {
    flex: 1,
  },
  subcategoryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subcategoryItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  subcategoryItemDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
});