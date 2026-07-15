/**
 * MealTemplatesScreen.js
 *
 * CRUD untuk meal templates (preset kombinasi makanan favorit).
 * - Lihat semua template
 * - Buat template baru dari daftar food database
 * - Gunakan template → langsung masuk daily log
 * - Hapus template
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
  RefreshControl, TextInput, Modal, FlatList,
} from 'react-native';
import { useNavigation }       from '@react-navigation/native';
import { useSafeAreaInsets }   from 'react-native-safe-area-context';
import { getTemplates, createTemplate, deleteTemplate, useTemplate } from '../../services/TemplateService';
import { getFoods }            from '../../services/FoodService';
import { useApi }              from '../../hooks/useApi';
import { useRefreshOnFocus }   from '../../hooks/useRefreshOnFocus';
import { useDisclosure }       from '../../hooks/useDisclosure';
import Card                    from '../../components/common/Card';
import Button                  from '../../components/common/Button';
import Input                   from '../../components/common/Input';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const WAKTU_OPTS = ['Pagi', 'Siang', 'Sore', 'Malam'];

// ─── Sub-components ──────────────────────────────────

function TemplateCard({ template, onUse, onDelete }) {
  const [using, setUsing]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showWaktu, setShowWaktu] = useState(false);

  const totalProtein = template.items?.reduce((a, i) => a + (i.food?.protein || 0) * i.porsi, 0) || 0;
  const totalKalori  = template.items?.reduce((a, i) => a + (i.food?.kalori  || 0) * i.porsi, 0) || 0;

  const handleUse = async (waktu) => {
    setShowWaktu(false);
    setUsing(true);
    try {
      await useTemplate(template.id, waktu);
      onUse();
      Alert.alert('✅ Berhasil', `Template "${template.nama}" ditambahkan ke ${waktu}`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menggunakan template');
    } finally {
      setUsing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Hapus Template', `Hapus template "${template.nama}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTemplate(template.id);
            onDelete(template.id);
          } catch (e) {
            Alert.alert('Error', 'Gagal menghapus');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Card style={styles.templateCard}>
        {/* Header */}
        <View style={styles.templateHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.templateName}>{template.nama}</Text>
            {template.deskripsi ? (
              <Text style={styles.templateDesc}>{template.deskripsi}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleDelete} disabled={deleting} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {deleting
              ? <ActivityIndicator size="small" color={Colors.danger} />
              : <Text style={styles.deleteBtnText}>🗑</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Macro Summary */}
        <View style={styles.macroRow}>
          <View style={[styles.macroPill, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[styles.macroPillText, { color: Colors.primary }]}>💪 {totalProtein}g protein</Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: Colors.dangerLight }]}>
            <Text style={[styles.macroPillText, { color: Colors.danger }]}>🔥 {totalKalori} kcal</Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: Colors.blueLight }]}>
            <Text style={[styles.macroPillText, { color: Colors.blue }]}>📦 {template.items?.length || 0} item</Text>
          </View>
        </View>

        {/* Items */}
        {template.items?.map((item, i) => (
          <View key={i} style={styles.templateItem}>
            <Text style={styles.templateItemName} numberOfLines={1}>
              {item.food?.nama_makanan}
            </Text>
            <Text style={styles.templateItemMeta}>
              {item.porsi}x · {(item.food?.protein || 0) * item.porsi}g · {(item.food?.kalori || 0) * item.porsi} kcal
            </Text>
          </View>
        ))}

        {/* Use Button */}
        <TouchableOpacity
          style={[styles.useBtn, using && styles.useBtnDisabled]}
          onPress={() => setShowWaktu(true)}
          disabled={using}
          activeOpacity={0.8}
        >
          {using
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.useBtnText}>▶ Gunakan Template</Text>
          }
        </TouchableOpacity>
      </Card>

      {/* Waktu Picker Modal */}
      <Modal visible={showWaktu} transparent animationType="fade" onRequestClose={() => setShowWaktu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowWaktu(false)}>
          <View style={styles.waktuModal}>
            <Text style={styles.waktuModalTitle}>Tambah ke waktu makan:</Text>
            {WAKTU_OPTS.map(w => (
              <TouchableOpacity key={w} style={styles.waktuOpt} onPress={() => handleUse(w)}>
                <Text style={styles.waktuOptText}>{w}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.waktuCancel} onPress={() => setShowWaktu(false)}>
              <Text style={styles.waktuCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Create Template Modal ────────────────────────────

function CreateTemplateModal({ visible, onClose, onCreated }) {
  const [nama,      setNama]      = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [items,     setItems]     = useState([]); // { food_id, nama, protein, kalori, porsi }
  const [saving,    setSaving]    = useState(false);
  const searchTimer = useRef(null);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getFoods(text, 1, 10);
        setResults(res.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  };

  const addItem = (food) => {
    const exists = items.find(i => i.food_id === food.id);
    if (exists) {
      setItems(prev => prev.map(i => i.food_id === food.id ? { ...i, porsi: Math.min(10, i.porsi + 1) } : i));
    } else {
      setItems(prev => [...prev, {
        food_id: food.id, nama: food.nama_makanan,
        protein: food.protein, kalori: food.kalori, porsi: 1,
      }]);
    }
    setSearch(''); setResults([]);
  };

  const removeItem = (food_id) => setItems(prev => prev.filter(i => i.food_id !== food_id));
  const changePorsi = (food_id, v) => setItems(prev => prev.map(i => i.food_id === food_id ? { ...i, porsi: v } : i));

  const handleSave = async () => {
    if (!nama.trim())   return Alert.alert('Error', 'Nama template wajib diisi');
    if (!items.length)  return Alert.alert('Error', 'Tambahkan minimal 1 makanan');
    setSaving(true);
    try {
      await createTemplate({
        nama: nama.trim(), deskripsi: deskripsi.trim(),
        items: items.map(i => ({ food_id: i.food_id, porsi: i.porsi })),
      });
      onCreated();
      // Reset
      setNama(''); setDeskripsi(''); setItems([]); setSearch(''); setResults([]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Gagal menyimpan template');
    } finally { setSaving(false); }
  };

  const totalProtein = items.reduce((a, i) => a + i.protein * i.porsi, 0);
  const totalKalori  = items.reduce((a, i) => a + i.kalori  * i.porsi, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.createModal, { paddingTop: 52 }]}>
        {/* Header */}
        <View style={styles.createHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backArrow}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.createTitle}>Buat Template Baru</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          {/* Info */}
          <Input label="Nama Template" placeholder="Contoh: Sarapan High Protein" value={nama} onChangeText={setNama} />
          <Input label="Deskripsi (opsional)" placeholder="Catatan singkat..." value={deskripsi} onChangeText={setDeskripsi} />

          {/* Search Makanan */}
          <Text style={styles.fieldLabel}>Cari & Tambah Makanan</Text>
          <View style={styles.searchBox}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari makanan..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={handleSearch}
            />
            {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          {results.map(food => (
            <TouchableOpacity key={food.id} style={styles.searchResult} onPress={() => addItem(food)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{food.nama_makanan}</Text>
                <Text style={styles.resultMeta}>{food.protein}g protein · {food.kalori} kcal</Text>
              </View>
              <View style={styles.addChip}><Text style={{ color: Colors.primary, fontWeight: '800' }}>+</Text></View>
            </TouchableOpacity>
          ))}

          {/* Cart */}
          {items.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <View style={styles.cartHead}>
                <Text style={styles.cartTitle}>📦 Item Template ({items.length})</Text>
                <Text style={styles.cartMacro}>{totalProtein}g · {totalKalori} kcal</Text>
              </View>
              {items.map(item => (
                <View key={item.food_id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName} numberOfLines={1}>{item.nama}</Text>
                    <Text style={styles.cartMeta}>{item.protein * item.porsi}g · {item.kalori * item.porsi} kcal</Text>
                  </View>
                  <View style={styles.porsiCtrl}>
                    <TouchableOpacity style={styles.porsiBtn} onPress={() => changePorsi(item.food_id, Math.max(1, item.porsi - 1))}>
                      <Text style={styles.porsiBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.porsiVal}>{item.porsi}x</Text>
                    <TouchableOpacity style={styles.porsiBtn} onPress={() => changePorsi(item.food_id, Math.min(10, item.porsi + 1))}>
                      <Text style={styles.porsiBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.food_id)} style={{ paddingLeft: 10 }}>
                    <Text style={{ color: Colors.danger, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}

          <Button
            label={saving ? 'Menyimpan...' : '💾 Simpan Template'}
            onPress={handleSave}
            disabled={saving || !nama.trim() || items.length === 0}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────

export default function MealTemplatesScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const createModal = useDisclosure();
  const { data: templates, loading, execute } = useApi(getTemplates);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const onDelete = useCallback((id) => {
    execute();
  }, [execute]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Meal Templates</Text>
        <TouchableOpacity onPress={createModal.open} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Buat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Info */}
        <Card variant="tinted" style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Apa itu Meal Template?</Text>
          <Text style={styles.infoText}>
            Simpan kombinasi makanan favoritmu sebagai template. Satu tap untuk langsung tambahkan ke daily log — hemat waktu input!
          </Text>
        </Card>

        {loading && !templates ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : !templates || templates.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Belum ada template</Text>
            <Text style={styles.emptyDesc}>Buat template dari kombinasi makananmu yang sering dimakan</Text>
            <Button label="+ Buat Template Pertama" onPress={createModal.open} style={{ marginTop: 20 }} />
          </View>
        ) : (
          templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={execute}
              onDelete={onDelete}
            />
          ))
        )}
      </ScrollView>

      <CreateTemplateModal
        visible={createModal.isOpen}
        onClose={createModal.close}
        onCreated={() => { createModal.close(); execute(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.text },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },
  addBtn:    { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full },
  addBtnText:{ color: Colors.primary, fontWeight: '700', fontSize: 13 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  infoCard:  { marginBottom: 14 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  infoText:  { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  templateCard:   { marginBottom: 14 },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  templateName:   { fontSize: 16, fontWeight: '800', color: Colors.text },
  templateDesc:   { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  deleteBtn:   { padding: 4 },
  deleteBtnText: { fontSize: 18 },

  macroRow:       { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  macroPill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  macroPillText:  { fontSize: 11, fontWeight: '700' },

  templateItem:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  templateItemName: { fontSize: 13, color: Colors.text, flex: 1, marginRight: 8 },
  templateItemMeta: { fontSize: 11, color: Colors.textMuted },

  useBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  useBtnDisabled: { opacity: 0.6 },
  useBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  waktuModal:   { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  waktuModalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: Colors.text },
  waktuOpt:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  waktuOptText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  waktuCancel:  { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  waktuCancelText: { fontSize: 15, color: Colors.textMuted },

  // Create Modal
  createModal:  { flex: 1, backgroundColor: Colors.bg },
  createHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  createTitle:  { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },

  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 4 },
  searchInput:  { flex: 1, fontSize: 14, color: Colors.text },
  searchResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  resultName:   { fontSize: 13, fontWeight: '700', color: Colors.text },
  resultMeta:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  addChip:      { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },

  cartHead:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cartTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  cartMacro: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  cartRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  cartName:  { fontSize: 13, fontWeight: '600', color: Colors.text },
  cartMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  porsiCtrl:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  porsiBtn:    { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  porsiBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 17 },
  porsiVal:    { fontSize: 13, fontWeight: '800', color: Colors.primary, minWidth: 26, textAlign: 'center' },

  empty:     { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle:{ fontSize: 17, fontWeight: '800', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 24 },
});