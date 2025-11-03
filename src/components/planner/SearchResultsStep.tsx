import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { usePlanner } from '../../services/planner/PlannerContext';
import { Feather } from '@expo/vector-icons';
import { Place } from '../../types/planner';

const { width } = Dimensions.get('window');

export const SearchResultsStep = () => {
  const { 
    filteredResults, 
    selectedPlace, 
    selectPlace, 
    addToPlan, 
    currentPlan,
    setCurrentStep 
  } = usePlanner();

  const [showFilters, setShowFilters] = useState(false);

  const PlaceCard = ({ place }: { place: Place }) => (
    <TouchableOpacity 
      style={[
        styles.placeCard,
        selectedPlace?.id === place.id && styles.placeCardSelected
      ]}
      onPress={() => selectPlace(place)}
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

  const PlaceDetails = ({ place }: { place: Place }) => (
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
            <Text style={styles.detailText}>~{place.duration} мин посещение</Text>
          </View>
        </View>

        <View style={styles.features}>
          {place.features.wheelchair && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>♿ Доступно</Text>
            </View>
          )}
          {place.features.vegetarian && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>🌱 Вегетарианское</Text>
            </View>
          )}
          {place.features.outdoor && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>🌳 На улице</Text>
            </View>
          )}
          {place.features.childFriendly && (
            <View style={styles.featureTag}>
              <Text style={styles.featureText}>👶 Для детей</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => {/* TODO: Добавить в избранное */}}
          >
            <Feather name="heart" size={20} color="#6b7280" />
            <Text style={styles.saveButtonText}>В избранное</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => addToPlan(place)}
          >
            <Feather name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Добавить в план</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

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
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Список мест */}
        <ScrollView style={styles.placesList}>
          {filteredResults.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </ScrollView>

        {/* Детали выбранного места */}
        {selectedPlace && (
          <View style={styles.detailsPanel}>
            <PlaceDetails place={selectedPlace} />
          </View>
        )}

        {/* Текущий план (превью) */}
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
      </View>
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
  },
  content: {
    flex: 1,
    flexDirection: 'row',
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
  detailsPanel: {
    width: 400,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  placeDetails: {
    flex: 1,
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
  planPreview: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
});