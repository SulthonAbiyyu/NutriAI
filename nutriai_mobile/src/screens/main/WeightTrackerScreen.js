import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWeight, addWeight } from '../../services/WeightService';
import { useRefreshOnFocus }   from '../../hooks/useRefreshOnFocus';
import { useApi }              from '../../hooks/useApi';
import Card                    from '../../components/common/Card';
import LineChart               from '../../components/common/LineChart';
import Input                   from '../../components/common/Input';
import Button                  from '../../components/common/Button';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { formatDate } from '../../utils';

const W = Dimensions.get('window').width - 32 - 32; // screen - padding - card padding

function MiniChart({ data }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.bb);
  const min  = Math.min(...vals) - 1;
  const max  = Math.max(...vals) + 1;
  const range = max - min || 1;
  const H = 80, points = data.slice(0, 14).reverse();

  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => H - ((v - min) / range) * H;

  const path = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.bb)}`).join(' ');

  return (
    <View style={{ height: H + 24, marginTop: 8 }}>
      <View style={{ position: 'relative', height: H }}>
        {/* SVG via react-native-svg would be ideal, but we use simple dots + lines workaround */}
        {points.map((d, i) => (
          <View key={i} style={[styles.chartDot, {
            left: x(i) - 4,
            top:  y(d.bb) - 4,
            backgroundColor: i === points.length - 1 ? Colors.primary : Colors.primaryMuted,
          }]} />
        ))}
        {/* Horizontal guideline */}
        {[min + range * 0.25, min + range * 0.5, min + range * 0.75].map((v, i) => (
          <View key={i} style={[styles.chartLine, { top: y(v) }]} />
        ))}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{points[0]?.tanggal ? formatDate(points[0].tanggal, 'short') : ''}</Text>
        <Text style={styles.chartLabel}>{points[points.length - 1]?.tanggal ? formatDate(points[points.length - 1].tanggal, 'short') : ''}</Text>
      </View>
    </View>
  );
}

export default function WeightTrackerScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput]           = useState('');
  const [catatan, setCatatan]       = useState('');
  const [saving, setSaving]         = useState(false);
  const { data, loading, execute }  = useApi(getWeight);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleSave = async () => {
    const bb = parseFloat(input);
    if (isNaN(bb) || bb < 30 || bb > 300) {
      return Alert.alert('Input Salah', 'Masukkan berat antara 30–300 kg');
    }
    setSaving(true);
    try {
      await addWeight(bb, catatan);
      setInput('');
      setCatatan('');
      await execute();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const current  = data?.current  || 0;
  const initial  = data?.initial  || 0;
  const change   = data?.change   || 0;
  const records  = data?.data     || [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚖️ Weight Tracker</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Stats */}
        {data && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderTopColor: Colors.primary, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { color: Colors.primary }]}>{current} kg</Text>
              <Text style={styles.statLbl}>Sekarang</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: Colors.textMuted, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { color: Colors.textSecondary }]}>{initial} kg</Text>
              <Text style={styles.statLbl}>Awal</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: change >= 0 ? Colors.success : Colors.danger, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { color: change >= 0 ? Colors.success : Colors.danger }]}>
                {change >= 0 ? '+' : ''}{change} kg
              </Text>
              <Text style={styles.statLbl}>Perubahan</Text>
            </View>
          </View>
        )}

        {/* Chart placeholder */}
        {records.length > 1 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Grafik Berat (14 hari terakhir)</Text>
            <LineChart
              data={(records || []).slice(0, 14).reverse().map(d => ({
                label: d.tanggal ? d.tanggal.slice(5) : '',
                value: parseFloat(d.berat || d.bb) || 0,
              }))}
              color={Colors.primary}
              height={120}
              unit="kg"
            />
          </Card>
        )}

        {/* Input */}
        <Card>
          <Text style={styles.sectionTitle}>➕ Input Berat Hari Ini</Text>
          <Input
            placeholder="Contoh: 65.5"
            value={input}
            onChangeText={setInput}
            keyboardType="decimal-pad"
            style={{ marginBottom: 10 }}
          />
          <Input
            placeholder="Catatan (opsional)"
            value={catatan}
            onChangeText={setCatatan}
          />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Berat'}
            onPress={handleSave}
            disabled={saving || !input}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* History */}
        <Card>
          <Text style={styles.sectionTitle}>📅 Riwayat</Text>
          {loading && !data ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : records.length === 0 ? (
            <Text style={styles.empty}>Belum ada data berat</Text>
          ) : (
            records.slice(0, 20).map((r, i) => (
              <View key={r.id || i} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyDate}>{formatDate(r.tanggal)}</Text>
                  {r.catatan ? <Text style={styles.historyCatatan}>{r.catatan}</Text> : null}
                </View>
                <Text style={styles.historyBb}>{r.bb} kg</Text>
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

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, alignItems: 'center', ...Shadow.xs },
  statVal:  { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  statLbl:  { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },

  chartCard:  { marginBottom: 14 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  chartDot:   { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  chartLine:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.borderLight },
  chartLabels:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 10, color: Colors.textMuted },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  empty:        { color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  historyRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  historyDate:    { fontSize: 13, color: Colors.text, fontWeight: '600' },
  historyCatatan: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyBb:      { fontSize: 15, fontWeight: '800', color: Colors.primary },
});