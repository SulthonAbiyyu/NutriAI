/**
 * BarcodeScannerScreen.js
 * expo-camera v14+ (CameraView) + Open Food Facts API
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { ROUTES } from '../../constants';

// Static import — Metro harus resolve ini, tidak bisa lazy
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: W } = Dimensions.get('window');
const BOX_SIZE = W * 0.65;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,  setScanned]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  // Minta izin saat mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, []);

  const handleBarcode = async ({ data: barcode }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res  = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { headers: { 'User-Agent': 'NutriAI/1.0' } }
      );
      const json = await res.json();

      if (json.status === 0 || !json.product) {
        setResult({ error: 'Produk tidak ditemukan. Coba masukkan manual.' });
        setLoading(false);
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};
      const gram_per_porsi = p.serving_size
        ? parseFloat(p.serving_size.replace(/[^0-9.]/g, '')) || 100 : 100;
      const scale = gram_per_porsi / 100;

      setResult({
        food: {
          nama_makanan:  p.product_name || p.product_name_id || `Produk ${barcode}`,
          kalori:        Math.round((parseFloat(n['energy-kcal_100g'] || 0)) * scale * 10) / 10,
          protein:       Math.round((parseFloat(n['proteins_100g']    || 0)) * scale * 10) / 10,
          karbo:         Math.round((parseFloat(n['carbohydrates_100g']|| 0)) * scale * 10) / 10,
          lemak:         Math.round((parseFloat(n['fat_100g']         || 0)) * scale * 10) / 10,
          gram_per_porsi,
          barcode,
          fromBarcode: true,
        }
      });
    } catch {
      setResult({ error: 'Gagal fetch data. Cek koneksi internet.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!result?.food) return;
    navigation.navigate(ROUTES.INPUT_MAKAN, { barcodeFood: result.food });
  };

  // Belum ada permission
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>📷</Text>
        <Text style={styles.permTitle}>Izin Kamera Diperlukan</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e', 'code128', 'code39'] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanBox}>
            <View style={[styles.corner, { top: 0, left: 0,   borderBottomWidth: 0, borderRightWidth:  0 }]} />
            <View style={[styles.corner, { top: 0, right: 0,  borderBottomWidth: 0, borderLeftWidth:   0 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0,  borderTopWidth: 0,    borderRightWidth:  0 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderTopWidth: 0,    borderLeftWidth:   0 }]} />
            {loading && (
              <View style={styles.scanLoading}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanLoadingText}>Mencari produk...</Text>
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        <View style={styles.overlayBottom}>
          <TouchableOpacity style={{ marginBottom: 8 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{scanned ? '' : 'Arahkan kamera ke barcode produk'}</Text>

          {result && (
            <View style={styles.resultCard}>
              {result.error ? (
                <>
                  <Text style={styles.resultError}>⚠️ {result.error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => { setScanned(false); setResult(null); }}>
                    <Text style={styles.retryBtnText}>🔄 Scan Ulang</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.resultName} numberOfLines={2}>{result.food.nama_makanan}</Text>
                  <View style={styles.resultMacros}>
                    {[
                      { val: result.food.kalori,  lbl: 'kcal',    c: Colors.danger  },
                      { val: `${result.food.protein}g`, lbl: 'protein', c: Colors.primary },
                      { val: `${result.food.karbo}g`,   lbl: 'karbo',   c: Colors.warning },
                      { val: `${result.food.lemak}g`,   lbl: 'lemak',   c: Colors.blue    },
                    ].map((m, i) => (
                      <View key={i} style={styles.macroChip}>
                        <Text style={[styles.macroVal, { color: m.c }]}>{m.val}</Text>
                        <Text style={styles.macroLbl}>{m.lbl}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.resultPerPorti}>per {result.food.gram_per_porsi}g/porsi</Text>
                  <View style={styles.resultActions}>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setScanned(false); setResult(null); }}>
                      <Text style={styles.retryBtnText}>🔄 Scan Lagi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                      <Text style={styles.addBtnText}>+ Tambah ke Cart</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
          <View style={{ height: insets.bottom + 8 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  backBtn2: { position: 'absolute', top: 16, left: 16 },
  permTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 20, textAlign: 'center' },
  permBtn:   { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.full },
  permBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  overlay:       { flex: 1 },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: BOX_SIZE },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 20, paddingTop: 16 },

  scanBox:    { width: BOX_SIZE, height: BOX_SIZE },
  corner:     { position: 'absolute', width: 24, height: 24, borderColor: Colors.primary, borderWidth: 3 },
  scanLoading:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanLoadingText: { color: '#fff', marginTop: 10, fontSize: 13 },

  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  resultCard:    { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16 },
  resultError:   { fontSize: 13, color: Colors.danger, marginBottom: 10 },
  resultName:    { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  resultMacros:  { flexDirection: 'row', gap: 8, marginBottom: 6 },
  macroChip:     { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: 8, alignItems: 'center' },
  macroVal:      { fontSize: 14, fontWeight: '800' },
  macroLbl:      { fontSize: 9, color: Colors.textMuted, marginTop: 1 },
  resultPerPorti:{ fontSize: 11, color: Colors.textMuted, marginBottom: 10 },
  resultActions: { flexDirection: 'row', gap: 10 },
  retryBtn:      { flex: 1, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.bgSecondary, alignItems: 'center' },
  retryBtnText:  { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  addBtn:        { flex: 1.5, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center' },
  addBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },
});