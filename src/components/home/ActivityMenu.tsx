import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Activity } from '../../types/schedule';
import { colors } from '../../constants/colors';

interface ActivityMenuProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}

export const ActivityMenu: React.FC<ActivityMenuProps> = ({
  visible,
  activity,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!activity) return null;

  const handleEdit = () => {
    onEdit(activity);
    onClose();
  };

  const handleDelete = () => {
    onDelete(activity.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEdit}
          >
            <View style={styles.menuItemIcon}>
              <Feather name="edit-2" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Редактировать</Text>
              <Text style={styles.menuItemSubtitle}>Изменить время или детали</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={handleDelete}
          >
            <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
              <Feather name="trash-2" size={20} color={colors.error} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, styles.menuItemTitleDanger]}>Удалить</Text>
              <Text style={styles.menuItemSubtitle}>Удалить активность из расписания</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 8,
  },
  menuItemDanger: {
    backgroundColor: '#fef2f2',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemIconDanger: {
    backgroundColor: '#fee2e2',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  menuItemTitleDanger: {
    color: colors.error,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  cancelButton: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

