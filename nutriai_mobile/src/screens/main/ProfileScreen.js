import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }           from '../../context/AuthContext';
import { getProfile }        from '../../services/ProfileService';
import { useApi }            from '../../hooks/useApi';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import Card                  from '../../components/common/Card';
import Badge                 from '../../components/common/Badge';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { getTujuanConfig, getBmiStatus } from '../../utils';

const LABEL = {
  aktivitas: {
    sangat_tidak_aktif: 'Sangat Tidak Aktif',
    aktivitas_ringan:   'Aktif Ringan',
    aktivitas_sedang:   'Aktif Sedang',
    aktivitas_berat:    'Aktif Berat',
  },
  tipe_tubuh: { ectomorph: 'Ectomorph 🏃', mesomorph: 'Mesomorph 💪', endomorph: 'Endomorph 🏋️' },
  gender:     { laki_laki: 'Laki-laki', perempuan: 'Perempuan' },
};

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function MenuRow({ icon, label, sub, onPress, danger, rightBadge }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      {rightBadge ? (
        <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{rightBadge}</Text></View>
      ) : null}
      <Text style={[styles.menuArrow, danger && { color: Colors.danger }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: user, loading, execute } = useApi(getProfile);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin logout?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading && !user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={execute}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>Tap untuk retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tujuan  = getTujuanConfig(user.tujuan);
  const bmiInfo = getBmiStatus(user.bmi);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ── Avatar & Name ── */}
        <Card style={styles.heroCard}>
          <View style={styles.hero}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{user.username[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.heroName}>{user.username}</Text>
              <View style={styles.badgeRow}>
                <Badge label={tujuan.label} color={tujuan.color} bg={tujuan.bg} />
              </View>
              <View style={[styles.badgeRow, { marginTop: 5 }]}>
                <Badge
                  label={LABEL.tipe_tubuh[user.tipe_tubuh] || user.tipe_tubuh}
                  color={Colors.blue} bg={Colors.blueLight}
                />
              </View>
            </View>
          </View>

          {/* BMI Bar */}
          <View style={styles.bmiBar}>
            <View style={[styles.bmiCircle, { backgroundColor: bmiInfo.color }]}>
              <Text style={styles.bmiVal}>{user.bmi}</Text>
              <Text style={styles.bmiUnit}>BMI</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.bmiStatus, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>
              <Text style={styles.bmiDesc}>
                {user.bmi < 18.5 ? 'Perlu tambah berat badan'
                  : user.bmi < 25 ? 'Berat badan ideal ✅'
                  : user.bmi < 30 ? 'Sedikit berlebih'
                  : 'Perlu turunkan berat badan'}
              </Text>
              <Text style={styles.tdeeText}>TDEE: {user.tdee} kcal/hari</Text>
            </View>
          </View>
        </Card>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Berat',  val: `${user.bb} kg`,    color: Colors.primary },
            { label: 'Tinggi', val: `${user.tb} cm`,    color: Colors.blue    },
            { label: 'Umur',   val: `${user.umur} thn`, color: Colors.purple  },
            { label: 'BMR',    val: `${user.bmr}`,      color: Colors.warning },
          ].map(s => (
            <View key={s.label} style={[styles.statChip, { borderTopColor: s.color, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Data Diri ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Data Diri</Text>
          <InfoRow label="Gender"    value={LABEL.gender[user.gender] || user.gender} />
          <InfoRow label="Aktivitas" value={LABEL.aktivitas[user.aktivitas] || user.aktivitas} />
          <InfoRow label="Tujuan"    value={user.tujuan.charAt(0).toUpperCase() + user.tujuan.slice(1)} />
          <InfoRow label="TDEE"      value={`${user.tdee} kcal / hari`} />
        </Card>

        {/* ── Fitur Tracking ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Tracking</Text>
          <MenuRow icon="⚖️" label="Weight Tracker"  sub="Pantau perubahan berat badan"  onPress={() => navigation.navigate('WeightTracker')} />
          <MenuRow icon="💧" label="Water Tracker"   sub="Target minum harian"           onPress={() => navigation.navigate('WaterTracker')}  />
          <MenuRow icon="🔥" label="Streak"          sub="Konsistensi input makanan"      onPress={() => navigation.navigate('Streak')}         />
          <MenuRow icon="📦" label="Meal Templates"  sub="Preset kombinasi makanan"       onPress={() => navigation.navigate('MealTemplates')}  />
          <MenuRow icon="🤖" label="Chat NutriAI"    sub="Tanya soal nutrisi & diet"      onPress={() => navigation.navigate('AiChat')}         />
        </Card>

        {/* ── Pengaturan ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Pengaturan</Text>
          <MenuRow icon="✏️" label="Edit Profil"   sub="Ubah data fisik & tujuan"       onPress={() => navigation.navigate('EditProfile', { user })} />
          <MenuRow icon="🔒" label="Ganti Password" sub="Ubah password akun"            onPress={() => navigation.navigate('EditProfile', { user, tab: 'password' })} />
        </Card>

        {/* ── Logout ── */}
        <Card>
          <MenuRow icon="🚪" label="Logout" onPress={handleLogout} danger />
        </Card>

        {/* App Version */}
        <Text style={styles.version}>NutriAI v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  heroCard: { marginBottom: 14 },
  hero:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bigAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  bigAvatarText: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  heroName:  { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  badgeRow:  {},

  bmiBar:    { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  bmiCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  bmiVal:    { fontSize: 16, fontWeight: '900', color: Colors.white },
  bmiUnit:   { fontSize: 9, fontWeight: '700', color: Colors.white },
  bmiStatus: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  bmiDesc:   { fontSize: 12, color: Colors.textSecondary },
  tdeeText:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statChip: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, alignItems: 'center', ...Shadow.xs },
  statVal:  { fontSize: 13, fontWeight: '800' },
  statLbl:  { fontSize: 9, color: Colors.textSecondary, marginTop: 3, fontWeight: '600' },

  section:      { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: '60%', textAlign: 'right' },

  menuRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuIcon:   { fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' },
  menuLabel:  { fontSize: 14, color: Colors.text, fontWeight: '600' },
  menuSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  menuArrow:  { fontSize: 20, color: Colors.textMuted, marginLeft: 8 },
  menuBadge:  { backgroundColor: Colors.danger, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 },
  menuBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '800' },

  version: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, marginTop: 8 },
});