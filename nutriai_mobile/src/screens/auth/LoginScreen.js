import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login }             from '../../services/AuthService';
import { useAuth }           from '../../context/AuthContext';
import Input                 from '../../components/common/Input';
import Button                from '../../components/common/Button';
import { Colors, Spacing, Radius, Shadow, Typography } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Oops!', 'Username dan password wajib diisi'); return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      // Kirim userData ke signIn agar AuthContext bisa set userId + Axios header
      await signIn(res?.data?.user || res?.user || null);
    } catch (err) {
      Alert.alert('Login Gagal', err.response?.data?.error || 'Periksa username dan password kamu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🥗</Text>
          </View>
          <Text style={styles.appName}>NutriAI</Text>
          <Text style={styles.tagline}>Pantau nutrisi harianmu dengan cerdas</Text>
        </View>

        {/* ─── Form Card ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selamat Datang 👋</Text>
          <Text style={styles.cardSub}>Masuk untuk melanjutkan</Text>

          <Input
            label="Username"
            placeholder="Masukkan username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Password"
            placeholder="Masukkan password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            label="Masuk"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 4 }}
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Belum punya akun?{' '}
              <Text style={styles.registerBold}>Daftar Sekarang</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },

  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  logoWrap: {
    width: 80, height: 80, borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, ...Shadow.md,
  },
  logoEmoji: { fontSize: 40 },
  appName:   { ...Typography.h1, color: Colors.primary, letterSpacing: 1 },
  tagline:   { ...Typography.body, marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  cardTitle: { ...Typography.h2, marginBottom: 4 },
  cardSub:   { ...Typography.body, marginBottom: Spacing.lg },

  registerLink: { marginTop: Spacing.md, alignItems: 'center' },
  registerText: { ...Typography.body },
  registerBold: { color: Colors.primary, fontWeight: '700' },
});