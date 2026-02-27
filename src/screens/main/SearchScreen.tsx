import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { activityCategories } from '../../data/categories';
import { YandexMap } from '../../components/maps/YandexMap';
import { OSMService, OSMPlace } from '../../services/osm/OSMService';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

function matchesAccessibility(
  place: OSMPlace,
  filters: { wheelchair?: boolean; elevator?: boolean; stepFree?: boolean; toilet?: boolean; parking?: boolean; transport?: boolean }
) {
  const a = place.accessibility;
  if (filters.wheelchair && !a.wheelchairAccessible) return false;
  if (filters.elevator && !a.elevatorOrRamp) return false;
  if (filters.stepFree && !a.stepFreeEntrance) return false;
  if (filters.toilet && !a.accessibleToilet) return false;
  if (filters.parking && !a.parkingNearby) return false;
  if (filters.transport && !a.publicTransportNearby) return false;
  return true;
}

export const SearchScreen = () => {
  const { profile } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<OSMPlace | null>(null);
  const [mapView, setMapView] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [accessibilityFilters, setAccessibilityFilters] = useState({
    wheelchair: false,
    elevator: false,
    stepFree: false,
    toilet: false,
    parking: false,
    transport: false,
  });
  const [places, setPlaces] = useState<OSMPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const centerCoords =
    (profile?.defaultStartPoint &&
      'coordinates' in profile.defaultStartPoint &&
      (profile.defaultStartPoint as any).coordinates && {
        lat: (profile.defaultStartPoint as any).coordinates.lat,
        lng: (profile.defaultStartPoint as any).coordinates.lng,
      }) || { lat: 52.0339, lng: 113.501 };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await OSMService.searchAround(centerCoords, 2000);
        setPlaces(result);
      } catch (e: any) {
        setLoadError(e?.message || 'Ошибка загрузки мест');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [centerCoords.lat, centerCoords.lng]);

  const filteredPlaces = useMemo(() => {
    let results = places;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.address && p.address.toLowerCase().includes(q))
      );
    }

    if (categoryId) {
      results = results.filter((p) => p.categoryId === categoryId);
      if (subCategoryId) {
        results = results.filter((p) => p.subCategoryId === subCategoryId);
      }
    }

    if (minRating > 0) {
      results = results.filter((p) => p.rating >= minRating);
    }

    results = results.filter((p) => matchesAccessibility(p, accessibilityFilters));

    return results;
  }, [places, searchQuery, categoryId, subCategoryId, minRating, accessibilityFilters]);

  const selectedCategory = categoryId ? activityCategories.find((c) => c.id === categoryId) : null;

  const PlaceCard = ({ place }: { place: OSMPlace }) => (
    <TouchableOpacity
      style={[styles.placeCard, selectedPlace?.id === place.id && styles.placeCardSelected]}
      onPress={() => setSelectedPlace(place)}
      activeOpacity={0.85}
    >
      <View style={styles.placeImagePlaceholder}>
        <Text style={styles.placeImageEmoji}>{selectedCategory?.icon || '📍'}</Text>
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.title}</Text>
        {place.address ? (
          <Text style={styles.placeAddress} numberOfLines={1}>
            <Feather name="map-pin" size={12} color="#6b7280" /> {place.address}
          </Text>
        ) : null}
        <View style={styles.placeMeta}>
          <View style={styles.metaItem}>
            <Feather name="star" size={14} color="#f59e0b" />
            <Text style={styles.metaText}>{place.rating}</Text>
          </View>
        </View>
        <View style={styles.placeTags}>
          {place.accessibility.wheelchairAccessible && (
            <View style={styles.tag}><Text style={styles.tagText}>♿</Text></View>
          )}
          {place.accessibility.parkingNearby && (
            <View style={styles.tag}><Text style={styles.tagText}>🅿</Text></View>
          )}
          {place.accessibility.publicTransportNearby && (
            <View style={styles.tag}><Text style={styles.tagText}>🚌</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
          {(categoryId || minRating > 0 || Object.values(accessibilityFilters).some(Boolean)) && (
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filtersContent}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Категория</Text>
                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={styles.categoryButtonText}>
                    {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Все категории'}
                  </Text>
                  <Feather name="chevron-right" size={18} color="#6b7280" />
                </TouchableOpacity>
                {selectedCategory && (
                  <TouchableOpacity
                    style={styles.clearCategoryBtn}
                    onPress={() => { setCategoryId(null); setSubCategoryId(null); }}
                  >
                    <Text style={styles.clearCategoryText}>Сбросить категорию</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Доступность</Text>
                <View style={styles.filterChips}>
                  {[
                    { key: 'wheelchair' as const, label: '♿' },
                    { key: 'elevator' as const, label: '⬆' },
                    { key: 'stepFree' as const, label: '🚪' },
                    { key: 'toilet' as const, label: '🚻' },
                    { key: 'parking' as const, label: '🅿' },
                    { key: 'transport' as const, label: '🚌' },
                  ].map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.filterChip, accessibilityFilters[key] && styles.filterChipSelected]}
                      onPress={() => setAccessibilityFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
                    >
                      <Text style={[styles.filterChipText, accessibilityFilters[key] && styles.filterChipTextSelected]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Рейтинг от</Text>
                <View style={styles.filterChips}>
                  {[0, 3.5, 4, 4.5].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.filterChip, minRating === r && styles.filterChipSelected]}
                      onPress={() => setMinRating(r)}
                    >
                      <Text style={[styles.filterChipText, minRating === r && styles.filterChipTextSelected]}>
                        {r === 0 ? 'Любой' : `${r}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Модальное окно выбора категории */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity style={styles.categoryModalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Выберите категорию</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Feather name="x" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryModalScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.categoryModalRow, !categoryId && styles.categoryModalRowSelected]}
                onPress={() => { setCategoryId(null); setSubCategoryId(null); setShowCategoryModal(false); }}
              >
                <Text style={styles.categoryModalRowIcon}>📋</Text>
                <Text style={styles.categoryModalRowText}>Все категории</Text>
              </TouchableOpacity>
              {activityCategories.map((cat) => (
                <View key={cat.id}>
                  <TouchableOpacity
                    style={[styles.categoryModalRow, categoryId === cat.id && !subCategoryId && styles.categoryModalRowSelected]}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setSubCategoryId(null);
                      if (cat.subcategories.length === 0) setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.categoryModalRowIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryModalRowText}>{cat.name}</Text>
                    {cat.subcategories.length > 0 && (
                      <Feather name="chevron-right" size={18} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                  {categoryId === cat.id && cat.subcategories.length > 0 && (
                    <View style={styles.subcategoryList}>
                      {cat.subcategories.map((sub) => (
                        <TouchableOpacity
                          key={sub.id}
                          style={[styles.subcategoryRow, subCategoryId === sub.id && styles.categoryModalRowSelected]}
                          onPress={() => {
                            setSubCategoryId(sub.id);
                            setShowCategoryModal(false);
                          }}
                        >
                          <Text style={styles.subcategoryIcon}>{sub.icon || '•'}</Text>
                          <Text style={styles.subcategoryText}>{sub.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Контент */}
      <View style={styles.content}>
        {mapView ? (
          <View style={styles.mapFullContainer}>
            {filteredPlaces.length > 0 ? (
              <YandexMap
                center={{ lat: filteredPlaces[0].coords.lat, lng: filteredPlaces[0].coords.lng }}
                markers={filteredPlaces.map(place => ({
                  id: place.id,
                  lat: place.coords.lat,
                  lng: place.coords.lng,
                  title: place.title,
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
          <View style={styles.listFullContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                {loading
                  ? 'Загрузка мест...'
                  : loadError
                  ? loadError
                  : `Найдено мест: ${filteredPlaces.length}`}
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

      {/* Детали выбранного места — карточка как метка на карте / элемент списка */}
      {selectedPlace && (
        <View style={styles.placeDetails}>
          <TouchableOpacity
            style={styles.closeDetailsButton}
            onPress={() => setSelectedPlace(null)}
          >
            <Feather name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <ScrollView style={styles.detailsScroll}>
            <View style={styles.placeImagePlaceholder}>
              <Text style={styles.placeImageEmojiLarge}>{selectedCategory?.icon || '📍'}</Text>
            </View>
            <View style={styles.detailsContent}>
              <Text style={styles.detailsName}>{selectedPlace.title}</Text>
              <Text style={styles.detailsDescription}>{selectedPlace.description}</Text>
              <View style={styles.detailsGrid}>
                {selectedPlace.address ? (
                  <View style={styles.detailItem}>
                    <Feather name="map-pin" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{selectedPlace.address}</Text>
                  </View>
                ) : null}
                <View style={styles.detailItem}>
                  <Feather name="star" size={16} color="#f59e0b" />
                  <Text style={styles.detailText}>Рейтинг: {selectedPlace.rating}</Text>
                </View>
              </View>
              <View style={styles.features}>
                {selectedPlace.accessibility.wheelchairAccessible && (
                  <View style={styles.featureTag}><Text style={styles.featureText}>♿ Доступно</Text></View>
                )}
                {selectedPlace.accessibility.elevatorOrRamp && (
                  <View style={styles.featureTag}><Text style={styles.featureText}>⬆ Лифт/пандус</Text></View>
                )}
                {selectedPlace.accessibility.parkingNearby && (
                  <View style={styles.featureTag}><Text style={styles.featureText}>🅿 Парковка</Text></View>
                )}
                {selectedPlace.accessibility.publicTransportNearby && (
                  <View style={styles.featureTag}><Text style={styles.featureText}>🚌 Остановка рядом</Text></View>
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
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placeCardSelected: {
    borderColor: '#3b82f6',
  },
  placeImagePlaceholder: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  placeImageEmoji: {
    fontSize: 40,
  },
  placeImageEmojiLarge: {
    fontSize: 56,
  },
  placeInfo: {
    padding: 16,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  placeAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
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
    fontSize: 13,
    color: '#6b7280',
  },
  placeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  tagText: {
    fontSize: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  clearCategoryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearCategoryText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  categoryModalScroll: {
    padding: 16,
    paddingBottom: 32,
  },
  categoryModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  categoryModalRowSelected: {
    backgroundColor: '#eff6ff',
  },
  categoryModalRowIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  categoryModalRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  subcategoryList: {
    paddingLeft: 44,
    paddingBottom: 8,
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  subcategoryIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  subcategoryText: {
    fontSize: 15,
    color: '#374151',
  },
  detailsScroll: {
    flex: 1,
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
