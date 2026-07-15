/**
 * StreakScreen.js
 *
 * Visualisasi streak input makanan dengan:
 * - Flame animasi (kalau streak aktif)
 * - Kalender 30 hari terakhir (hijau = input, abu = tidak)
 * - Statistik: current streak, longest streak, last input
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation }      from '@react-navigation/native';
import { useSafeAreaInsets }  from 'react-native-safe-area-context';
import { getStreak }          from '../../services/StreakService';
import { getLaporan }         from '../../services/LaporanService';
import { useApi }             from '../../hooks/useApi';
import { useRefreshOnFocus }  from '../../hooks/useRefreshOnFocus';
import Card                   from '../../components/common/Card';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { formatDate } from '../../utils';

// ─── Helpers ─────────────────────────────────────────

function buildCalendar(laporan = []) {
  // Kumpulkan semua tanggal yang ada laporan
  const logDates = new Set(
    laporan.map(l => new Date(l.tanggal).toISOString().split('T')[0])
  );
  // 35 hari ke belakang (5 minggu penuh)
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    days.push({
      iso,
      day:     d.getDate(),
      weekday: d.getDay(), // 0=Sun
      hasLog:  logDates.has(iso),
      isToday: i === 0,
    });
  }
  return days;
}

const WEEKDAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// ─── Screen ──────────────────────────────────────────

export default function StreakScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: streak,  loading: sLoading, execute: loadStreak }  = useApi(getStreak);
  const { data: lapData, loading: lLoading, execute: loadLaporan } = useApi(() => getLaporan(1, 90));

  useRefreshOnFocus(useCallback(async () => {
    await Promise.all([loadStreak(), loadLaporan()]);
  }, [loadStreak, loadLaporan]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStreak(), loadLaporan()]).catch(() => {});
    setRefreshing(false);
  }, [loadStreak, loadLaporan]);

  const loading   = sLoading || lLoading;
  const current   = streak?.current  || 0;
  const longest   = streak?.longest  || 0;
  const lastInput = streak?.last_input;
  const calendar  = buildCalendar(lapData?.laporan || []);

  // Motivational message
  const getMessage = () => {
    if (current === 0) return { text: 'Mulai streak hari ini! 💪', color: Colors.textMuted };
    if (current < 3)   return { text: 'Awal yang bagus! Pertahankan 🌱', color: Colors.success };
    if (current < 7)   return { text: 'Konsisten sekali! Terus! 🔥', color: Colors.warning };
    if (current < 14)  return { text: 'Luar biasa! Satu minggu lebih! 🏆', color: Colors.primary };
    return               { text: `${current} hari berturut-turut! Kamu juara! 🥇`, color: Colors.danger };
  };

  const msg = getMessage();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔥 Streak</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.warning} />}
      >
        {loading && !streak ? (
          <ActivityIndicator size="large" color={Colors.warning} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* ── Hero ── */}
            <Card style={styles.heroCard}>
              <View style={styles.flameWrap}>
                <Text style={[styles.flameBig, current === 0 && styles.flameOff]}>🔥</Text>
                <Text style={[styles.streakNum, { color: current > 0 ? Colors.warning : Colors.textMuted }]}>
                  {current}
                </Text>
                <Text style={styles.streakLabel}>hari berturut-turut</Text>
              </View>
              <Text style={[styles.message, { color: msg.color }]}>{msg.text}</Text>
            </Card>

            {/* ── Stats ── */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderTopColor: Colors.warning, borderTopWidth: 3 }]}>
                <Text style={[styles.statVal, { color: Colors.warning }]}>{current}</Text>
                <Text style={styles.statLbl}>Streak Aktif</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: Colors.primary, borderTopWidth: 3 }]}>
                <Text style={[styles.statVal, { color: Colors.primary }]}>{longest}</Text>
                <Text style={styles.statLbl}>Terpanjang</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: Colors.blue, borderTopWidth: 3 }]}>
                <Text style={[styles.statVal, { color: Colors.blue }]} numberOfLines={1}>
                  {lastInput ? formatDate(lastInput, 'short') : '-'}
                </Text>
                <Text style={styles.statLbl}>Input Terakhir</Text>
              </View>
            </View>

            {/* ── Kalender ── */}
            <Card>
              <Text style={styles.calTitle}>📅 Aktivitas 35 Hari Terakhir</Text>

              {/* Weekday headers */}
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map(d => (
                  <Text key={d} style={styles.weekLabel}>{d}</Text>
                ))}
              </View>

              {/* Grid: isi offset kolom pertama sesuai hari pertama */}
              <View style={styles.calGrid}>
                {/* Offset kosong */}
                {Array.from({ length: calendar[0]?.weekday || 0 }).map((_, i) => (
                  <View key={`off_${i}`} style={styles.calCell} />
                ))}
                {/* Hari */}
                {calendar.map(d => (
                  <View
                    key={d.iso}
                    style={[
                      styles.calCell,
                      d.hasLog  && styles.calCellActive,
                      d.isToday && styles.calCellToday,
                    ]}
                  >
                    <Text style={[
                      styles.calDay,
                      d.hasLog  && styles.calDayActive,
                      d.isToday && !d.hasLog && styles.calDayToday,
                    ]}>
                      {d.day}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendText}>Ada laporan</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.borderLight, borderWidth: 1, borderColor: Colors.border }]} />
                  <Text style={styles.legendText}>Tidak ada</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { borderWidth: 2, borderColor: Colors.warning }]} />
                  <Text style={styles.legendText}>Hari ini</Text>
                </View>
              </View>
            </Card>

            {/* ── Tips ── */}
            <Card variant="tinted">
              <Text style={styles.tipsTitle}>💡 Tips Pertahankan Streak</Text>
              {[
                'Buat laporan setiap hari sebelum tidur',
                'Gunakan meal template untuk input cepat',
                'Aktifkan notifikasi pengingat (coming soon)',
                'Streak terhitung dari laporan harian, bukan input saja',
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
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

  heroCard:    { alignItems: 'center', paddingVertical: 28, marginBottom: 14 },
  flameWrap:   { alignItems: 'center', marginBottom: 12 },
  flameBig:    { fontSize: 64, marginBottom: 4 },
  flameOff:    { opacity: 0.25 },
  streakNum:   { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  streakLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600', marginTop: 4 },
  message:     { fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, alignItems: 'center', ...Shadow.xs },
  statVal:  { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  statLbl:  { fontSize: 9, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },

  calTitle:  { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  weekRow:   { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { width: `${100/7}%`, textAlign: 'center', fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  calGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:         { width: `${100/7}%`, aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center' },
  calCellActive:   { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm },
  calCellToday:    { borderWidth: 2, borderColor: Colors.warning, borderRadius: Radius.sm },
  calDay:          { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  calDayActive:    { color: Colors.primary, fontWeight: '800' },
  calDayToday:     { color: Colors.warning, fontWeight: '800' },

  legend:     { flexDirection: 'row', gap: 16, marginTop: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 11, color: Colors.textMuted },

  tipsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  tipRow:    { flexDirection: 'row', gap: 6, marginBottom: 7 },
  tipDot:    { fontSize: 14, color: Colors.primary, marginTop: 1 },
  tipText:   { fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 18 },
});