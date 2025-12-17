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
import { mockStartPoints } from '../../data/mockPlaces';
import { StartPoint } from '../../types/planner';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface UserSettings {
  defaultStartPoint: StartPoint;
  defaultTransportMode: 'walking' | 'car' | 'public';
  notificationsEnabled: boolean;
  accessibilityMode: boolean;
  vegetarian: boolean;
  wheelchairAccessible: boolean;
  averageWalkingTime: number; // в минутах
}

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  // Редирект на авторизацию, если пользователь не залогинен
  useEffect(() => {
    if (!user) {
      // @ts-ignore
      navigation.navigate('Auth', { screen: 'Login' });
    }
  }, [user, navigation]);
  const [settings, setSettings] = useState<UserSettings>({
    defaultStartPoint: mockStartPoints[0],
    defaultTransportMode: 'walking',
    notificationsEnabled: true,
    accessibilityMode: false,
    vegetarian: false,
    wheelchairAccessible: false,
    averageWalkingTime: 15, // минут
  });
  const [editingWalkingTime, setEditingWalkingTime] = useState(false);
  const [walkingTimeInput, setWalkingTimeInput] = useState(settings.averageWalkingTime.toString());

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
        </View>

        {/* Настройки по умолчанию */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки по умолчанию</Text>
          
          <SettingRow
            label="Точка старта"
            value={mockStartPoints.find(p => p.type === settings.defaultStartPoint.type)?.label || settings.defaultStartPoint.address}
            icon="map-pin"
            onPress={() => {
              Alert.alert(
                'Точка старта',
                'Выберите точку старта по умолчанию',
                [
                  ...mockStartPoints.map(point => ({
                    text: point.label,
                    onPress: () => setSettings(prev => ({ ...prev, defaultStartPoint: point }))
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
                  { text: 'Пешком', onPress: () => setSettings(prev => ({ ...prev, defaultTransportMode: 'walking' })) },
                  { text: 'На машине', onPress: () => setSettings(prev => ({ ...prev, defaultTransportMode: 'car' })) },
                  { text: 'Общественный транспорт', onPress: () => setSettings(prev => ({ ...prev, defaultTransportMode: 'public' })) },
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
            onValueChange={(value) => setSettings(prev => ({ ...prev, vegetarian: value }))}
            icon="heart"
          />

          <SwitchRow
            label="Требуется доступность для инвалидных колясок"
            value={settings.wheelchairAccessible}
            onValueChange={(value) => setSettings(prev => ({ ...prev, wheelchairAccessible: value }))}
            icon="user"
          />
        </View>

        {/* Уведомления */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          
          <SwitchRow
            label="Уведомления"
            value={settings.notificationsEnabled}
            onValueChange={(value) => setSettings(prev => ({ ...prev, notificationsEnabled: value }))}
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
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
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
});
