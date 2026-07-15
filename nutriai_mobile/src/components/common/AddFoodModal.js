import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Easing, Image,
} from 'react-native';
import { getFoods }    from '../../services/FoodService';
import { submitDaily } from '../../services/DailyService';
import { Colors, Radius } from '../../theme';

// ── Neumorphism tokens ────────────────────────────────────────────────────────
const NM_BASE  = '#ECF0F3';
const NM_LIGHT = '#FFFFFF';
const NM_DARK  = '#C8CDD5';

const nm = (elevation = 4, inset = false) => {
  const h = inset ? -elevation : elevation;
  return Platform.select({
    ios: {
      shadowColor: NM_DARK,
      shadowOffset: { width: h, height: h },
      shadowOpacity: 0.9,
      shadowRadius: elevation * 1.5,
    },
    android: { elevation: inset ? 0 : elevation },
  });
};


// ── Meal meta ─────────────────────────────────────────────────────────────────
const MEAL_META = {
  Pagi:  { emoji: '🌅', color: '#F59E0B', time: '06.00 - 10.00' },
  Siang: { emoji: '☀️',  color: '#F59E0B', time: '11.00 - 15.00' },
  Sore:  { emoji: '🌇', color: '#8B5CF6', time: '15.00 - 18.00' },
  Malam: { emoji: '🌙', color: '#3B82F6', time: '18.00 - 23.00' },
};

