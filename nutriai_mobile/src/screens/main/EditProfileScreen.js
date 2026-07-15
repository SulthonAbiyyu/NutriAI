import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets }       from 'react-native-safe-area-context';
import { updateProfile, changePassword } from '../../services/ProfileService';
import Input   from '../../components/common/Input';
import Button  from '../../components/common/Button';
import Card    from '../../components/common/Card';
import { Colors, Spacing, Radius, Typography } from '../../theme';

const TABS = ['Profil', 'Password'];

const TUJUAN_OPTS   = [{ val: 'bulking', label: '⬆ Bulking' }, { val: 'cutting', label: '⬇ Cutting' }, { val: 'maintain', label: '= Maintain' }];
const AKTIVITAS_OPTS = [
  { val: 'sangat_tidak_aktif', label: 'Sangat Tidak Aktif' },
  { val: 'aktivitas_ringan',   label: 'Aktif Ringan' },
  { val: 'aktivitas_sedang',   label: 'Aktif Sedang' },
  { val: 'aktivitas_berat',    label: 'Aktif Berat' },
];
const TUBUH_OPTS    = [{ val: 'ectomorph', label: 'Ectomorph 🏃' }, { val: 'mesomorph', label: 'Mesomorph 💪' }, { val: 'endomorph', label: 'Endomorph 🏋️' }];
const GENDER_OPTS   = [{ val: 'laki_laki', label: 'Laki-laki' }, { val: 'perempuan', label: 'Perempuan' }];

function SegmentedPicker({ options, value, onChange }) {
  return (
    <View style={styles.picker}>
      {options.map(o => (
        <TouchableOpacity
          key={o.val}
          style={[styles.pickerOpt, value === o.val && styles.pickerOptActive]}
          onPress={() => onChange(o.val)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pickerLabel, value === o.val && styles.pickerLabelActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const route      = useRoute();
  const { user, tab: initTab } = route.params || {};

  const [activeTab, setActiveTab] = useState(initTab === 'password' ? 1 : 0);
  const [saving, setSaving]       = useState(false);

  // Profile form
  const [form, setForm] = useState({
    umur:       String(user?.umur || ''),
    tb:         String(user?.tb || ''),
    bb:         String(user?.bb || ''),
    tujuan:     user?.tujuan     || 'maintain',
    aktivitas:  user?.aktivitas  || 'aktivitas_sedang',
    tipe_tubuh: user?.tipe_tubuh || 'mesomorph',
    gender:     user?.gender     || 'laki_laki',
  });

  // Password form
  const [pwForm, setPwForm] = useState({ lama: '', baru: '', konfirmasi: '' });

  const setField   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPwField = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    if (!form.umur || !form.tb || !form.bb) {
      return Alert.alert('Error', 'Semua field wajib diisi');
    }
    setSaving(true);
    try {
      await updateProfile({
        umur:       parseInt(form.umur),
        tb:         parseInt(form.tb),
        bb:         parseInt(form.bb),
        tujuan:     form.tujuan,
        aktivitas:  form.aktivitas,
        tipe_tubuh: form.tipe_tubuh,
        gender:     form.gender,
      });
      Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!pwForm.lama || !pwForm.baru) return Alert.alert('Error', 'Semua field wajib diisi');
    if (pwForm.baru !== pwForm.konfirmasi) return Alert.alert('Error', 'Konfirmasi password tidak cocok');
    if (pwForm.baru.length < 6) return Alert.alert('Error', 'Password minimal 6 karakter');
    setSaving(true);
    try {
      await changePassword(pwForm.lama, pwForm.baru, pwForm.konfirmasi);
      Alert.alert('Berhasil', 'Password berhasil diganti', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal mengganti password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profil</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        {activeTab === 0 ? (
          <Card>
            <Text style={styles.fieldLabel}>Berat Badan (kg)</Text>
            <Input placeholder="65" value={form.bb} onChangeText={v => setField('bb', v)} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Tinggi Badan (cm)</Text>
            <Input placeholder="170" value={form.tb} onChangeText={v => setField('tb', v)} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Umur</Text>
            <Input placeholder="22" value={form.umur} onChangeText={v => setField('umur', v)} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Tujuan Diet</Text>
            <SegmentedPicker options={TUJUAN_OPTS}   value={form.tujuan}     onChange={v => setField('tujuan', v)} />
            <Text style={styles.fieldLabel}>Tingkat Aktivitas</Text>
            <SegmentedPicker options={AKTIVITAS_OPTS} value={form.aktivitas}  onChange={v => setField('aktivitas', v)} />
            <Text style={styles.fieldLabel}>Tipe Tubuh</Text>
            <SegmentedPicker options={TUBUH_OPTS}    value={form.tipe_tubuh} onChange={v => setField('tipe_tubuh', v)} />
            <Text style={styles.fieldLabel}>Gender</Text>
            <SegmentedPicker options={GENDER_OPTS}   value={form.gender}     onChange={v => setField('gender', v)} />
            <Button label={saving ? 'Menyimpan...' : 'Simpan Profil'} onPress={saveProfile} disabled={saving} style={{ marginTop: 16 }} />
          </Card>
        ) : (
          <Card>
            <Text style={styles.fieldLabel}>Password Lama</Text>
            <Input placeholder="••••••" value={pwForm.lama} onChangeText={v => setPwField('lama', v)} secureTextEntry />
            <Text style={styles.fieldLabel}>Password Baru</Text>
            <Input placeholder="Min. 6 karakter" value={pwForm.baru} onChangeText={v => setPwField('baru', v)} secureTextEntry />
            <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
            <Input placeholder="Ulangi password baru" value={pwForm.konfirmasi} onChangeText={v => setPwField('konfirmasi', v)} secureTextEntry />
            <Button label={saving ? 'Menyimpan...' : 'Ganti Password'} onPress={savePassword} disabled={saving} style={{ marginTop: 16 }} />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.text },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },

  tabs:          { flexDirection: 'row', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: Colors.primary },
  tabLabel:      { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive:{ color: Colors.primary },

  content:    { padding: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  picker:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pickerOpt:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  pickerOptActive:  { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pickerLabel:      { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  pickerLabelActive:{ color: Colors.primary },
});
