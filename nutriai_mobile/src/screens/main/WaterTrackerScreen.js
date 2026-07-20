import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { ICONS } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { addWater, getWaterToday } from "../../services/WaterService";
import { Radius, Spacing } from "../../theme";

const QUICK_ML = [150, 250, 350, 500];
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
function WaterRing({ progress, size = 176, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, progress));
  const offset = c * (1 - pct / 100);
  const color = pct >= 100 ? "#4ADE80" : "#4ADE80";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}
function BottleIcon({ filled }) {
  const color = filled ? "#4ADE80" : "rgba(255,255,255,0.22)";
  const fill = filled ? "rgba(74,222,128,0.22)" : "transparent";
  return (
    <Svg width={18} height={28} viewBox="0 0 18 28">
      <Path
        d="M7 1.5H11V5L13 8V25C13 26.1 12.1 27 11 27H7C5.9 27 5 26.1 5 25V8L7 5V1.5Z"
        stroke={color}
        strokeWidth={1.4}
        fill={fill}
      />

      <Path
        d="M6 3H12"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function WaterTrackerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, execute } = useApi(getWaterToday);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleAdd = async (ml) => {
    setSaving(true);
    try {
      await addWater(ml);
      await execute();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const total = data?.total_ml || 0;
  const target = data?.target_ml || 2000;
  const progress = data?.progress || 0;
  const sisa = data?.sisa_ml || target;
  const logs = data?.logs || [];
  const botolTarget = Math.min(Math.ceil(target / 250), 14);
  const botolIsi = Math.floor(total / 250);

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <BgTexture />

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
              source={ICONS.waterTrackerTitle}
              style={styles.titleIconImg}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        <View style={styles.titleStack}>
          <Text style={styles.titleShadow}>Water Tracker</Text>
          <Text style={styles.title}>Water Tracker</Text>
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
        {loading && !data ? (
          <ActivityIndicator
            size="large"
            color="#4ADE80"
            style={{ marginTop: 48 }}
          />
        ) : (
          <>
            {}
            <Card3D
              style={{ marginBottom: 16 }}
              contentStyle={styles.mainInner}
            >
              <View style={styles.ringWrap}>
                <WaterRing progress={progress} />
                <View style={styles.ringCenterAbs} pointerEvents="none">
                  <Text style={styles.circleNum}>{total}</Text>
                  <Text style={styles.circleUnit}>ml</Text>
                  <Text
                    style={[
                      styles.circlePct,
                      { color: progress >= 100 ? "#4ADE80" : "#4ADE80" },
                    ]}
                  >
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(0, Math.min(100, progress))}%` },
                  ]}
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: "#60A5FA" }]}>
                    {total} ml
                  </Text>
                  <Text style={styles.statLbl}>Diminum</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: "#FFFFFF" }]}>
                    {target} ml
                  </Text>
                  <Text style={styles.statLbl}>Target</Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statVal,
                      { color: sisa === 0 ? "#4ADE80" : "#F87171" },
                    ]}
                  >
                    {sisa} ml
                  </Text>
                  <Text style={styles.statLbl}>Sisa</Text>
                </View>
              </View>

              {}
              <View style={styles.botolRow}>
                {Array.from({ length: botolTarget }).map((_, i) => (
                  <BottleIcon key={i} filled={i < botolIsi} />
                ))}
              </View>

              {progress >= 100 && (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>
                    🎉 Target air minum tercapai!
                  </Text>
                </View>
              )}
            </Card3D>

            {}
            <Card3D style={{ marginBottom: 16 }}>
              <View style={styles.sectionHead}>
                <IconBox emoji="💧" colors={["#4ADE80", "#15803D"]} />
                <Text style={styles.sectionTitle}>Tambah Air</Text>
              </View>
              <View style={styles.quickRow}>
                {QUICK_ML.map((ml) => (
                  <View key={ml} style={styles.quickBtnOuter}>
                    <DepthStack
                      radius={16}
                      layers={[
                        { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.45)" },
                        { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.28)" },
                      ]}
                    />

                    <TouchableOpacity
                      style={{ borderRadius: 16 }}
                      onPress={() => handleAdd(ml)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={["#132018", "#070D09"]}
                        start={{ x: 0.15, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={[
                          styles.quickBtnInner,
                          saving && styles.quickBtnDisabled,
                        ]}
                      >
                        <ShadowOverlay opacity={0.25} />
                        <Image
                          source={ICONS.airTracker}
                          style={styles.quickBtnImg}
                          resizeMode="contain"
                        />
                        <Text style={styles.quickBtnLabel}>{ml} ml</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </Card3D>

            {}
            <Card3D>
              <View style={styles.sectionHead}>
                <IconBox emoji="📋" colors={["#4ADE80", "#15803D"]} />
                <Text style={styles.sectionTitle}>Log Hari Ini</Text>
              </View>
              {loading && !data ? (
                <ActivityIndicator
                  size="small"
                  color="#4ADE80"
                  style={{ marginVertical: 12 }}
                />
              ) : logs.length === 0 ? (
                <Text style={styles.empty}>Belum ada input air hari ini</Text>
              ) : (
                logs.map((log, i) => (
                  <View key={log.id || i} style={styles.logRow}>
                    <Text style={styles.logTime}>
                      {log.waktu_input || "--:--"}
                    </Text>
                    <Text style={styles.logMl}>{log.ml} ml</Text>
                  </View>
                ))
              )}
            </Card3D>
          </>
        )}
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
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    fontSize: 20,
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
  mainInner: { alignItems: "center" },
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
  ringWrap: {
    marginVertical: 14,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: { position: "absolute" },
  ringCenterAbs: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  circleNum: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },
  circleUnit: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    marginTop: -2,
  },
  circlePct: {
    fontSize: 13.5,
    color: "#4ADE80",
    fontWeight: "800",
    marginTop: 4,
  },

  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 6,
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#4ADE80" },

  statsRow: { flexDirection: "row", width: "100%", marginTop: 10 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 15.5, fontWeight: "900" },
  statLbl: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
    fontWeight: "700",
  },

  botolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },

  successBanner: {
    marginTop: 16,
    backgroundColor: "rgba(74,222,128,0.12)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  successText: { color: "#4ADE80", fontWeight: "800", fontSize: 14 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },

  quickRow: { flexDirection: "row", gap: 10 },
  quickBtnOuter: { flex: 1, position: "relative", borderRadius: 16 },
  quickBtnInner: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "rgba(255,255,255,0.12)",
    borderRightColor: "rgba(0,0,0,0.5)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  quickBtnDisabled: { opacity: 0.5 },
  quickBtnImg: { width: 28, height: 28, marginBottom: 6 },
  quickBtnLabel: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },

  empty: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 12.5,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  logTime: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  logMl: { fontSize: 14, fontWeight: "800", color: "#60A5FA" },
});
