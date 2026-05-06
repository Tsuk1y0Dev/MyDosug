import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { useAuth } from '../../services/auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { Feather } from '@expo/vector-icons';
import { PrivacyPolicyContent } from '../../components/legal/PrivacyPolicyContent';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen = () => {
  const { register } = useAuth();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handleRegister = async () => {
    if (!acceptedPrivacy) {
      Alert.alert(
        'Политика конфиденциальности',
        'Пожалуйста, подтвердите согласие с политикой конфиденциальности.',
      );
      return;
    }
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setIsLoading(true);
    const result = await register(email.trim(), password, name.trim());
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Ошибка регистрации', result.error || 'Не удалось зарегистрироваться');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Feather name="user-plus" size={48} color="#3b82f6" />
              <Text style={styles.title}>Регистрация</Text>
              <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Имя"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Пароль"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.privacyAgreementBlock}>
                <TouchableOpacity
                  onPress={() => setAcceptedPrivacy((v) => !v)}
                  style={styles.privacyAgreementToggle}
                >
                  <Feather
                    name={acceptedPrivacy ? "check-square" : "square"}
                    size={20}
                    color={acceptedPrivacy ? "#3b82f6" : "#6b7280"}
                  />
                </TouchableOpacity>
                <Text style={styles.privacyAgreementText}>
                  Я согласен(а) с обработкой данных и условиями использования
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setPrivacyModalVisible(true)}
                style={styles.privacyPolicyLink}
              >
                <Text style={styles.privacyPolicyLinkText}>
                  Политика конфиденциальности
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (isLoading || !acceptedPrivacy) && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isLoading || !acceptedPrivacy}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
                    <Feather name="arrow-right" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLinkText}>
                  Уже есть аккаунт? <Text style={styles.loginLinkBold}>Войти</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Политика конфиденциальности</Text>
            <TouchableOpacity
              onPress={() => setPrivacyModalVisible(false)}
              style={styles.modalHeaderClose}
            >
              <Feather name="x" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <PrivacyPolicyContent />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkBold: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  privacyAgreementBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 2,
  },
  privacyAgreementToggle: {
    padding: 4,
  },
  privacyAgreementText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  privacyPolicyLink: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
  },
  privacyPolicyLinkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalHeaderClose: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
});
