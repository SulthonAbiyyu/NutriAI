/**
 * TambahDataScreen.js
 *
 * ALL-IN-ONE: Daftar makanan + Tambah + Edit + Hapus
 * - List semua makanan database dengan foto, search, infinite scroll
 * - Tombol + di kanan atas → form tambah (modal)
 * - Tap ⋯ di tiap item → pilih Edit atau Hapus
 * - Modal edit lengkap dengan ganti foto
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl,
  Alert, Animated, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker      from 'expo-image-picker';
import { getFoods, addFood, updateFood, deleteFood } from '../../services/FoodService';
import Input  from '../../components/common/Input';
import { Colors, Spacing, Radius } from '../../theme';

// ── Neumorphism ───────────────────────────────────────────────────────────────
const NM_BASE = '#ECF0F3';
const NM_DARK = '#C8CDD5';

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

const EMPTY_FORM = {
  nama_makanan: '', protein: '', kalori: '',
  karbo: '', lemak: '', serat: '', gram_per_porsi: '100',
};

// ─────────────────────────────────────────────────────────────────────────────
//  KOMPONEN: FoodCard
// ─────────────────────────────────────────────────────────────────────────────
function FoodCard({ item, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toVal = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnim, { toValue: toVal, useNativeDriver: true, friction: 8, tension: 80 }).start();
  };

  const menuScale   = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const menuOpacity = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.cardWrap}>
      <View style={[styles.card, nm(4)]}>
        {/* Thumbnail */}
        <View style={[styles.thumbWrap, nm(3)]}>
          {item.image
            ? <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
            : <View style={styles.thumbEmpty}><Text style={styles.thumbEmoji}>🍽️</Text></View>
          }
          {!item.image && (
            <View style={styles.noImgDot}>
              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '900' }}>!</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.nama_makanan}</Text>
          <Text style={styles.cardMacro}>
            P: {item.protein}g · {item.kalori} kcal · {item.gram_per_porsi}g/porsi
          </Text>
          <View style={styles.tagRow}>
            {item.karbo > 0 && <Text style={styles.tag}>K {item.karbo}g</Text>}
            {item.lemak > 0 && <Text style={styles.tag}>L {item.lemak}g</Text>}
            {!item.image && <Text style={[styles.tag, { color: '#F59E0B', backgroundColor: '#FEF3C7' }]}>No foto</Text>}
          </View>
        </View>

        {/* Tombol ⋯ */}
        <TouchableOpacity
          style={[styles.moreBtn, nm(3), menuOpen && { backgroundColor: Colors.primary + '22' }]}
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.moreBtnText, menuOpen && { color: Colors.primary || '#5A8DF5' }]}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Popup menu */}
      {menuOpen && (
        <Animated.View style={[
          styles.popupMenu, nm(6),
          { transform: [{ scale: menuScale }], opacity: menuOpacity },
        ]}>
          <TouchableOpacity
            style={styles.popupItem}
            onPress={() => { setMenuOpen(false); onEdit(item); }}
            activeOpacity={0.75}
          >
            <Text style={styles.popupItemIcon}>✏️</Text>
            <Text style={styles.popupItemText}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.popupDivider} />
          <TouchableOpacity
            style={styles.popupItem}
            onPress={() => { setMenuOpen(false); onDelete(item); }}
            activeOpacity={0.75}
          >
            <Text style={styles.popupItemIcon}>🗑️</Text>
            <Text style={[styles.popupItemText, { color: '#E06060' }]}>Hapus</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  KOMPONEN: FormModal (Tambah & Edit jadi satu)
// ─────────────────────────────────────────────────────────────────────────────
function FormModal({ visible, mode, initialData, onClose, onSaved }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [image,  setImage]  = useState(null);
  const [saving, setSaving] = useState(false);

  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        setForm({
          nama_makanan:   initialData.nama_makanan   || '',
          protein:        String(initialData.protein        ?? ''),
          kalori:         String(initialData.kalori         ?? ''),
          karbo:          String(initialData.karbo          ?? '0'),
          lemak:          String(initialData.lemak          ?? '0'),
          serat:          String(initialData.serat          ?? '0'),
          gram_per_porsi: String(initialData.gram_per_porsi ?? '100'),
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setImage(null);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,   useNativeDriver: true, friction: 10, tension: 60 }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.92, duration: 180, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, mode, initialData]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi perlu izin untuk mengakses galeri foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() || 'jpg';
      setImage({ uri: asset.uri, name: `food_${Date.now()}.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    }
  };

  const handleSave = async () => {
    if (!form.nama_makanan.trim()) return Alert.alert('Error', 'Nama makanan wajib diisi');
    if (!form.kalori || parseInt(form.kalori) <= 0) return Alert.alert('Error', 'Kalori harus lebih dari 0');
    if (form.protein === '' || parseInt(form.protein) < 0) return Alert.alert('Error', 'Protein tidak boleh negatif');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nama_makanan',   form.nama_makanan.trim());
      fd.append('protein',        form.protein        || '0');
      fd.append('kalori',         form.kalori         || '0');
      fd.append('karbo',          form.karbo          || '0');
      fd.append('lemak',          form.lemak          || '0');
      fd.append('serat',          form.serat          || '0');
      fd.append('gram_per_porsi', form.gram_per_porsi || '100');
      if (image) {
        fd.append('food_image', { uri: image.uri, name: image.name, type: image.type });
      }
      if (mode === 'tambah') await addFood(fd);
      else await updateFood(initialData.id, fd);

      onSaved();
      onClose();
    } catch (e) {
      const errMsg =
        e?.response?.data?.error    ||   // { error: '...' }  — POST /api/foods
        e?.response?.data?.message  ||   // { message: '...' } — confirm-tambah-data 409
        'Gagal menyimpan';
      Alert.alert('Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const displayImage = image?.uri || (mode === 'edit' ? initialData?.image : null);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[
          styles.modalCard, nm(16),
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.handle, nm(2, true)]} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'tambah' ? '➕ Tambah Makanan' : '✏️ Edit Makanan'}
              </Text>
              <TouchableOpacity style={[styles.closeBtn, nm(3)]} onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>

              {/* ── Foto ── */}
              <Text style={styles.label}>Foto Makanan</Text>
              <View style={styles.imageRow}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                  <View style={[styles.imagePreviewBox, nm(4)]}>
                    {displayImage
                      ? <Image source={{ uri: displayImage }} style={styles.imagePreview} resizeMode="cover" />
                      : <View style={styles.imagePlaceholder}>
                          <Text style={{ fontSize: 26 }}>📷</Text>
                          <Text style={styles.imagePlaceholderText}>Pilih Foto</Text>
                        </View>
                    }
                  </View>
                </TouchableOpacity>

                <View style={styles.imageInfo}>
                  <TouchableOpacity style={[styles.imagePickBtn, nm(3)]} onPress={pickImage} activeOpacity={0.75}>
                    <Text style={styles.imagePickBtnText}>
                      {displayImage ? '🔄  Ganti Foto' : '📷  Pilih dari Galeri'}
                    </Text>
                  </TouchableOpacity>
                  {image && (
                    <>
                      <TouchableOpacity
                        style={[styles.imagePickBtn, { borderColor: '#E0606033', borderWidth: 1 }, nm(3)]}
                        onPress={() => setImage(null)} activeOpacity={0.75}
                      >
                        <Text style={[styles.imagePickBtnText, { color: '#E06060' }]}>✕  Batalkan</Text>
                      </TouchableOpacity>
                      <Text style={styles.imageNewBadge}>✦ Foto baru siap diupload</Text>
                    </>
                  )}
                  {!displayImage && <Text style={styles.imageHint}>Opsional · JPG / PNG</Text>}
                </View>
              </View>

              {/* ── Nama ── */}
              <Text style={styles.label}>Nama Makanan *</Text>
              <View style={[styles.inputWrap, nm(3, true)]}>
                <Input placeholder="Contoh: Nasi goreng (150g)" value={form.nama_makanan}
                  onChangeText={v => setField('nama_makanan', v)} style={styles.inputFlat} />
              </View>

              {/* ── Protein & Kalori ── */}
              <View style={styles.row2}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Protein (g) *</Text>
                  <View style={[styles.inputWrap, nm(3, true)]}>
                    <Input placeholder="0" value={form.protein} onChangeText={v => setField('protein', v)} keyboardType="numeric" style={styles.inputFlat} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Kalori (kcal) *</Text>
                  <View style={[styles.inputWrap, nm(3, true)]}>
                    <Input placeholder="0" value={form.kalori} onChangeText={v => setField('kalori', v)} keyboardType="numeric" style={styles.inputFlat} />
                  </View>
                </View>
              </View>

              {/* ── Karbo & Lemak ── */}
              <View style={styles.row2}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Karbo (g)</Text>
                  <View style={[styles.inputWrap, nm(3, true)]}>
                    <Input placeholder="0" value={form.karbo} onChangeText={v => setField('karbo', v)} keyboardType="numeric" style={styles.inputFlat} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Lemak (g)</Text>
                  <View style={[styles.inputWrap, nm(3, true)]}>
                    <Input placeholder="0" value={form.lemak} onChangeText={v => setField('lemak', v)} keyboardType="numeric" style={styles.inputFlat} />
                  </View>
                </View>
              </View>

              {/* ── Gram per Porsi ── */}
              <Text style={styles.label}>Gram per Porsi</Text>
              <View style={[styles.inputWrap, nm(3, true)]}>
                <Input placeholder="100" value={form.gram_per_porsi} onChangeText={v => setField('gram_per_porsi', v)} keyboardType="numeric" style={styles.inputFlat} />
              </View>

              {/* ── Serat ── */}
              <Text style={styles.label}>Serat (g)</Text>
              <View style={[styles.inputWrap, nm(3, true)]}>
                <Input placeholder="0" value={form.serat} onChangeText={v => setField('serat', v)} keyboardType="numeric" style={styles.inputFlat} />
              </View>

              <View style={styles.formTip}>
                <Text style={styles.formTipText}>💡 Isi nilai nutrisi per <Text style={{ fontWeight: '900' }}>100g</Text> makanan. Gram per porsi diisi seberapa berat 1 sajian wajarnya.</Text>
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving} activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>
                    {mode === 'tambah' ? 'Simpan ke Database' : 'Simpan Perubahan'}
                  </Text>
              }
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function TambahDataScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [foods,       setFoods]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);   // total item di DB, bukan hanya loaded
  const [noImgTotal,  setNoImgTotal]  = useState(0);   // noImageCount dari seluruh DB
  const [formModal,   setFormModal]   = useState({ visible: false, mode: 'tambah', data: null });

  const searchTimer = useRef(null);
  const LIMIT = 20;

  const fetchFoods = useCallback(async (q = '', p = 1, append = false) => {
    if (p > 1) setLoadingMore(true);
    else if (!append) setLoading(true);
    try {
      const res      = await getFoods(q, p, LIMIT);
      const newFoods = res.data || [];
      setFoods(prev => append ? [...prev, ...newFoods] : newFoods);
      setTotalPages(res.total_pages || 1);
      setPage(p);
      // Simpan total dari backend (bukan hanya foods.length yang ter-load)
      if (!append) {
        setTotalCount(res.total || 0);
        // Hitung no-image hanya di page pertama tanpa search (representatif)
        if (!q && p === 1) setNoImgTotal(newFoods.filter(f => !f.image).length);
      }
    } catch {
      Alert.alert('Error', 'Gagal memuat data makanan');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFoods('', 1); }, []);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchFoods(text, 1), 400);
  };

  const handleEndReached = () => {
    if (!loadingMore && page < totalPages) fetchFoods(search, page + 1, true);
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Hapus Makanan',
      `Yakin hapus "${item.nama_makanan}"?\nData tidak bisa dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try {
              await deleteFood(item.id);
              setFoods(prev => prev.filter(f => f.id !== item.id));
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Gagal menghapus');
            }
          },
        },
      ]
    );
  };

  // noImageCount dihitung dari noImgTotal (dari DB), bukan hanya loaded items

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Database Makanan</Text>
          {!loading && <Text style={styles.headerSub}>{totalCount} item di database</Text>}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, nm(4)]}
          onPress={() => setFormModal({ visible: true, mode: 'tambah', data: null })}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, nm(3, true)]}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama makanan..."
            placeholderTextColor={Colors.textMuted || '#9AAABB'}
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchFoods('', 1); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: Colors.textMuted || '#9AAABB', fontSize: 15 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data makanan...</Text>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <FoodCard
              item={item}
              onEdit={food => setFormModal({ visible: true, mode: 'edit', data: food })}
              onDelete={handleDelete}
            />
          )}
          ListHeaderComponent={() => noImgTotal > 0 ? (
            <View style={[styles.warnBanner, nm(3)]}>
              <Text style={styles.warnText}>
                ⚠️  {noImgTotal} makanan belum punya foto — tap <Text style={{ fontWeight: '900' }}>⋯</Text> lalu <Text style={{ fontWeight: '900' }}>Edit</Text>
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>{search ? '🔍' : '🥗'}</Text>
              <Text style={styles.emptyTitle}>{search ? `"${search}" tidak ditemukan` : 'Belum ada data makanan'}</Text>
              <Text style={styles.emptyDesc}>{search ? 'Coba kata kunci lain' : 'Tap tombol + di kanan atas untuk menambahkan'}</Text>
            </View>
          )}
          ListFooterComponent={() => loadingMore
            ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            : null
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchFoods(search, 1); }}
              colors={[Colors.primary]} tintColor={Colors.primary}
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Form Modal ── */}
      <FormModal
        visible={formModal.visible}
        mode={formModal.mode}
        initialData={formModal.data}
        onClose={() => setFormModal(prev => ({ ...prev, visible: false }))}
        onSaved={() => fetchFoods(search, 1)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NM_BASE },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md || 16, paddingBottom: 12, paddingTop: 8,
    backgroundColor: NM_BASE, borderBottomWidth: 1, borderBottomColor: NM_DARK,
  },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backArrow:    { fontSize: 22, color: Colors.text || '#2D3A4A' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text || '#2D3A4A' },
  headerSub:    { fontSize: 11, color: Colors.textMuted || '#9AAABB', marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.primary || '#5A8DF5',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, color: '#fff', fontWeight: '300', lineHeight: 26, includeFontPadding: false },

  searchWrap: { paddingHorizontal: Spacing.md || 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NM_BASE, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text || '#2D3A4A' },

  listContent: { paddingHorizontal: Spacing.md || 16, paddingTop: 4 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textMuted || '#9AAABB' },

  warnBanner: {
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warnText: { fontSize: 12, color: '#92400E', lineHeight: 18, fontWeight: '600' },

  cardWrap: { marginBottom: 10, position: 'relative' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NM_BASE, borderRadius: 18, padding: 12, gap: 12,
  },
  thumbWrap: {
    width: 60, height: 60, borderRadius: 15,
    overflow: 'hidden', backgroundColor: NM_BASE, position: 'relative',
  },
  thumb:      { width: '100%', height: '100%' },
  thumbEmpty: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: NM_DARK },
  thumbEmoji: { fontSize: 24 },
  noImgDot: {
    position: 'absolute', top: 3, right: 3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo:  { flex: 1, gap: 2 },
  cardName:  { fontSize: 14, fontWeight: '700', color: Colors.text || '#2D3A4A' },
  cardMacro: { fontSize: 11, color: Colors.textMuted || '#7A8A9A' },
  tagRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  tag: {
    fontSize: 9, fontWeight: '700', color: Colors.textMuted || '#7A8A9A',
    backgroundColor: NM_DARK, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  moreBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: NM_BASE, alignItems: 'center', justifyContent: 'center',
  },
  moreBtnText: { fontSize: 18, color: Colors.textMuted || '#9AAABB', lineHeight: 20 },

  popupMenu: {
    position: 'absolute', right: 10, top: 10,
    backgroundColor: NM_BASE, borderRadius: 14, zIndex: 99, minWidth: 130,
  },
  popupItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  popupItemIcon: { fontSize: 16 },
  popupItemText: { fontSize: 14, fontWeight: '700', color: Colors.text || '#2D3A4A' },
  popupDivider:  { height: 1, backgroundColor: NM_DARK, marginHorizontal: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.text || '#2D3A4A' },
  emptyDesc:  { fontSize: 12, color: Colors.textMuted || '#9AAABB', textAlign: 'center', paddingHorizontal: 32 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(20,28,40,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%', maxHeight: '92%',
    backgroundColor: NM_BASE, borderRadius: 28, padding: 20, paddingTop: 14,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.3, shadowRadius: 40 },
      android: { elevation: 24 },
    }),
  },
  handle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: NM_DARK, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: Colors.text || '#2D3A4A' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: NM_BASE, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, color: Colors.textMuted || '#9AAABB', fontWeight: '700' },

  label: {
    fontSize: 11, fontWeight: '800', color: Colors.textMuted || '#9AAABB',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6,
  },
  inputWrap: { backgroundColor: NM_BASE, borderRadius: 12, paddingHorizontal: 4 },
  inputFlat: { backgroundColor: 'transparent' },
  row2:      { flexDirection: 'row' },

  imageRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  imagePreviewBox: { width: 80, height: 80, borderRadius: 18, overflow: 'hidden', backgroundColor: NM_BASE },
  imagePreview:    { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%', backgroundColor: NM_DARK,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  imagePlaceholderText: { fontSize: 9, color: Colors.textMuted || '#9AAABB', fontWeight: '700' },
  imageInfo:       { flex: 1, gap: 8 },
  imagePickBtn:    { backgroundColor: NM_BASE, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
  imagePickBtnText:{ fontSize: 12, fontWeight: '700', color: Colors.primary || '#5A8DF5' },
  imageNewBadge:   { fontSize: 10, color: Colors.primary || '#5A8DF5', fontWeight: '700', textAlign: 'center' },
  imageHint:       { fontSize: 10, color: Colors.textMuted || '#9AAABB', textAlign: 'center' },

  formTip:     { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 14 },
  formTipText: { fontSize: 11, color: '#92400E' },

  saveBtn: {
    backgroundColor: Colors.primary || '#5A8DF5',
    borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', marginTop: 14,
    ...Platform.select({
      ios:     { shadowColor: Colors.primary || '#5A8DF5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});