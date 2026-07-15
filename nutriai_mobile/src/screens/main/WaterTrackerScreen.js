import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation }       from '@react-navigation/native';
import { useSafeAreaInsets }   from 'react-native-safe-area-context';
import { getWaterToday, addWater } from '../../services/WaterService';
import { useApi }              from '../../hooks/useApi';
import { useRefreshOnFocus }   from '../../hooks/useRefreshOnFocus';
import Card                    from '../../components/common/Card';
import ProgressBar             from '../../components/common/ProgressBar';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const QUICK_ML = [150, 250, 350, 500];

export default function WaterTrackerScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving]         = useState(false);
  const { data, loading, execute }  = useApi(getWaterToday);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleAdd = async (ml) => {
    setSaving(true);
    try {
      await addWater(ml);
      await execute();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const total    = data?.total_ml  || 0;
  const target   = data?.target_ml || 2000;
  const progress = data?.progress  || 0;
  const sisa     = data?.sisa_ml   || target;
  const logs     = data?.logs      || [];

  // Visual: jumlah gelas penuh (250ml per gelas, max 8 gelas)
  const gelasTarget = Math.ceil(target / 250);
  const gelasIsi    = Math.floor(total  / 250);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💧 Water Tracker</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      >
        {/* Circular Progress */}
        <Card style={styles.mainCard}>
          <View style={styles.circleWrap}>
            <View style={[styles.circle, { borderColor: progress >= 100 ? Colors.success : Colors.blue }]}>
              <Text style={styles.circleNum}>{total}</Text>
              <Text style={styles.circleUnit}>ml</Text>
              <Text style={styles.circlePct}>{Math.round(progress)}%</Text>
            </View>
          </View>

          <ProgressBar value={progress} color={progress >= 100 ? Colors.success : Colors.blue} style={{ marginBottom: 8 }} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: Colors.blue }]}>{total} ml</Text>
              <Text style={styles.statLbl}>Diminum</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: Colors.textSecondary }]}>{target} ml</Text>
              <Text style={styles.statLbl}>Target</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: sisa === 0 ? Colors.success : Colors.danger }]}>{sisa} ml</Text>
              <Text style={styles.statLbl}>Sisa</Text>
            </View>
          </View>

          {/* Gelas visualisasi */}
          <View style={styles.gelasRow}>
            {Array.from({ length: Math.min(gelasTarget, 10) }).map((_, i) => (
              <Text key={i} style={[styles.gelasIcon, i < gelasIsi && styles.gelasIsi]}>
                {i < gelasIsi ? '🥤' : '🫙'}
              </Text>
            ))}
          </View>
          {progress >= 100 && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>🎉 Target air minum tercapai!</Text>
            </View>
          )}
        </Card>

        {/* Quick Add Buttons */}
        <Card>
          <Text style={styles.sectionTitle}>➕ Tambah Air</Text>
          <View style={styles.quickRow}>
            {QUICK_ML.map(ml => (
              <TouchableOpacity
                key={ml}
                style={[styles.quickBtn, saving && styles.quickBtnDisabled]}
                onPress={() => handleAdd(ml)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.quickBtnIcon}>💧</Text>
                <Text style={styles.quickBtnLabel}>{ml} ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Log Hari Ini */}
        <Card>
          <Text style={styles.sectionTitle}>📋 Log Hari Ini</Text>
          {loading && !data ? (
            <ActivityIndicator size="small" color={Colors.blue} style={{ marginVertical: 12 }} />
          ) : logs.length === 0 ? (
            <Text style={styles.empty}>Belum ada input air hari ini</Text>
          ) : (
            logs.map((log, i) => (
              <View key={log.id || i} style={styles.logRow}>
                <Text style={styles.logTime}>{log.waktu_input || '--:--'}</Text>
                <Text style={styles.logMl}>{log.ml} ml</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.text },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  mainCard:   { marginBottom: 14, alignItems: 'center' },
  circleWrap: { marginVertical: 16 },
  circle: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.blueLight,
  },
  circleNum:  { fontSize: 30, fontWeight: '900', color: Colors.blue },
  circleUnit: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  circlePct:  { fontSize: 13, color: Colors.blue, fontWeight: '700' },

  statsRow: { flexDirection: 'row', width: '100%', marginTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 15, fontWeight: '800' },
  statLbl:  { fontSize: 10, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },

  gelasRow:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 16 },
  gelasIcon:   { fontSize: 22, opacity: 0.3 },
  gelasIsi:    { opacity: 1 },

  successBanner: { marginTop: 14, backgroundColor: Colors.successLight, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16, width: '100%', alignItems: 'center' },
  successText:   { color: Colors.success, fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1, backgroundColor: Colors.blueLight,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  quickBtnDisabled: { opacity: 0.5 },
  quickBtnIcon:  { fontSize: 22, marginBottom: 4 },
  quickBtnLabel: { fontSize: 12, fontWeight: '700', color: Colors.blue },

  empty:  { color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  logTime:{ fontSize: 13, color: Colors.textSecondary },
  logMl:  { fontSize: 14, fontWeight: '700', color: Colors.blue },
});
