import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { mockPlaces, activityTypes, moodTypes, companyTypes } from '../../data/mockPlaces';
import { activityCategories } from '../../data/categories';
import { Place } from '../../types/planner';
import { YandexMap } from '../../components/maps/YandexMap';

const { width } = Dimensions.get('window');

export const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapView, setMapView] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(10000);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vegetarian, setVegetarian] = useState(false);
  const [outdoor, setOutdoor] = useState(false);
  const [childFriendly, setChildFriendly] = useState(false);

  // Фильтрация мест
  const filteredPlaces = useMemo(() => {
    let results = mockPlaces;

    if (searchQuery.trim()) {
      results = results.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedActivityType) {
      results = results.filter(place => place.type === selectedActivityType);
    }

    if (minRating > 0) {
      results = results.filter(place => place.rating >= minRating);
    }

    if (priceRange[0] > 0 || priceRange[1] < 5000) {
      results = results.filter(place => {
        const bill = place.averageBill || 0;
        return bill >= priceRange[0] && bill <= priceRange[1];
      });
    }

    if (maxDistance < 10000) {
      results = results.filter(place => place.distance <= maxDistance);
    }

    if (wheelchairAccessible) {
      results = results.filter(place => place.features.wheelchair);
    }

    if (vegetarian) {
      results = results.filter(place => place.features.vegetarian);
    }

    if (outdoor) {
      results = results.filter(place => place.features.outdoor);
    }

    if (childFriendly) {
      results = results.filter(place => place.features.childFriendly);
    }

    return results;
  }, [searchQuery, selectedActivityType, minRating, priceRange, maxDistance, wheelchairAccessible, vegetarian, outdoor, childFriendly]);

  const PlaceCard = ({ place }: { place: Place }) => (
    <TouchableOpacity
      style={[
        styles.placeCard,
        selectedPlace?.id === place.id && styles.placeCardSelected
      ]}
      onPress={() => setSelectedPlace(place)}
    >
      <Image 
        source={{ uri: place.image }} 
        style={styles.placeImage as any}
        resizeMode="cover"
      />
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          <Feather name="map-pin" size={12} color="#6b7280" /> {place.address}
        </Text>
        <View style={styles.placeMeta}>
          <View style={styles.metaItem}>
            <Feather name="star" size={14} color="#f59e0b" />
            <Text style={styles.metaText}>{place.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="navigation" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{place.distance} м</Text>
          </View>
          {place.averageBill && place.averageBill > 0 && (
            <View style={styles.metaItem}>
              <Feather name="credit-card" size={14} color="#6b7280" />
              <Text style={styles.metaText}>~{place.averageBill}₽</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const MapView = () => (
    <YandexMap
      center={filteredPlaces.length > 0 ? filteredPlaces[0].coordinates : undefined}
      markers={filteredPlaces.map(place => ({
        id: place.id,
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        title: place.name,
      }))}
      onMarkerPress={(markerId) => {
        const place = filteredPlaces.find(p => p.id === markerId);
        if (place) setSelectedPlace(place);
      }}
      height={Dimensions.get('window').height - 200}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок и поиск */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск мест и событий..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Feather name="filter" size={20} color="#374151" />
          {(selectedActivityType || selectedMood || selectedCompany) && (
            <View style={styles.filterIndicator} />
          )}
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

      {/* Фильтры */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersContent}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Тип активности</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChips}>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        !selectedActivityType && styles.filterChipSelected
                      ]}
                      onPress={() => setSelectedActivityType(null)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        !selectedActivityType && styles.filterChipTextSelected
                      ]}>Все</Text>
                    </TouchableOpacity>
                    {activityTypes.filter(t => t.value !== 'custom').map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.filterChip,
                          selectedActivityType === type.value && styles.filterChipSelected
                        ]}
                        onPress={() => setSelectedActivityType(
                          selectedActivityType === type.value ? null : type.value
                        )}
                      >
                        <Text style={[
                          styles.filterChipText,
                          selectedActivityType === type.value && styles.filterChipTextSelected
                        ]}>{type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Контент */}
      <View style={styles.content}>
        {mapView ? (
          /* Режим карты - только карта */
          <View style={styles.mapFullContainer}>
            {filteredPlaces.length > 0 ? (
              <YandexMap
                center={filteredPlaces[0].coordinates}
                markers={filteredPlaces.map(place => ({
                  id: place.id,
                  lat: place.coordinates.lat,
                  lng: place.coordinates.lng,
                  title: place.name,
                  rating: place.rating,
                  priceLevel: place.priceLevel,
                }))}
                onMarkerPress={(markerId) => {
                  const place = filteredPlaces.find(p => p.id === markerId);
                  if (place) setSelectedPlace(place);
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
          /* Режим списка - только список */
          <View style={styles.listFullContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Найдено мест: {filteredPlaces.length}
              </Text>
            </View>
            <ScrollView style={styles.placesList}>
              {filteredPlaces.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>Ничего не найдено</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Попробуйте изменить параметры поиска
                  </Text>
                </View>
              ) : (
                filteredPlaces.map(place => (
                  <PlaceCard key={place.id} place={place} />
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Детали выбранного места */}
      {selectedPlace && (
        <View style={styles.placeDetails}>
          <TouchableOpacity
            style={styles.closeDetailsButton}
            onPress={() => setSelectedPlace(null)}
          >
            <Feather name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <ScrollView>
            <Image 
              source={{ uri: selectedPlace.image }} 
              style={styles.detailsImage as any}
              resizeMode="cover"
            />
            <View style={styles.detailsContent}>
              <Text style={styles.detailsName}>{selectedPlace.name}</Text>
              <Text style={styles.detailsDescription}>{selectedPlace.description}</Text>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Feather name="map-pin" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedPlace.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Feather name="clock" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedPlace.workingHours}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Feather name="star" size={16} color="#f59e0b" />
                  <Text style={styles.detailText}>Рейтинг: {selectedPlace.rating}/5</Text>
                </View>
                <View style={styles.detailItem}>
                  <Feather name="navigation" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedPlace.distance} м от вас</Text>
                </View>
              </View>

              <View style={styles.features}>
                {selectedPlace.features.wheelchair && (
                  <View style={styles.featureTag}>
                    <Text style={styles.featureText}>♿ Доступно</Text>
                  </View>
                )}
                {selectedPlace.features.vegetarian && (
                  <View style={styles.featureTag}>
                    <Text style={styles.featureText}>🌱 Вегетарианское</Text>
                  </View>
                )}
                {selectedPlace.features.outdoor && (
                  <View style={styles.featureTag}>
                    <Text style={styles.featureText}>🌳 На улице</Text>
                  </View>
                )}
                {selectedPlace.features.childFriendly && (
                  <View style={styles.featureTag}>
                    <Text style={styles.featureText}>👶 Для детей</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  filterButton: {
    padding: 10,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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
  filtersPanel: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  placesList: {
    flex: 1,
    padding: 16,
  },
  mapFullContainer: {
    flex: 1,
  },
  mapEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  mapEmptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  listFullContainer: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  placeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeCardSelected: {
    borderColor: '#3b82f6',
  },
  placeImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  placeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
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
  placeAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  placeMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
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
  },
  placeDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  closeDetailsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  detailsImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailsContent: {
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
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  advancedFilters: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ratingButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  ratingButtonActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  priceSeparator: {
    fontSize: 16,
    color: '#6b7280',
  },
  distanceButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  distanceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  distanceButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  distanceButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  distanceButtonTextActive: {
    color: 'white',
  },
  featuresFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  featureFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 6,
  },
  featureFilterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  featureFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  featureFilterTextActive: {
    color: 'white',
  },
});
