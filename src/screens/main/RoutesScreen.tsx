import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useFavorites } from '../../services/favorites/FavoritesContext';
import { useSchedule } from '../../services/schedule/ScheduleContext';
import { Feather } from '@expo/vector-icons';
import { RoutePlan, Place } from '../../types/planner';
import { formatDuration } from '../../utils/timingUtils';
import { PlannerProvider } from '../../services/planner/PlannerContext';
import { CustomActivityStep } from '../../components/planner/CustomActivityStep';

export const RoutesScreen = () => {
  const {
    favoritePlaces,
    userCreatedPlaces,
    savedRoutes,
    removeFavoritePlace,
    removeUserCreatedPlace,
    removeSavedRoute,
  } = useFavorites();
  const { schedule } = useSchedule();
  const [activeTab, setActiveTab] = useState<'routes' | 'favorites'>('routes');
  const [createPlaceOpen, setCreatePlaceOpen] = useState(false);

  // Преобразуем schedule в формат RoutePlan для отображения
  const currentRoutes = useMemo(() => {
    if (schedule.length === 0) return [];
    
    // Группируем активности по дням (упрощенная версия)
    return [{
      id: 'current',
      activities: schedule.map(activity => ({
        id: activity.id,
        place: {
          id: activity.id,
          name: activity.title,
          type: activity.type as any,
          address: activity.location || '',
          description: activity.description || '',
          priceLevel: 2 as const,
          rating: 4.0,
          distance: 0,
          travelTime: 0,
          durationSettings: {
            baseDuration: 60,
            modifiers: {
              company: { solo: 1, couple: 1, friends: 1, kids: 1, colleagues: 1 },
              mood: { relax: 1, educational: 1, fun: 1, romantic: 1, active: 1 }
            }
          },
          image: '',
          workingHours: '',
          features: { wheelchair: false, vegetarian: false, outdoor: false, childFriendly: false },
          coordinates: { lat: 0, lng: 0 }
        },
        startTime: activity.startTime,
        endTime: activity.endTime,
        travelTimeFromPrevious: 0,
        order: 0
      })),
      totalDuration: schedule.reduce((total, activity) => {
        const start = parseInt(activity.startTime.split(':')[0]) * 60 + parseInt(activity.startTime.split(':')[1]);
        const end = parseInt(activity.endTime.split(':')[0]) * 60 + parseInt(activity.endTime.split(':')[1]);
        return total + (end - start);
      }, 0),
      totalCost: schedule.reduce((total, activity) => {
        // Пытаемся найти средний чек из описания или используем 0
        // В будущем можно добавить поле averageBill в Activity
        return total;
      }, 0),
      startPoint: { type: 'current' as const, address: 'Текущее местоположение' }
    }];
  }, [schedule]);

  const allRoutes = [...savedRoutes, ...currentRoutes];

  const RouteCard = ({ route }: { route: RoutePlan }) => (
    <View style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeTitle}>
            Маршрут из {route.activities.length} мест
          </Text>
          <Text style={styles.routeSubtitle}>
            {formatDuration(route.totalDuration)} • ~{route.totalCost}₽
          </Text>
        </View>
        {route.id !== 'current' && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Удалить маршрут',
                'Вы уверены, что хотите удалить этот маршрут?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Удалить', 
                    style: 'destructive',
                    onPress: () => removeSavedRoute(route.id)
                  }
                ]
              );
            }}
          >
            <Feather name="trash-2" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeActivities}>
        {route.activities.map((activity, index) => (
          <View key={activity.id} style={styles.routeActivity}>
            <View style={styles.activityNumber}>
              <Text style={styles.activityNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityName} numberOfLines={1} ellipsizeMode="tail">
                {activity.place.name}
              </Text>
              <Text style={styles.activityTime}>
                {activity.startTime} - {activity.endTime}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const FavoriteCard = ({
    place,
    onRemove,
    removeTitle,
  }: {
    place: Place;
    onRemove: (id: string) => void;
    removeTitle: string;
  }) => {
    const handleRemove = () => {
      Alert.alert(
        removeTitle,
        `Удалить «${place.name}»?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Удалить', 
            style: 'destructive',
            onPress: () => onRemove(place.id),
          }
        ]
      );
    };

    return (
      <TouchableOpacity style={styles.favoriteCard}>
        {place.image ? (
          <Image source={{ uri: place.image }} style={styles.favoriteImage} />
        ) : (
          <View style={[styles.favoriteImage, styles.favoriteImagePlaceholder]}>
            <Feather name="image" size={24} color="#d1d5db" />
          </View>
        )}
        <View style={styles.favoriteInfo}>
          <Text style={styles.favoriteName} numberOfLines={1} ellipsizeMode="tail">
            {place.name}
          </Text>
          <Text style={styles.favoriteAddress} numberOfLines={1} ellipsizeMode="tail">
            <Feather name="map-pin" size={12} color="#6b7280" /> {place.address}
          </Text>
          <View style={styles.favoriteMeta}>
            <View style={styles.metaItem}>
              <Feather name="star" size={14} color="#f59e0b" />
              <Text style={styles.metaText}>{place.rating}</Text>
            </View>
            {place.averageBill && place.averageBill > 0 && (
              <View style={styles.metaItem}>
                <Feather name="credit-card" size={14} color="#6b7280" />
                <Text style={styles.metaText}>~{place.averageBill}₽</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeFavoriteButton}
          onPress={handleRemove}
        >
          <Feather name="x" size={18} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок и табы */}
      <View style={styles.header}>
        <Text style={styles.title}>Мои маршруты</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
            onPress={() => setActiveTab('routes')}
          >
            <Feather name="map" size={18} color={activeTab === 'routes' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
              Маршруты ({allRoutes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Feather name="heart" size={18} color={activeTab === 'favorites' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
              Избранное ({favoritePlaces.length + userCreatedPlaces.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Контент */}
      <ScrollView style={styles.content}>
        {activeTab === 'routes' ? (
          allRoutes.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="map" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>Нет сохраненных маршрутов</Text>
              <Text style={styles.emptyStateText}>
                Создайте маршрут в планировщике, чтобы он появился здесь
              </Text>
            </View>
          ) : (
            <>
              {allRoutes.map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
            </>
          )
        ) : (
          favoritePlaces.length === 0 && userCreatedPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="heart" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>Пока пусто</Text>
              <Text style={styles.emptyStateText}>
                Добавляйте места в избранное на экране поиска; созданные вами активности появятся во втором разделе
              </Text>
              <TouchableOpacity
                style={styles.createPlaceButton}
                onPress={() => setCreatePlaceOpen(true)}
                activeOpacity={0.88}
              >
                <Feather name="plus-circle" size={20} color="white" />
                <Text style={styles.createPlaceButtonText}>Создать место</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.favoritesSections}>
              <TouchableOpacity
                style={styles.createPlaceButtonInline}
                onPress={() => setCreatePlaceOpen(true)}
                activeOpacity={0.88}
              >
                <Feather name="plus-circle" size={18} color="#3b82f6" />
                <Text style={styles.createPlaceButtonInlineText}>Создать место</Text>
              </TouchableOpacity>
              {favoritePlaces.length > 0 && (
                <View style={styles.favoritesSection}>
                  <Text style={styles.favoritesSectionTitle}>Избранные места</Text>
                  <View style={styles.favoritesGrid}>
                    {favoritePlaces.map(place => (
                      <FavoriteCard
                        key={place.id}
                        place={place}
                        onRemove={removeFavoritePlace}
                        removeTitle="Удалить из избранного"
                      />
                    ))}
                  </View>
                </View>
              )}
              {userCreatedPlaces.length > 0 && (
                <View style={styles.favoritesSection}>
                  <Text style={styles.favoritesSectionTitle}>Созданные вами</Text>
                  <View style={styles.favoritesGrid}>
                    {userCreatedPlaces.map(place => (
                      <FavoriteCard
                        key={place.id}
                        place={place}
                        onRemove={removeUserCreatedPlace}
                        removeTitle="Удалить место"
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>

      <Modal
        visible={createPlaceOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreatePlaceOpen(false)}
      >
        <PlannerProvider
          catalogStandalone
          onDismissCatalogStandalone={() => setCreatePlaceOpen(false)}
        >
          <View style={styles.catalogModalWrap}>
            <TouchableOpacity
              style={styles.catalogModalClose}
              onPress={() => setCreatePlaceOpen(false)}
            >
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
            <CustomActivityStep onPlanSaved={() => setCreatePlaceOpen(false)} />
          </View>
        </PlannerProvider>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  routeActivities: {
    marginTop: 8,
  },
  routeActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 200,
  },
  activityNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activityNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 18,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  favoritesSections: {
    gap: 24,
    paddingBottom: 24,
  },
  favoritesSection: {
    gap: 12,
  },
  favoritesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  favoriteCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  favoriteImage: {
    width: '100%',
    height: 120,
  },
  favoriteImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteInfo: {
    padding: 12,
  },
  favoriteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 18,
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 8,
  },
  favoriteMeta: {
    flexDirection: 'row',
    gap: 12,
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
  removeFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createPlaceButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createPlaceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  createPlaceButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 8,
  },
  createPlaceButtonInlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  catalogModalWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  catalogModalClose: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 100,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});
