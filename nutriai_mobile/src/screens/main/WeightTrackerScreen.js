import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { ICONS } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { addWeight, getWeight } from "../../services/WeightService";
import { Radius, Spacing } from "../../theme";
import { formatDate } from "../../utils";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - Spacing.md * 2 - 36;
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";
const CARD_TOP = "#122217";
const CARD_MID = "#0A160C";
const CARD_BOTTOM = "#050C06";

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

function DepthStack({ radius = 16, layers }) {
  const L = layers || [
    { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
    { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
    { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
    { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
  ];

  return (
    <>
      {L.map((l, i) => (
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
function Card3D({ children, style, contentStyle, radius = 20 }) {
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <DepthStack radius={radius} />
      <LinearGradient
        colors={[CARD_TOP, CARD_MID, CARD_BOTTOM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[styles.cardInner, { borderRadius: radius }, contentStyle]}
      >
        <ShadowOverlay opacity={0.22} />
        <IconTexture opacity={0.5} />
        {children}
      </LinearGradient>
    </View>
  );
}
function IconBox({ emoji, size = 32, colors }) {
  return (
    <View
      style={[
        styles.iconBoxOuter,
        { width: size, height: size, borderRadius: size / 2.6 },
      ]}
    >
      <DepthStack
        radius={size / 2.6}
        layers={[
          { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.45)" },
          { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.28)" },
        ]}
      />

      <LinearGradient
        colors={colors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.iconBoxInner, { borderRadius: size / 2.6 }]}
      >
        <ShadowOverlay opacity={0.25} />
        <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
      </LinearGradient>
    </View>
  );
}
function CtaButton({ label, onPress, disabled, loading, colors, style }) {
  const isBlocked = disabled || loading;
  return (
    <View style={[styles.ctaOuter, style]}>
      <DepthStack
        radius={Radius.md}
        layers={[
          { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.5)" },
          { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.35)" },
          { dx: 3, dy: 4.6, color: "rgba(0,0,0,0.20)" },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isBlocked}
        style={{ borderRadius: Radius.md }}
      >
        <LinearGradient
          colors={colors || ["#4ADE80", "#15803D"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.ctaInner, isBlocked && styles.ctaDisabled]}
        >
          <ShadowOverlay opacity={0.25} />
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
function WeightLineChart({
  points,
  width = CHART_W,
  height = 140,
  padding = 18,
}) {
  if (!points || points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const x = (i) => padding + (i / (points.length - 1)) * innerW;
  const y = (v) => padding + innerH - ((v - min) / range) * innerH;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1).toFixed(1)} ${height - padding} L ${x(0).toFixed(1)} ${height - padding} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4ADE80" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#4ADE80" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((f, i) => (
          <Line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={padding + innerH * f}
            y2={padding + innerH * f}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        <Path d={areaPath} fill="url(#weightAreaGrad)" stroke="none" />
        <Path
          d={linePath}
          fill="none"
          stroke="#4ADE80"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const last = i === points.length - 1;
          return (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={last ? 4.5 : 3}
              fill={last ? "#4ADE80" : "#0A160C"}
              stroke="#4ADE80"
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{points[0]?.label}</Text>
        <Text style={styles.chartLabel}>
          {points[points.length - 1]?.label}
        </Text>
      </View>
    </View>
  );
}

export default function WeightTrackerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const { data, loading, execute } = useApi(getWeight);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleSave = async () => {
    const bb = parseFloat(input);
    if (isNaN(bb) || bb < 30 || bb > 300) {
      return Alert.alert("Input Salah", "Masukkan berat antara 30–300 kg");
    }
    setSaving(true);
    try {
      await addWeight(bb, catatan);
      setInput("");
      setCatatan("");
      await execute();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const current = data?.current || 0;
  const initial = data?.initial || 0;
  const change = data?.change || 0;
  const records = data?.data || [];

  const chartPoints = (records || [])
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      label: d.tanggal ? d.tanggal.slice(5) : "",
      value: parseFloat(d.berat || d.bb) || 0,
    }));

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <BgTexture />

      {}
      <View style={styles.topBar}>
        <View style={styles.titleIconOuter}>
          <DepthStack radius={16} />
          <LinearGradient
            colors={["#173C22", "#050B06"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.titleIconInner}
          >
            <ShadowOverlay opacity={0.28} />
            <IconTexture opacity={0.6} />
            <Image
              source={ICONS.weightTrackerTitle}
              style={styles.titleIconImg}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        <View style={styles.titleStack}>
          <Text style={styles.titleShadow}>Weight Tracker</Text>
          <Text style={styles.title}>Weight Tracker</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ADE80"
          />
        }
      >
        {}
        {data && (
          <View style={styles.statsRow}>
            <Card3D
              style={styles.statCardOuter}
              radius={18}
              contentStyle={[
                styles.statCardInner,
                { borderColor: "rgba(74,222,128,0.4)" },
              ]}
            >
              <Text style={[styles.statVal, { color: "#4ADE80" }]}>
                {current} kg
              </Text>
              <Text style={styles.statLbl}>Sekarang</Text>
            </Card3D>
            <Card3D
              style={styles.statCardOuter}
              radius={18}
              contentStyle={[
                styles.statCardInner,
                { borderColor: "rgba(255,255,255,0.18)" },
              ]}
            >
              <Text
                style={[styles.statVal, { color: "rgba(255,255,255,0.75)" }]}
              >
                {initial} kg
              </Text>
              <Text style={styles.statLbl}>Awal</Text>
            </Card3D>
            <Card3D
              style={styles.statCardOuter}
              radius={18}
              contentStyle={[
                styles.statCardInner,
                {
                  borderColor:
                    change >= 0
                      ? "rgba(74,222,128,0.4)"
                      : "rgba(248,113,113,0.4)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statVal,
                  { color: change >= 0 ? "#4ADE80" : "#F87171" },
                ]}
              >
                {change >= 0 ? "+" : ""}
                {change} kg
              </Text>
              <Text style={styles.statLbl}>Perubahan</Text>
            </Card3D>
          </View>
        )}

        {}
        {chartPoints.length > 1 && (
          <Card3D style={{ marginBottom: 16 }}>
            <View style={styles.sectionHead}>
              <IconBox emoji="📈" colors={["#4ADE80", "#15803D"]} />
              <Text style={styles.sectionTitle}>
                Grafik Berat (14 hari terakhir)
              </Text>
            </View>
            <WeightLineChart points={chartPoints} />
          </Card3D>
        )}

        {}
        <Card3D style={{ marginBottom: 16 }}>
          <View style={styles.sectionHead}>
            <IconBox emoji="➕" colors={["#4ADE80", "#15803D"]} />
            <Text style={styles.sectionTitle}>Input Berat Hari Ini</Text>
          </View>

          <Text style={styles.fieldLabel}>Berat (kg)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="Contoh: 65.5"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
            Catatan (opsional)
          </Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="Catatan..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={catatan}
              onChangeText={setCatatan}
            />
          </View>

          <CtaButton
            label="Simpan Berat"
            loading={saving}
            disabled={saving || !input}
            onPress={handleSave}
            style={{ marginTop: 16, width: "100%" }}
          />
        </Card3D>

        {}
        <Card3D>
          <View style={styles.sectionHead}>
            <IconBox emoji="📅" colors={["#4ADE80", "#15803D"]} />
            <Text style={styles.sectionTitle}>Riwayat</Text>
          </View>
          {loading && !data ? (
            <ActivityIndicator
              size="small"
              color="#4ADE80"
              style={{ marginVertical: 16 }}
            />
          ) : records.length === 0 ? (
            <Text style={styles.empty}>Belum ada data berat</Text>
          ) : (
            records.slice(0, 20).map((r, i) => (
              <View key={r.id || i} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyDate}>
                    {formatDate(r.tanggal)}
                  </Text>
                  {r.catatan ? (
                    <Text style={styles.historyCatatan}>{r.catatan}</Text>
                  ) : null}
                </View>
                <Text style={styles.historyBb}>{r.bb} kg</Text>
              </View>
            ))
          )}
        </Card3D>
      </ScrollView>

      {}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(2,6,2,0)",
          "rgba(2,6,2,0.22)",
          "rgba(2,6,2,0.55)",
          "rgba(2,6,2,0.82)",
          BG_BOTTOM,
        ]}
        locations={[0, 0.28, 0.55, 0.8, 1]}
        style={[styles.footerBox, { height: insets.bottom + 100 }]}
      />

      {}
      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.goBack()}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 14,
  },
  titleIconOuter: {
    width: 44,
    height: 44,
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  titleIconInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  titleIconImg: { width: 26, height: 26 },
  titleStack: { position: "relative", justifyContent: "center" },
  titleShadow: {
    position: "absolute",
    top: 1.5,
    left: 1,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textShadowColor: "rgba(61,255,143,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  footerBox: { position: "absolute", left: 0, right: 0, bottom: 0 },
  cardInner: {
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    padding: 18,
    overflow: "hidden",
  },
  iconBoxOuter: { position: "relative" },
  iconBoxInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.2,
    borderTopColor: "rgba(255,255,255,0.30)",
    borderLeftColor: "rgba(255,255,255,0.30)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
  },
  ctaOuter: { position: "relative", borderRadius: Radius.md },
  ctaInner: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCardOuter: { flex: 1 },
  statCardInner: {
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  statVal: { fontSize: 15, fontWeight: "900" },
  statLbl: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  chartLabel: { fontSize: 10.5, color: "rgba(255,255,255,0.4)" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  inputText: { fontSize: 14, color: "#FFFFFF" },

  empty: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 12.5,
  },

  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  historyDate: { fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
  historyCatatan: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  historyBb: { fontSize: 15, fontWeight: "800", color: "#4ADE80" },
});
