/**
 * InputMakananScreen.js
 *
 * Fitur:
 * - Porsi selector per item
 * - 📷 AI Image Analysis: foto makanan → estimasi nutrisi otomatis
 * - Keranjang + submit ke daily log
 * - List makanan hari ini per waktu + delete
 * - Terakhir ditambahkan: quick-add, porsi langsung, empty state
 * - Progress kalori & protein realtime
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDaily, submitDaily } from '../../services/DailyService';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useApi }            from '../../hooks/useApi';
import { Colors, Spacing, Radius } from '../../theme';
import { ROUTES } from '../../constants';

import MealCard        from '../../components/common/MealCard';
import RecentFoods     from '../../components/common/RecentFoods';
import CartSection     from '../../components/common/CartSection';
import FabMenu         from '../../components/common/FabMenu';
import AiAnalyzeModal  from '../../components/common/AiAnalyzeModal';
import AddFoodModal    from '../../components/common/AddFoodModal';

const WAKTU_OPTS = ['Pagi', 'Siang', 'Sore', 'Malam'];
const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

export default function InputMakananScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [waktu,        setWaktu]        = useState('Pagi');
  const [cart,         setCart]         = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [showAI,       setShowAI]       = useState(false);
  const [addModal,     setAddModal]     = useState({ visible: false, waktu: 'Pagi' });

  const today = new Date();

  const { data: dailyData, execute: refreshDaily } = useApi(getDaily);
  useRefreshOnFocus(refreshDaily);

  // ── Recent foods: deduplicated, max 10, sorted by last used ──
  const recentFoods = useMemo(() => {
    const all = dailyData?.recent_foods || [];
    const seen = new Set();
    return all
      .filter(f => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      })
      .slice(0, 10);
  }, [dailyData?.recent_foods]);

  // ── Cart ─────────────────────────────────────────────
  const addToCart = (food) => {
    const exists = cart.find(c => c.id === food.id && !food.fromAI);
    if (exists) {
      setCart(prev => prev.map(c => c.id === food.id ? { ...c, porsi: Math.min(10, c.porsi + 1) } : c));
    } else {
      setCart(prev => [...prev, {
        ...food,
        _uid:         `${food.id || Date.now()}_${Math.random().toString(36).slice(2)}`,
        porsi:        1,
        base_protein: food.protein,
        base_kalori:  food.kalori,
      }]);
    }

  };

  const removeFromCart = (uid) => setCart(prev => prev.filter(c => c._uid !== uid));
  const changePorsi    = (uid, v) => setCart(prev => prev.map(c => c._uid === uid ? { ...c, porsi: v } : c));

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) return Alert.alert('Keranjang Kosong', 'Pilih makanan terlebih dahulu');
    setSubmitting(true);
    try {
      const payload = cart.map(item => ({
        nama_makanan: item.nama_makanan,
        porsi:        item.porsi,
        protein:      (item.base_protein || item.protein) * item.porsi,
        kalori:       (item.base_kalori  || item.kalori)  * item.porsi,
        karbo:        (item.karbo  || 0) * item.porsi,
        lemak:        (item.lemak  || 0) * item.porsi,
        waktu_makan:  waktu,
        image:        item.image || '',
      }));
      await submitDaily(payload);
      setCart([]);
      await refreshDaily();
      Alert.alert('✅ Berhasil', `${cart.length} item ditambahkan ke ${waktu}`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteEntry = useCallback(() => refreshDaily(), [refreshDaily]);
  const openAddModal  = (waktu) => setAddModal({ visible: true, waktu });
  const grouped = dailyData?.grouped || {};

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Input Makanan</Text>
            <Text style={styles.titleSpark}>✦</Text>
          </View>
          <Text style={styles.subtitle}>Buat setiap makananmu bermakna 💚</Text>
        </View>
        <TouchableOpacity style={styles.dateBadge} activeOpacity={0.7}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{today.getDate()} {BULAN[today.getMonth()]} {today.getFullYear()}</Text>
          <Text style={styles.dateChev}>⌄</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
        >
          {/* ── Meal Cards ── */}
          {WAKTU_OPTS.map(w => (
            <MealCard
              key={w}
              waktu={w}
              items={grouped[w] || []}
              onTambahMakanan={openAddModal}
              onDeleteEntry={onDeleteEntry}
            />
          ))}

          {/* ── Terakhir Ditambahkan ── */}
          <RecentFoods
            recentFoods={recentFoods}
            onAddToCart={addToCart}
            emptyMessage="Belum ada makanan yang pernah ditambahkan. Mulai dengan scan atau AI! 🥗"
          />

          {/* ── Cart ── */}
          <CartSection
            cart={cart}
            waktu={waktu}
            submitting={submitting}
            onRemove={removeFromCart}
            onChangePorsi={changePorsi}
            onSubmit={handleSubmit}
          />

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FAB ── */}
      <FabMenu
        bottomOffset={insets.bottom + 100}
        onScan={() => navigation.navigate(ROUTES.BARCODE_SCANNER)}
        onAI={() => setShowAI(true)}
        onTambahData={() => navigation.navigate('TambahData')}
      />

      {/* ── AI Modal ── */}
      <AiAnalyzeModal
        visible={showAI}
        onClose={() => setShowAI(false)}
        onAdd={addToCart}
      />

      {/* ── Add Food Modal ── */}
      <AddFoodModal
        visible={addModal.visible}
        waktu={addModal.waktu}
        onClose={() => setAddModal(prev => ({ ...prev, visible: false }))}
        onSuccess={refreshDaily}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  topBar:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: 16, paddingBottom: 14,
  },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { fontSize: 22, fontWeight: '800', color: Colors.text },
  titleSpark: { fontSize: 18, color: Colors.primary },
  subtitle:   { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.bg, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  dateIcon: { fontSize: 13 },
  dateText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  dateChev: { fontSize: 14, color: Colors.textMuted, marginTop: -2 },

  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
});