// ── Cart Item Row (neumorphism) ────────────────────────────────────────────────
function CartRow({ item, onRemove, onChangePorsi }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const kal  = Math.round((item.base_kalori  || item.kalori)  * item.porsi);
  const prot = Math.round((item.base_protein || item.protein) * item.porsi);

  return (
    <Animated.View style={[styles.cartRow, nm(4), { transform: [{ scale: scaleAnim }] }]}>
      <Image
        source={item.image ? { uri: item.image } : null}
        style={styles.cartRowImg}
        resizeMode="cover"
      />
      <View style={styles.cartRowInfo}>
        <Text style={styles.cartRowName} numberOfLines={1}>{item.nama_makanan}</Text>
        <Text style={styles.cartRowMacro}>{prot}g protein · {kal} kcal</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepBtn, nm(3)]}
            onPress={() => { bounce(); onChangePorsi(item._uid, Math.max(0.5, item.porsi - 0.5)); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepLabel}>−</Text>
          </TouchableOpacity>
          <View style={[styles.stepDisplay, nm(3, true)]}>
            <Text style={styles.stepValue}>{item.porsi}×</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepBtn, nm(3)]}
            onPress={() => { bounce(); onChangePorsi(item._uid, item.porsi + 0.5); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepLabel}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.removeBtn, nm(3)]}
        onPress={() => onRemove(item._uid)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddFoodModal({ visible, waktu, onClose, onSuccess }) {
  const [search,       setSearch]       = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [cart,         setCart]         = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const searchTimer                     = useRef(null);
  const scaleAnim                       = useRef(new Animated.Value(0.9)).current;
  const opacityAnim                     = useRef(new Animated.Value(0)).current;

  const meta = MEAL_META[waktu] || MEAL_META.Pagi;

  // Animasi masuk/keluar
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, friction: 10, tension: 60 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.9, duration: 180, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Search debounced
  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResult([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getFoods(text, 1, 15);
        setSearchResult(res.data || []);
      } catch { setSearchResult([]); }
      finally  { setSearching(false); }
    }, 400);
  };

  // Cart logic
  const addToCart = (food) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === food.id);
      if (exists) return prev.map(c => c.id === food.id ? { ...c, porsi: Math.min(10, c.porsi + 1) } : c);
      return [...prev, {
        ...food,
        _uid:         `${food.id}_${Math.random().toString(36).slice(2)}`,
        porsi:        1,
        base_protein: food.protein,
        base_kalori:  food.kalori,
      }];
    });
    setSearch('');
    setSearchResult([]);
  };

  const removeFromCart = (uid) => setCart(prev => prev.filter(c => c._uid !== uid));
  const changePorsi    = (uid, v) => setCart(prev => prev.map(c => c._uid === uid ? { ...c, porsi: v } : c));

  const cartTotal = cart.reduce((acc, c) => ({
    kalori:  acc.kalori  + (c.base_kalori  || c.kalori)  * c.porsi,
    protein: acc.protein + (c.base_protein || c.protein) * c.porsi,
  }), { kalori: 0, protein: 0 });

  // Submit
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
      handleClose();
      onSuccess();
      Alert.alert('✅ Berhasil', `${cart.length} makanan ditambahkan ke ${waktu}`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCart([]);
    setSearch('');
    setSearchResult([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      {/* Overlay — tap luar untuk tutup */}
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        {/* Modal card — tengah layar */}
        <Animated.View style={[styles.modalCard, nm(16), { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

            {/* Handle dekoratif */}
            <View style={[styles.handle, nm(2, true)]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerEmoji}>{meta.emoji}</Text>
                <View>
                  <Text style={[styles.headerTitle, { color: meta.color }]}>Tambah Makanan</Text>
                  <Text style={styles.headerSub}>{waktu} · {meta.time}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, nm(4)]}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={[styles.searchBox, nm(3, true)]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari makanan, brand, atau menu..."
                placeholderTextColor={Colors.textMuted || '#9AAABB'}
                value={search}
                onChangeText={handleSearch}
                autoFocus
              />
              {search ? (
                <TouchableOpacity onPress={() => { setSearch(''); setSearchResult([]); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: Colors.textMuted || '#9AAABB', fontSize: 15 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Body scroll */}
            <ScrollView
              style={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Loading */}
              {searching && (
                <ActivityIndicator size="small" color={Colors.primary || '#5A8DF5'} style={{ marginVertical: 16 }} />
              )}

              {/* Hasil pencarian */}
              {!searching && searchResult.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.sectionLabel}>Hasil Pencarian</Text>
                  {searchResult.map(food => (
                    <TouchableOpacity
                      key={food.id}
                      style={[styles.resultRow, nm(3)]}
                      onPress={() => addToCart(food)}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={food.image ? { uri: food.image } : null}
                        style={styles.resultThumb}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{food.nama_makanan}</Text>
                        <Text style={styles.resultMacro}>{food.protein}g protein · {food.kalori} kcal</Text>
                      </View>
                      <View style={[styles.addBtn, nm(3)]}>
                        <Text style={{ color: meta.color, fontWeight: '800', fontSize: 18, lineHeight: 20 }}>+</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {search.length > 2 && !searching && searchResult.length === 0 && (
                <Text style={styles.noResult}>Makanan tidak ditemukan 😕</Text>
              )}

              {/* Keranjang */}
              {cart.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <View style={styles.cartHeader}>
                    <Text style={styles.sectionLabel}>Keranjang ({cart.length})</Text>
                    <Text style={[styles.cartTotal, { color: meta.color }]}>
                      {Math.round(cartTotal.protein)}g · {Math.round(cartTotal.kalori)} kcal
                    </Text>
                  </View>
                  {cart.map(item => (
                    <CartRow
                      key={item._uid}
                      item={item}
                      onRemove={removeFromCart}
                      onChangePorsi={changePorsi}
                    />
                  ))}
                </View>
              )}

              {/* Empty state */}
              {cart.length === 0 && search.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🍽️</Text>
                  <Text style={styles.emptyText}>Cari makanan di atas</Text>
                  <Text style={styles.emptyHint}>Ketik nama makanan untuk mulai menambahkan</Text>
                </View>
              )}
            </ScrollView>

            {/* Tombol simpan */}
            {cart.length > 0 && (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: meta.color }, nm(6), submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Simpan ke {waktu} ({cart.length} item)</Text>
                }
              </TouchableOpacity>
            )}

          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Overlay full screen — tengah
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,28,40,0.55)',
    justifyContent: 'center',       // ← TENGAH vertikal
    alignItems: 'center',           // ← TENGAH horizontal
    paddingHorizontal: 20,
  },

  // Modal card
  modalCard: {
    width: '100%',
    backgroundColor: NM_BASE,
    borderRadius: 28,               // ← semua sudut rounded, bukan hanya atas
    padding: 20,
    paddingTop: 14,
    maxHeight: '88%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
      },
      android: { elevation: 24 },
    }),
  },

  handle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: NM_DARK,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub:   { fontSize: 11, color: Colors.textMuted || '#9AAABB', marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: Colors.textMuted || '#9AAABB', fontWeight: '700' },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NM_BASE,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text || '#2D3A4A' },

  // Body
  body: { maxHeight: 380 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '800',
    color: Colors.textMuted || '#9AAABB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Result rows
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NM_BASE,
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  resultThumb: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: NM_DARK,
  },
  resultName:  { fontSize: 13, fontWeight: '700', color: Colors.text || '#2D3A4A' },
  resultMacro: { fontSize: 11, color: Colors.textMuted || '#9AAABB', marginTop: 2 },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  noResult: { textAlign: 'center', color: Colors.textMuted || '#9AAABB', fontSize: 13, paddingVertical: 24 },

  // Cart
  cartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  cartTotal: { fontSize: 12, fontWeight: '700' },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NM_BASE,
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  cartRowImg: { width: 52, height: 52, borderRadius: 12, backgroundColor: NM_DARK },
  cartRowInfo: { flex: 1, gap: 2 },
  cartRowName: { fontSize: 13, fontWeight: '700', color: Colors.text || '#2D3A4A' },
  cartRowMacro: { fontSize: 11, color: Colors.textMuted || '#9AAABB' },

  stepperRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  stepBtn: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontSize: 15, fontWeight: '700', color: Colors.primary || '#5A8DF5', lineHeight: 17 },
  stepDisplay: {
    width: 38, height: 26, borderRadius: 7,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { fontSize: 12, fontWeight: '700', color: Colors.text || '#2D3A4A' },

  removeBtn: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: '#E06060', fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyText:  { fontSize: 14, fontWeight: '700', color: Colors.text || '#2D3A4A', marginBottom: 4 },
  emptyHint:  { fontSize: 12, color: Colors.textMuted || '#9AAABB', textAlign: 'center' },

  // Submit button
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
});