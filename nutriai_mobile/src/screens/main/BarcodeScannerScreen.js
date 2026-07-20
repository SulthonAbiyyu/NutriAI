import { useNavigation, useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const { width: W } = Dimensions.get("window");
const BOX_SIZE = W * 0.65;
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";

const NOISE_DOTS = Array.from({ length: 60 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.6,
  o: 0.02 + Math.random() * 0.04,
  dark: Math.random() > 0.5,
}));

function BgTexture() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 220"
      preserveAspectRatio="none"
    >
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy * 2.2}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
        />
      ))}
    </Svg>
  );
}

function ShadowOverlay({ opacity = 0.3 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.12, y: 0.05 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const ICON_DEPTH_LAYERS = [
  { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
  { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
  { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
  { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = 16 }) {
  return (
    <>
      {ICON_DEPTH_LAYERS.map((l, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius,
              backgroundColor: l.color,
              transform: [{ translateX: l.dx }, { translateY: l.dy }],
            },
          ]}
        />
      ))}
    </>
  );
}

const ICON_NOISE_DOTS = Array.from({ length: 30 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.5,
  o: 0.03 + Math.random() * 0.05,
  dark: Math.random() > 0.55,
}));

function IconTexture({ opacity = 1 }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
    >
      {ICON_NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={
            d.dark
              ? `rgba(0,0,0,${d.o * opacity})`
              : `rgba(255,255,255,${d.o * opacity})`
          }
        />
      ))}
    </Svg>
  );
}
const MACRO_COLORS = {
  kcal: "#FF8A65",
  protein: "#4ADE80",
  karbo: "#FBBF24",
  lemak: "#60A5FA",
};

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const onScanned = route.params?.onScanned;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { headers: { "User-Agent": "NutriAI/1.0" } },
      );
      const json = await res.json();

      if (json.status === 0 || !json.product) {
        setResult({ error: "Produk tidak ditemukan. Coba masukkan manual." });
        setLoading(false);
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};
      const gram_per_porsi = p.serving_size
        ? parseFloat(p.serving_size.replace(/[^0-9.]/g, "")) || 100
        : 100;
      const scale = gram_per_porsi / 100;

      setResult({
        food: {
          nama_makanan:
            p.product_name || p.product_name_id || `Produk ${barcode}`,
          kalori:
            Math.round(parseFloat(n["energy-kcal_100g"] || 0) * scale * 10) /
            10,
          protein:
            Math.round(parseFloat(n["proteins_100g"] || 0) * scale * 10) / 10,
          karbo:
            Math.round(parseFloat(n["carbohydrates_100g"] || 0) * scale * 10) /
            10,
          lemak: Math.round(parseFloat(n["fat_100g"] || 0) * scale * 10) / 10,
          gram_per_porsi,
          barcode,
          fromBarcode: true,
        },
      });
    } catch {
      setResult({ error: "Gagal fetch data. Cek koneksi internet." });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!result?.food) return;
    if (!onScanned) {
      setResult({
        error:
          "Tidak bisa mengirim data ke halaman input. Coba buka scanner lewat menu Input Makanan.",
      });
      return;
    }
    onScanned(result.food);
    navigation.goBack();
  };
  if (!permission) {
    return (
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOTTOM]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.center}
      >
        <BgTexture />
        <ActivityIndicator size="large" color="#4ADE80" />
      </LinearGradient>
    );
  }
  if (!permission.granted) {
    return (
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOTTOM]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.center, { paddingTop: insets.top }]}
      >
        <BgTexture />

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backLinkTxt}>← Kembali</Text>
        </TouchableOpacity>

        <View style={styles.permIconOuter}>
          <DepthStack radius={20} />
          <LinearGradient
            colors={["#173C22", "#050B06"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.permIconInner}
          >
            <ShadowOverlay opacity={0.28} />
            <IconTexture opacity={0.6} />
            <Text style={styles.permIconEmoji}>📷</Text>
          </LinearGradient>
        </View>

        <View style={styles.titleStack}>
          <Text style={styles.permTitleShadow}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permTitle}>Izin Kamera Diperlukan</Text>
        </View>
        <Text style={styles.permSubtitle}>
          Dipakai buat scan barcode produk makanan
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={requestPermission}
          style={styles.permBtnOuter}
        >
          <LinearGradient
            colors={["#4ADE80", "#15803D"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.permBtn}
          >
            <Text style={styles.permBtnText}>Izinkan Kamera</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "qr",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
          ],
        }}
      />

      {}
      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backLinkOnCam}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backLinkOnCamTxt}>← Kembali</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanBox}>
            <View
              style={[
                styles.corner,
                { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
              ]}
            />
            <View
              style={[
                styles.corner,
                { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
              ]}
            />
            <View
              style={[
                styles.corner,
                { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
              ]}
            />
            <View
              style={[
                styles.corner,
                { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
              ]}
            />
            {loading && (
              <View style={styles.scanLoading}>
                <ActivityIndicator size="large" color="#4ADE80" />
                <Text style={styles.scanLoadingText}>Mencari produk...</Text>
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {}
        <LinearGradient
          colors={[
            "rgba(2,6,2,0)",
            "rgba(2,6,2,0.55)",
            "rgba(2,6,2,0.85)",
            "rgba(2,6,2,0.96)",
            BG_BOTTOM,
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={styles.overlayBottom}
        >
          <Text style={styles.hint}>
            {scanned ? "" : "Arahkan kamera ke barcode produk"}
          </Text>

          {result && (
            <View style={styles.resultOuter}>
              <DepthStack radius={22} />
              <LinearGradient
                colors={["#0F1F14", "#070E09", BG_BOTTOM]}
                locations={[0, 0.6, 1]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={styles.resultCard}
              >
                <IconTexture opacity={0.5} />
                {result.error ? (
                  <>
                    <Text style={styles.resultError}>⚠️ {result.error}</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => {
                        setScanned(false);
                        setResult(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.retryBtnText}>🔄 Scan Ulang</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.resultName} numberOfLines={2}>
                      {result.food.nama_makanan}
                    </Text>
                    <View style={styles.resultMacros}>
                      {[
                        {
                          val: result.food.kalori,
                          lbl: "kcal",
                          c: MACRO_COLORS.kcal,
                        },
                        {
                          val: `${result.food.protein}g`,
                          lbl: "protein",
                          c: MACRO_COLORS.protein,
                        },
                        {
                          val: `${result.food.karbo}g`,
                          lbl: "karbo",
                          c: MACRO_COLORS.karbo,
                        },
                        {
                          val: `${result.food.lemak}g`,
                          lbl: "lemak",
                          c: MACRO_COLORS.lemak,
                        },
                      ].map((m, i) => (
                        <View key={i} style={styles.macroChip}>
                          <Text style={[styles.macroVal, { color: m.c }]}>
                            {m.val}
                          </Text>
                          <Text style={styles.macroLbl}>{m.lbl}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.resultPerPorti}>
                      per {result.food.gram_per_porsi}g/porsi
                    </Text>
                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                          setScanned(false);
                          setResult(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.retryBtnText}>🔄 Scan Lagi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleAdd}
                        style={styles.addBtnOuter}
                      >
                        <LinearGradient
                          colors={["#4ADE80", "#15803D"]}
                          start={{ x: 0.15, y: 0 }}
                          end={{ x: 0.9, y: 1 }}
                          style={styles.addBtn}
                        >
                          <Text style={styles.addBtnText}>
                            + Tambah ke Cart
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </LinearGradient>
            </View>
          )}
          <View style={{ height: insets.bottom + 8 }} />
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  backLink: { position: "absolute", top: 16, left: 16, zIndex: 2 },
  backLinkTxt: { color: "#4ADE80", fontWeight: "700", fontSize: 14 },

  permIconOuter: {
    width: 84,
    height: 84,
    borderRadius: 20,
    position: "relative",
    marginBottom: 22,
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  permIconInner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  permIconEmoji: { fontSize: 38 },

  titleStack: { position: "relative", alignItems: "center" },
  permTitleShadow: {
    position: "absolute",
    top: 1.5,
    left: 1,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
    textAlign: "center",
  },
  permTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(61,255,143,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  permSubtitle: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.5)",
    marginTop: 10,
    marginBottom: 26,
    textAlign: "center",
  },

  permBtnOuter: {
    borderRadius: 999,
    shadowColor: "#22C55E",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  permBtn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 999 },
  permBtnText: { color: "#04140A", fontWeight: "800", fontSize: 15 },

  overlay: { flex: 1 },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(2,6,2,0.6)",
    paddingHorizontal: 16,
  },
  backLinkOnCam: { alignSelf: "flex-start", marginTop: 12 },
  backLinkOnCamTxt: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "700",
  },

  overlayMiddle: { flexDirection: "row", height: BOX_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(2,6,2,0.6)" },
  overlayBottom: { flex: 1.2, paddingHorizontal: 20, paddingTop: 16 },

  scanBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: "rgba(2,6,2,0.15)",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#4ADE80",
    borderWidth: 3,
    borderRadius: 4,
    shadowColor: "#4ADE80",
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  scanLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanLoadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600",
  },

  resultOuter: { position: "relative" },
  resultCard: {
    borderRadius: 22,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  resultError: {
    fontSize: 13,
    color: "#FF8A65",
    marginBottom: 12,
    fontWeight: "600",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    textShadowColor: "rgba(61,255,143,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  resultMacros: { flexDirection: "row", gap: 8, marginBottom: 8 },
  macroChip: {
    flex: 1,
    borderRadius: 14,
    padding: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  macroVal: { fontSize: 14, fontWeight: "800" },
  macroLbl: {
    fontSize: 9,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
    fontWeight: "600",
  },
  resultPerPorti: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 14,
  },

  resultActions: { flexDirection: "row", gap: 10 },
  retryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(74,222,128,0.4)",
    borderStyle: "dashed",
  },
  retryBtnText: { fontSize: 13, fontWeight: "700", color: "#4ADE80" },

  addBtnOuter: {
    flex: 1.5,
    borderRadius: 999,
    shadowColor: "#22C55E",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  addBtn: { paddingVertical: 11, borderRadius: 999, alignItems: "center" },
  addBtnText: { fontSize: 13, fontWeight: "800", color: "#04140A" },
});
