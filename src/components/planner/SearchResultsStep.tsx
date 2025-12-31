import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Platform, Modal } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { useFavorites } from '../../services/favorites/FavoritesContext';
import { useAuth } from '../../services/auth/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Place } from '../../types/planner';
import { calculateDuration } from '../../types/planner';
import { CustomActivityStep } from './CustomActivityStep';
import { YandexMap } from '../maps/YandexMap';
import { TimeSelectionModal } from './TimeSelectionModal';

const { width } = Dimensions.get('window');

export const SearchResultsStep = () => {
  const { 
    filteredResults, 
    selectedPlace, 
    selectPlace, 
    addToPlan, 
    currentPlan,
    setCurrentStep,
    planningRequest,
    searchFilters,
    setSearchFilters 
  } = usePlanner();
  const { addFavoritePlace, removeFavoritePlace, isFavorite } = useFavorites();
  const { user } = useAuth();

  const [showFilters, setShowFilters] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [placeToAdd, setPlaceToAdd] = useState<Place | null>(null);
  const [suggestedStartTime, setSuggestedStartTime] = useState('');
  const [suggestedEndTime, setSuggestedEndTime] = useState('');

  // Если тип активности - custom, показываем кастомный шаг
  if (planningRequest.activityType === 'custom') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(2)}
          >
            <Feather name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Создание своей активности</Text>
          <View style={styles.placeholder} />
        </View>
        <CustomActivityStep />
      </View>
    );
  }

  const FiltersPanel = () => (
    <View style={styles.filtersPanel}>
      <Text style={styles.filtersTitle}>Фильтры</Text>
      
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Ценовой диапазон</Text>
        <View style={styles.priceFilters}>
          {[1, 2, 3, 4].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priceFilter,
                searchFilters.priceRange[0] <= level && searchFilters.priceRange[1] >= level && styles.priceFilterSelected
              ]}
              onPress={() => {
                setSearchFilters({
                  ...searchFilters,
                  priceRange: [level, level] as [number, number]
                });
              }}
            >
              <Text style={[
                styles.priceFilterText,
                searchFilters.priceRange[0] <= level && searchFilters.priceRange[1] >= level && styles.priceFilterTextSelected
              ]}>
                {'$'.repeat(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterActions}>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            setSearchFilters({
              priceRange: [1, 4] as [number, number],
              rating: 3.0,
              distance: 5000,
            });
            setShowFilters(false);
          }}
        >
          <Text style={styles.resetButtonText}>Сбросить</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => setShowFilters(false)}
        >
          <Text style={styles.applyButtonText}>Применить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const PlaceCard = ({ place, onPress }: { place: Place; onPress?: () => void }) => (
    <TouchableOpacity 
      style={[
        styles.placeCard,
        selectedPlace?.id === place.id && styles.placeCardSelected
      ]}
      onPress={onPress || (() => {
        selectPlace(place);
        setShowPlaceModal(true);
      })}
    >
      <Image source={{ uri: place.image }} style={styles.placeImage} />
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeDescription} numberOfLines={2}>
          {place.description}
        </Text>
        
        <View style={styles.placeMeta}>
          <View style={styles.metaItem}>
            <Feather name="star" size={14} color="#f59e0b" />
            <Text style={styles.metaText}>{place.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{place.distance} м</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{place.travelTime} мин</Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>
            {place.averageBill ? `~${place.averageBill}₽` : 'Бесплатно'}
          </Text>
          <Text style={styles.priceLevel}>
            {'$'.repeat(place.priceLevel)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const Recommendations = useMemo(() => {
    // Показываем рекомендации только если в плане уже есть активности
    if (currentPlan.activities.length === 0) return null;

    const remainingTime = 120; // Оставшееся время в минутах (пример)
    const recommendations = filteredResults.filter(place => {
      const duration = calculateDuration(
        place.durationSettings,
        planningRequest.company || 'friends',
        planningRequest.mood || 'fun'
      );
      return duration <= remainingTime;
    }).slice(0, 3);

    if (recommendations.length === 0) return null;

    return (
      <View style={styles.recommendations}>
        <Text style={styles.recommendationsTitle}>Оставшееся время можно провести здесь:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.recommendationsList}>
            {recommendations.map(place => (
              <TouchableOpacity 
                key={place.id}
                style={styles.recommendationCard}
                onPress={() => selectPlace(place)}
              >
                <Image source={{ uri: place.image }} style={styles.recommendationImage} />
                <View style={styles.recommendationInfo}>
                  <Text style={styles.recommendationName}>{place.name}</Text>
                  <Text style={styles.recommendationDescription} numberOfLines={2}>
                    {place.description}
                  </Text>
                  <View style={styles.recommendationMeta}>
                    <Feather name="clock" size={12} color="#6b7280" />
                    <Text style={styles.recommendationMetaText}>
                      {calculateDuration(
                        place.durationSettings,
                        planningRequest.company || 'friends',
                        planningRequest.mood || 'fun'
                      )} мин
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }, [currentPlan.activities.length, filteredResults, planningRequest.company, planningRequest.mood, selectPlace]);

  const PlaceDetails = ({ place }: { place: Place }) => {
    const calculatedDuration = calculateDuration(
      place.durationSettings,
      planningRequest.company || 'friends',
      planningRequest.mood || 'fun'
    );

    return (
      <View style={styles.placeDetails}>
        <Image source={{ uri: place.image }} style={styles.detailsImage} />
        <ScrollView style={styles.detailsContent}>
          <Text style={styles.detailsName}>{place.name}</Text>
          <Text style={styles.detailsDescription}>{place.description}</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Feather name="map-pin" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{place.address}</Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="clock" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{place.workingHours}</Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="star" size={16} color="#f59e0b" />
              <Text style={styles.detailText}>Рейтинг: {place.rating}/5</Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="watch" size={16} color="#6b7280" />
              <Text style={styles.detailText}>~{calculatedDuration} мин посещение</Text>
            </View>
          </View>

          <View style={styles.features}>
            {place.features.wheelchair && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>Доступно</Text>
              </View>
            )}
            {place.features.vegetarian && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>Вегетарианское</Text>
              </View>
            )}
            {place.features.outdoor && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>На улице</Text>
              </View>
            )}
            {place.features.childFriendly && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>Для детей</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.saveButton,
                isFavorite(place.id) && styles.saveButtonActive,
                !user && styles.saveButtonDisabled
              ]}
              onPress={() => {
                if (!user) {
                  Alert.alert(
                    'Требуется авторизация',
                    'Войдите в аккаунт, чтобы добавлять места в избранное',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                if (isFavorite(place.id)) {
                  removeFavoritePlace(place.id);
                } else {
                  addFavoritePlace(place);
                }
              }}
            >
              <Feather 
                name={isFavorite(place.id) ? "heart" : "heart"} 
                size={20} 
                color={isFavorite(place.id) ? "#ef4444" : "#6b7280"} 
                fill={isFavorite(place.id) ? "#ef4444" : "none"}
              />
              <Text style={[
                styles.saveButtonText,
                isFavorite(place.id) && styles.saveButtonTextActive
              ]}>
                {isFavorite(place.id) ? 'В избранном' : 'В избранное'}
              </Text>
            </TouchableOpacity>
            
            {/* Кнопка "Добавить в план" удалена из списка - используется только в модальном окне */}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Заголовок и навигация */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentStep(2)}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Найдено мест: {filteredResults.length}</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Feather name="filter" size={20} color="#374151" />
          {showFilters && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggle, mapView && styles.viewToggleActive]}
          onPress={() => setMapView(!mapView)}
        >
          <Feather name={mapView ? "list" : "map"} size={20} color={mapView ? "white" : "#374151"} />
          <Text style={[styles.viewToggleText, mapView && styles.viewToggleTextActive]}>
            {mapView ? "Список" : "Карта"}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && <FiltersPanel />}

      {/* Основной контент */}
      <View style={styles.mainContent}>
        {mapView ? (
          /* Режим карты */
          <View style={styles.mapFullContainer}>
            {filteredResults.length > 0 ? (
              <YandexMap
                center={filteredResults[0].coordinates}
                markers={filteredResults.map(place => ({
                  id: place.id,
                  lat: place.coordinates.lat,
                  lng: place.coordinates.lng,
                  title: place.name,
                  rating: place.rating,
                  priceLevel: place.priceLevel,
                }))}
                onMarkerPress={(markerId) => {
                  const place = filteredResults.find(p => p.id === markerId);
                  if (place) {
                    selectPlace(place);
                    setShowPlaceModal(true);
                  }
                }}
                height={Dimensions.get('window').height - 200}
              />
            ) : (
              <View style={styles.mapEmpty}>
                <Feather name="map" size={32} color="#d1d5db" />
                <Text style={styles.mapEmptyText}>Нет мест для отображения</Text>
              </View>
            )}
          </View>
        ) : (
          /* Режим списка */
          <View style={styles.listFullContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Найдено мест: {filteredResults.length}
              </Text>
              <Text style={styles.listHeaderSubtitle}>
                Нажмите на место для просмотра деталей
              </Text>
            </View>
            <ScrollView 
              style={styles.placesList}
              showsVerticalScrollIndicator={true}
            >
              {filteredResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>Места не найдены</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Попробуйте изменить параметры поиска
                  </Text>
                </View>
              ) : (
                filteredResults.map((place) => (
                  <PlaceCard 
                    key={place.id} 
                    place={place}
                    onPress={() => {
                      selectPlace(place);
                      setShowPlaceModal(true);
                    }}
                  />
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Модальное окно с деталями места */}
      <Modal
        visible={showPlaceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlace && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowPlaceModal(false)}
                  >
                    <Feather name="x" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll}>
                  <PlaceDetails place={selectedPlace} />
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalAddButton,
                      planningRequest.planType === 'single' && currentPlan.activities.length > 0 && styles.modalAddButtonDisabled
                    ]}
                    onPress={() => {
                      // Для одного мероприятия всегда показываем модальное окно выбора времени
                      // Для цепочки - только если это первая активность
                      const result = addToPlan(selectedPlace);
                      if (result) {
                        setPlaceToAdd(selectedPlace);
                        setSuggestedStartTime(result.startTime);
                        setSuggestedEndTime(result.endTime);
                        setShowPlaceModal(false);
                        setShowTimeModal(true);
                      }
                      // Если result === null, значит для цепочки активность уже добавлена автоматически
                      // или для одного мероприятия уже есть активность (показывается Alert)
                    }}
                    disabled={planningRequest.planType === 'single' && currentPlan.activities.length > 0}
                  >
                    <Feather name="plus" size={20} color="white" />
                    <Text style={styles.modalAddButtonText}>
                      {planningRequest.planType === 'single' && currentPlan.activities.length > 0
                        ? 'Уже добавлено одно мероприятие'
                        : 'Добавить в план'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Рекомендации - в самом низу */}
      {Recommendations}

      {/* План превью - фиксированная кнопка внизу */}
      {currentPlan.activities.length > 0 && (
        <View style={styles.planPreview}>
          <Text style={styles.planTitle}>Ваш план ({currentPlan.activities.length})</Text>
          <TouchableOpacity 
            style={styles.viewPlanButton}
            onPress={() => setCurrentStep(4)}
          >
            <Text style={styles.viewPlanText}>Посмотреть план</Text>
            <Feather name="arrow-right" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      )}

      {/* Модальное окно выбора времени */}
      <TimeSelectionModal
        visible={showTimeModal}
        suggestedStartTime={suggestedStartTime}
        suggestedEndTime={suggestedEndTime}
        onConfirm={(startTime, endTime) => {
          if (placeToAdd) {
            addToPlan(placeToAdd, startTime, endTime);
            setPlaceToAdd(null);
          }
          setShowTimeModal(false);
        }}
        onCancel={() => {
          setShowTimeModal(false);
          setPlaceToAdd(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  placeholder: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  listHeader: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  rightColumn: {
    width: 400,
    maxWidth: 400,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  mapSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 350,
    minHeight: 300,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  detailsSection: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 200,
    maxHeight: 500,
  },
  detailsPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  detailsPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  mapEmpty: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  mapEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  placesList: {
    flex: 1,
    padding: 16,
  },
  placeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeCardSelected: {
    borderColor: '#3b82f6',
  },
  placeImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  placeDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  placeMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  priceLevel: {
    fontSize: 14,
    color: '#f59e0b',
  },
  placeDetails: {
    flex: 1,
    height: '100%',
  },
  detailsImage: {
    width: '100%',
    height: 200,
  },
  detailsContent: {
    flex: 1,
    padding: 20,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  detailsDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  featureTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButtonActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  saveButtonTextActive: {
    color: '#ef4444',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  addButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  viewToggleActive: {
    backgroundColor: '#3b82f6',
  },
  viewToggleText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: 'white',
  },
  mapFullContainer: {
    flex: 1,
  },
  listFullContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  modalAddButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  planPreview: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPlanText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4,
  },
  recommendations: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  recommendationsList: {
    flexDirection: 'row',
  },
  recommendationCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: '100%',
    height: 100,
  },
  recommendationInfo: {
    padding: 12,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationMetaText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  filtersPanel: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  priceFilters: {
    flexDirection: 'row',
  },
  priceFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceFilterSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  priceFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  priceFilterTextSelected: {
    color: 'white',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  filterIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
});