import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodImage } from '../../services/AiService';
import { Colors, Spacing, Radius } from '../../theme';
import Button from './Button';

export default function AiAnalyzeModal({ visible, onClose, onAdd }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result,    setResult]    = useState(null);

  const pickImage = async (source) => {
    try {
      let res;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin diperlukan', 'Izinkan akses kamera di Settings');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7, base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin diperlukan', 'Izinkan akses galeri di Settings');
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7, base64: true,
        });
      }

      if (res.canceled || !res.assets?.[0]?.base64) return;

      setAnalyzing(true);
      setResult(null);
      try {
        const data = await analyzeFoodImage(res.assets[0].base64);
        if (data.result) {
          setResult(data.result);
        } else {
          Alert.alert('Tidak Terdeteksi', 'AI tidak dapat menganalisis gambar ini. Coba foto yang lebih jelas.');
        }
      } catch (e) {
        Alert.alert('Error', e?.response?.data?.error || 'Analisis gagal. Pastikan GEMINI_API_KEY terkonfigurasi.');
      } finally {
        setAnalyzing(false);
      }
    } catch {
      Alert.alert('Error', 'Gagal mengambil gambar');
    }
  };

  const handleAdd = () => {
    if (!result) return;
    onAdd({
      nama_makanan: result.nama_makanan || 'Makanan (AI)',
      protein:      result.estimasi_protein || 0,
      kalori:       result.estimasi_kalori  || 0,
      karbo:        result.estimasi_karbo   || 0,
      lemak:        result.estimasi_lemak   || 0,
      fromAI:       true,
    });
    setResult(null);
    onClose();
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.aiOverlay}>
        <View style={styles.aiSheet}>
          <View style={styles.aiSheetHeader}>
            <Text style={styles.aiSheetTitle}>🤖 Analisis Makanan AI</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.aiSheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {analyzing ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="large" color={Colors.purple} />
              <Text style={styles.aiLoadingText}>AI sedang menganalisis gambar...</Text>
              <Text style={styles.aiLoadingHint}>Ini bisa 5–15 detik</Text>
            </View>
          ) : result ? (
            <View style={styles.aiResult}>
              <Text style={styles.aiResultName}>{result.nama_makanan}</Text>
              <View style={styles.aiResultMacros}>
                {[
                  { label: '🔥 Kalori',  val: `${result.estimasi_kalori} kcal`,  color: Colors.danger  },
                  { label: '💪 Protein', val: `${result.estimasi_protein}g`,     color: Colors.primary },
                  { label: '🌾 Karbo',   val: `${result.estimasi_karbo}g`,       color: Colors.warning },
                  { label: '🧈 Lemak',   val: `${result.estimasi_lemak}g`,       color: Colors.blue    },
                ].map(m => (
                  <View key={m.label} style={styles.aiMacroChip}>
                    <Text style={styles.aiMacroLabel}>{m.label}</Text>
                    <Text style={[styles.aiMacroVal, { color: m.color }]}>{m.val}</Text>
                  </View>
                ))}
              </View>
              {result.catatan ? <Text style={styles.aiCatatan}>💬 {result.catatan}</Text> : null}
              <Text style={styles.aiDisclaimer}>⚠️ Ini estimasi AI — nilai mungkin tidak 100% akurat</Text>
              <Button label="+ Tambah ke Keranjang" onPress={handleAdd} style={{ marginTop: 16 }} />
              <Button label="Foto Ulang" onPress={() => setResult(null)} variant="outline" style={{ marginTop: 10 }} />
            </View>
          ) : (
            <View style={styles.aiPicker}>
              <Text style={styles.aiPickerDesc}>
                Foto makananmu dan biarkan AI mengestimasi kandungan nutrisinya secara otomatis!
              </Text>
              <TouchableOpacity style={styles.aiPickerBtn} onPress={() => pickImage('camera')} activeOpacity={0.8}>
                <Text style={styles.aiPickerIcon}>📷</Text>
                <View>
                  <Text style={styles.aiPickerLabel}>Buka Kamera</Text>
                  <Text style={styles.aiPickerSub}>Foto makanan sekarang</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiPickerBtn, { borderColor: Colors.blue }]} onPress={() => pickImage('gallery')} activeOpacity={0.8}>
                <Text style={styles.aiPickerIcon}>🖼</Text>
                <View>
                  <Text style={styles.aiPickerLabel}>Pilih dari Galeri</Text>
                  <Text style={styles.aiPickerSub}>Gunakan foto yang sudah ada</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  aiOverlay:     { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  aiSheet:       { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: 32 },
  aiSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  aiSheetTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text },
  aiSheetClose:  { fontSize: 18, color: Colors.textMuted, padding: 4 },

  aiLoading:     { alignItems: 'center', paddingVertical: 48 },
  aiLoadingText: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 16 },
  aiLoadingHint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },

  aiResult:       { padding: Spacing.md },
  aiResultName:   { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  aiResultMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  aiMacroChip:    { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 10, alignItems: 'center', minWidth: '45%', flex: 1 },
  aiMacroLabel:   { fontSize: 11, color: Colors.textMuted, marginBottom: 3 },
  aiMacroVal:     { fontSize: 16, fontWeight: '800' },
  aiCatatan:      { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: 10, lineHeight: 18 },
  aiDisclaimer:   { fontSize: 11, color: Colors.textMuted, marginTop: 10, textAlign: 'center' },

  aiPicker:      { padding: Spacing.md },
  aiPickerDesc:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  aiPickerBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.purpleLight, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: Colors.purple },
  aiPickerIcon:  { fontSize: 28, marginRight: 14 },
  aiPickerLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  aiPickerSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});