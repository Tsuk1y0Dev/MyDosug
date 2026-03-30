import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Feather } from '@expo/vector-icons';
import { StartPoint } from '../../types/planner';
import { useUser } from '../../context/UserContext';
import { defaultStartPoints } from '../../data/startPoints';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { profile, updateProfile, updateAccessibilitySettings } = useUser();

  // Редирект на авторизацию, если пользователь не залогинен
  useEffect(() => {
    if (!user) {
      // @ts-ignore
      navigation.navigate('Auth', { screen: 'Login' });
    }
  }, [user, navigation]);
  const [settings, setSettings] = useState<{
    defaultStartPoint: StartPoint;
    defaultTransportMode: 'walking' | 'car' | 'public';
    notificationsEnabled: boolean;
    vegetarian: boolean;
    wheelchairAccessible: boolean;
    averageWalkingTime: number;
  }>({
    defaultStartPoint: defaultStartPoints[0] as StartPoint,
    defaultTransportMode: 'walking' as 'walking' | 'car' | 'public',
    notificationsEnabled: true,
    vegetarian: false,
    wheelchairAccessible: false,
    averageWalkingTime: 15,
  });
  const [editingWalkingTime, setEditingWalkingTime] = useState(false);
  const [walkingTimeInput, setWalkingTimeInput] = useState(settings.averageWalkingTime.toString());

  useEffect(() => {
    if (profile) {
      const fallback = defaultStartPoints[0];
      const fromProfile = profile.defaultStartPoint as StartPoint | undefined;
      const nextStartPoint: StartPoint =
        fromProfile && ['home', 'work', 'current', 'custom'].includes(fromProfile.type)
          ? fromProfile
          : (fallback as StartPoint);

      setSettings(prev => ({
        ...prev,
        defaultStartPoint: nextStartPoint,
        defaultTransportMode: profile.defaultTransportMode,
        notificationsEnabled: profile.notificationsEnabled,
        vegetarian: profile.vegetarian,
        wheelchairAccessible: profile.wheelchairAccessible,
        averageWalkingTime: profile.averageWalkingTime,
      }));
      setWalkingTimeInput(String(profile.averageWalkingTime));
    }
  }, [profile]);

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            // @ts-ignore
            navigation.navigate('Auth', { screen: 'Login' });
          }
        }
      ]
    );
  };

  const handleWalkingTimeSave = () => {
    const time = parseInt(walkingTimeInput, 10);
    if (!isNaN(time) && time > 0 && time <= 120) {
      setSettings(prev => ({ ...prev, averageWalkingTime: time }));
      updateProfile({ averageWalkingTime: time });
      setEditingWalkingTime(false);
    } else {
      Alert.alert('Ошибка', 'Введите корректное значение (1-120 минут)');
    }
  };


  // Если пользователь не залогинен, показываем пустой экран (редирект произойдет)
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const SettingRow = ({ 
    label, 
    value, 
    onPress, 
    icon 
  }: { 
    label: string; 
    value: string; 
    onPress?: () => void;
    icon: keyof typeof Feather.glyphMap;
  }) => (
    <TouchableOpacity 
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Feather name={icon} size={20} color="#6b7280" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        <Text style={styles.settingValue}>{value}</Text>
        {onPress && <Feather name="chevron-right" size={20} color="#9ca3af" />}
      </View>
    </TouchableOpacity>
  );

  const SwitchRow = ({ 
    label, 
    value, 
    onValueChange, 
    icon 
  }: { 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
    icon: keyof typeof Feather.glyphMap;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Feather name={icon} size={20} color="#6b7280" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
        thumbColor={value ? 'white' : '#f3f4f6'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Профиль пользователя */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={48} color="#3b82f6" />
          </View>
          <Text style={styles.userName}>{user?.name || 'Пользователь'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {profile?.accessibilitySettings && (
            <View style={styles.profileChips}>
              {profile.accessibilitySettings.needsRamp && (
                <View style={styles.profileChip}>
                  <Text style={styles.profileChipText}>♿ Нужен пандус</Text>
                </View>
              )}
              {profile.accessibilitySettings.needsElevator && (
                <View style={styles.profileChip}>
                  <Text style={styles.profileChipText}>⬆ Нужен лифт</Text>
                </View>
              )}
              {settings.vegetarian && (
                <View style={styles.profileChip}>
                  <Text style={styles.profileChipText}>🌱 Вегетарианец</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Настройки по умолчанию */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки по умолчанию</Text>
          
          <SettingRow
            label="Точка старта"
            value={defaultStartPoints.find(p => p.type === settings.defaultStartPoint.type)?.label || settings.defaultStartPoint.address}
            icon="map-pin"
            onPress={() => {
              Alert.alert(
                'Точка старта',
                'Выберите точку старта по умолчанию',
                [
                  ...defaultStartPoints.map(point => ({
                    text: point.label,
                    onPress: () => {
                      setSettings(prev => ({ ...prev, defaultStartPoint: point }));
                      updateProfile({ defaultStartPoint: point });
                    }
                  })),
                  { text: 'Отмена', style: 'cancel' }
                ]
              );
            }}
          />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Feather name="clock" size={20} color="#6b7280" />
              <Text style={styles.settingLabel} numberOfLines={2}>Среднее время ходьбы</Text>
            </View>
            <View style={styles.settingRight}>
              {editingWalkingTime ? (
                <View style={styles.budgetEdit}>
                  <TextInput
                    style={styles.budgetInput}
                    value={walkingTimeInput}
                    onChangeText={setWalkingTimeInput}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.unitText}>мин</Text>
                  <TouchableOpacity onPress={handleWalkingTimeSave}>
                    <Feather name="check" size={20} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setWalkingTimeInput(settings.averageWalkingTime.toString());
                    setEditingWalkingTime(false);
                  }}>
                    <Feather name="x" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingWalkingTime(true)}
                  style={styles.budgetDisplay}
                >
                  <Text style={styles.settingValue}>{settings.averageWalkingTime} мин</Text>
                  <Feather name="edit-2" size={16} color="#9ca3af" style={styles.editIcon} />
                </TouchableOpacity>
              )}
            </View>
          </View>


          <SettingRow
            label="Транспорт"
            value={
              settings.defaultTransportMode === 'walking' ? 'Пешком' :
              settings.defaultTransportMode === 'car' ? 'На машине' :
              'Общественный транспорт'
            }
            icon="navigation"
            onPress={() => {
              Alert.alert(
                'Режим транспорта',
                'Выберите режим транспорта по умолчанию',
                [
                  {
                    text: 'Пешком',
                    onPress: () => {
                      setSettings(prev => ({ ...prev, defaultTransportMode: 'walking' }));
                      updateProfile({ defaultTransportMode: 'walking' });
                    },
                  },
                  {
                    text: 'На машине',
                    onPress: () => {
                      setSettings(prev => ({ ...prev, defaultTransportMode: 'car' }));
                      updateProfile({ defaultTransportMode: 'car' });
                    },
                  },
                  {
                    text: 'Общественный транспорт',
                    onPress: () => {
                      setSettings(prev => ({ ...prev, defaultTransportMode: 'public' }));
                      updateProfile({ defaultTransportMode: 'public' });
                    },
                  },
                  { text: 'Отмена', style: 'cancel' }
                ]
              );
            }}
          />
        </View>

        {/* Характеристики пользователя */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Характеристики</Text>
          
          <SwitchRow
            label="Вегетарианец"
            value={settings.vegetarian}
            onValueChange={(value) => {
              setSettings(prev => ({ ...prev, vegetarian: value }));
              updateProfile({ vegetarian: value });
            }}
            icon="heart"
          />

          <SwitchRow
            label="Требуется доступность для инвалидных колясок"
            value={settings.wheelchairAccessible}
            onValueChange={(value) => {
              setSettings(prev => ({ ...prev, wheelchairAccessible: value }));
              updateProfile({ wheelchairAccessible: value });
              updateAccessibilitySettings({ needsRamp: value });
            }}
            icon="user"
          />

          <SwitchRow
            label="Нужен лифт (этажность, ТЦ)"
            value={profile?.accessibilitySettings?.needsElevator ?? false}
            onValueChange={(value) => {
              updateAccessibilitySettings({ needsElevator: value });
            }}
            icon="activity"
          />
        </View>

        {/* Уведомления */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          
          <SwitchRow
            label="Уведомления"
            value={settings.notificationsEnabled}
            onValueChange={(value) => {
              setSettings(prev => ({ ...prev, notificationsEnabled: value }));
              updateProfile({ notificationsEnabled: value });
            }}
            icon="bell"
          />
        </View>

        {/* Дополнительные действия */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дополнительно</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="help-circle" size={20} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Помощь и поддержка</Text>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Feather name="file-text" size={20} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Условия использования</Text>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Feather name="shield" size={20} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Политика конфиденциальности</Text>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Выход */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Выйти</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Версия 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  profileChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  profileChipText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 20,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 20,
  },
  budgetEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'right',
  },
  budgetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editIcon: {
    marginLeft: 4,
  },
  unitText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  savedLocationInputRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  savedLocationInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    fontSize: 14,
  },
  savedLocationTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  locationTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    gap: 4,
  },
  locationTypeChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  locationTypeChipIcon: {
    fontSize: 14,
  },
  locationTypeChipText: {
    fontSize: 13,
    color: '#374151',
  },
  locationTypeChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addLocationButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  savedLocationEmpty: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontSize: 13,
    color: '#6b7280',
  },
  savedLocationList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  savedLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  savedLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedLocationIcon: {
    fontSize: 18,
  },
  savedLocationName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  savedLocationCoords: {
    fontSize: 12,
    color: '#6b7280',
  },
  addLocationMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  addLocationMapButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  savedLocationCoordsPreview: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  mapPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPickerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
  },
  mapPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  mapPickerMap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  mapPickerCoords: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  mapPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapPickerCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  mapPickerCancelText: {
    fontSize: 14,
    color: '#374151',
  },
  mapPickerSave: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  mapPickerSaveText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});
