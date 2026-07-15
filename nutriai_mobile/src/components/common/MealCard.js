import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import { deleteDaily } from '../../services/DailyService';

const MEAL_CONFIG = [
  { label: 'Sarapan', time: '06.00 - 10.00', img: require('../../../assets/pagi.png'),  dot: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Siang',   time: '11.00 - 15.00', img: require('../../../assets/siang.png'), dot: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Sore',    time: '15.00 - 18.00', img: require('../../../assets/sore.png'),  dot: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Malam',   time: '18.00 - 23.00', img: require('../../../assets/malam.png'), dot: '#3B82F6', bg: '#EFF6FF' },
];

// index 0=Pagi,1=Siang,2=Sore,3=Malam sesuai WAKTU_OPTS
const WAKTU_INDEX = { Pagi: 0, Siang: 1, Sore: 2, Malam: 3 };

export default function MealCard({ waktu, items = [], onTambahMakanan, onDeleteEntry }) {
  const config     = MEAL_CONFIG[WAKTU_INDEX[waktu]];
  const totalKal   = items.reduce((s, it) => s + (it.food?.kalori || 0), 0);
  const isEmpty    = items.length === 0;
  const status      = isEmpty ? 'Belum diisi' : 'Tercatat';
  const statusBg    = isEmpty ? '#F1F5F9' : '#ECFDF5';
  const statusColor = isEmpty ? '#94A3B8' : '#16A34A';

  const handleDeleteItem = (item) => {
    Alert.alert('Hapus', `Hapus ${item.food?.nama_makanan}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDaily(item.id);
            onDeleteEntry();
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={[styles.mealCard, { backgroundColor: config.bg }]}>

      {/* ── TOP ROW: image left + content right ── */}
      <View style={styles.mealTopRow}>

        {/* Left: image */}
        <Image source={config.img} style={styles.mealCardImg} resizeMode="cover" />

        {/* Right: content */}
        <View style={styles.mealCardBody}>

          {/* Header */}
          <View style={styles.mealCardHeader}>
            <View style={styles.mealCardTitleRow}>
              <View style={[styles.mealDot, { backgroundColor: config.dot }]} />
              <Text style={styles.mealCardTitle}>{waktu}</Text>
              <Text style={styles.mealCardTime}>{config.time}</Text>
            </View>
            <TouchableOpacity
              style={[styles.mealStatusBadge, { backgroundColor: statusBg }]}
              onPress={() => onTambahMakanan(waktu)}
              activeOpacity={0.7}
            >
              <Text style={[styles.mealStatusText, { color: statusColor }]}>{status}</Text>
              <Text style={[styles.mealStatusChev, { color: statusColor }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Kalori summary / empty label */}
          {!isEmpty ? (
            <Text style={styles.mealKaloriSum}>
              {items.length} makanan · <Text style={{ color: config.dot, fontWeight: '700' }}>{totalKal} kkal</Text>
            </Text>
          ) : (
            <Text style={styles.mealEmpty}>Belum ada makanan</Text>
          )}

          {/* Food item rows */}
          {items.map((item, idx) => (
            <View key={item.id || idx} style={styles.mealFoodRow}>
              <View style={styles.mealFoodThumb}>
                {item.food?.image
                  ? <Image source={{ uri: item.food.image }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                  : <Text style={{ fontSize: 18 }}>🍽</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealFoodName} numberOfLines={1}>{item.food?.nama_makanan}</Text>
                <Text style={styles.mealFoodPorsi}>{item.food?.porsi || 1} porsi</Text>
              </View>
              <Text style={styles.mealFoodKal}>{item.food?.kalori} kkal</Text>
              <TouchableOpacity style={styles.mealFoodMenu} onPress={() => handleDeleteItem(item)}>
                <Text style={styles.mealFoodMenuDot}>⋮</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* + Tambah Makanan — di dalam kolom kanan */}
          <TouchableOpacity
            style={styles.mealAddBtn}
            onPress={() => onTambahMakanan(waktu)}
            activeOpacity={0.7}
          >
            <Text style={styles.mealAddBtnText}>+ Tambah Makanan</Text>
          </TouchableOpacity>

        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  mealCard: {
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  mealTopRow:      { flexDirection: 'row' },
  mealCardImg:     { width: 90, height: '100%', minHeight: 80 },
  mealCardBody:    { flex: 1, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 10 },
  mealCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  mealCardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, flexWrap: 'wrap' },
  mealDot:         { width: 7, height: 7, borderRadius: 4 },
  mealCardTitle:   { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  mealCardTime:    { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  mealStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  mealStatusText:  { fontSize: 11, fontWeight: '700' },
  mealStatusChev:  { fontSize: 14, fontWeight: '700' },

  mealKaloriSum: { fontSize: 12, color: '#64748B', marginBottom: 6, marginTop: 1 },
  mealEmpty:     { fontSize: 11, color: '#94A3B8', marginBottom: 4, marginTop: 1, fontStyle: 'italic' },

  mealFoodRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  mealFoodThumb:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mealFoodName:   { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  mealFoodPorsi:  { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  mealFoodKal:    { fontSize: 12, fontWeight: '600', color: '#64748B' },
  mealFoodMenu:   { padding: 6 },
  mealFoodMenuDot:{ fontSize: 18, color: '#94A3B8', lineHeight: 20 },

  mealAddBtn:     { marginTop: 5, marginBottom: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.3)', borderStyle: 'dashed', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.45)' },
  mealAddBtnText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },
});