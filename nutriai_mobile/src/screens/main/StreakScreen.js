import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { ICONS } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { getLaporan } from "../../services/LaporanService";
import { getStreak } from "../../services/StreakService";
import { Spacing } from "../../theme";
import { formatDate } from "../../utils";
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
function IconBox({ emoji, size = 40, colors }) {
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
        <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
      </LinearGradient>
    </View>
  );
}

function buildCalendar(laporan = []) {
  const logDates = new Set(
    laporan.map((l) => new Date(l.tanggal).toISOString().split("T")[0]),
  );
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    days.push({
      iso,
      day: d.getDate(),
      weekday: d.getDay(),
      hasLog: logDates.has(iso),
      isToday: i === 0,
    });
  }
  return days;
}

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function StreakScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: streak,
    loading: sLoading,
    execute: loadStreak,
  } = useApi(getStreak);
  const {
    data: lapData,
    loading: lLoading,
    execute: loadLaporan,
  } = useApi(() => getLaporan(1, 90));

  useRefreshOnFocus(
    useCallback(async () => {
      await Promise.all([loadStreak(), loadLaporan()]);
    }, [loadStreak, loadLaporan]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStreak(), loadLaporan()]).catch(() => {});
    setRefreshing(false);
  }, [loadStreak, loadLaporan]);

  const loading = sLoading || lLoading;
  const current = streak?.current || 0;
  const longest = streak?.longest || 0;
  const lastInput = streak?.last_input;
  const calendar = buildCalendar(lapData?.laporan || []);
  const getMessage = () => {
    if (current === 0)
      return {
        text: "Mulai streak hari ini! 💪",
        color: "rgba(255,255,255,0.55)",
      };
    if (current < 3)
      return { text: "Awal yang bagus! Pertahankan 🌱", color: "#4ADE80" };
    if (current < 7)
      return { text: "Konsisten sekali! Terus! 🔥", color: "#FB923C" };
    if (current < 14)
      return { text: "Luar biasa! Satu minggu lebih! 🏆", color: "#4ADE80" };
    return {
      text: `${current} hari berturut-turut! Kamu juara! 🥇`,
      color: "#F87171",
    };
  };

  const msg = getMessage();

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
              source={ICONS.streakTitle}
              style={styles.titleIconImg}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        <View style={styles.titleStack}>
          <Text style={styles.titleShadow}>Streak</Text>
          <Text style={styles.title}>Streak</Text>
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
        {loading && !streak ? (
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
              contentStyle={styles.heroInner}
            >
              <View style={styles.flameWrap}>
                <Text
                  style={[styles.flameBig, current === 0 && styles.flameOff]}
                >
                  🔥
                </Text>
                <Text
                  style={[
                    styles.streakNum,
                    {
                      color: current > 0 ? "#FB923C" : "rgba(255,255,255,0.35)",
                    },
                  ]}
                >
                  {current}
                </Text>
                <Text style={styles.streakLabel}>hari berturut-turut</Text>
              </View>
              <Text style={[styles.message, { color: msg.color }]}>
                {msg.text}
              </Text>
            </Card3D>

            {}
            <View style={styles.statsRow}>
              <Card3D
                style={styles.statCardOuter}
                radius={18}
                contentStyle={[
                  styles.statCardInner,
                  { borderColor: "rgba(251,146,60,0.4)" },
                ]}
              >
                <IconBox emoji="🔥" colors={["#FB923C", "#9A3412"]} />
                <Text style={[styles.statVal, { color: "#FB923C" }]}>
                  {current}
                </Text>
                <Text style={styles.statLbl}>Streak Aktif</Text>
              </Card3D>
              <Card3D
                style={styles.statCardOuter}
                radius={18}
                contentStyle={[
                  styles.statCardInner,
                  { borderColor: "rgba(74,222,128,0.4)" },
                ]}
              >
                <IconBox emoji="📈" colors={["#4ADE80", "#15803D"]} />
                <Text style={[styles.statVal, { color: "#4ADE80" }]}>
                  {longest}
                </Text>
                <Text style={styles.statLbl}>Terpanjang</Text>
              </Card3D>
              <Card3D
                style={styles.statCardOuter}
                radius={18}
                contentStyle={[
                  styles.statCardInner,
                  { borderColor: "rgba(96,165,250,0.4)" },
                ]}
              >
                <IconBox emoji="📅" colors={["#60A5FA", "#1D4ED8"]} />
                <Text
                  style={[styles.statVal, { color: "#60A5FA" }]}
                  numberOfLines={1}
                >
                  {lastInput ? formatDate(lastInput, "short") : "-"}
                </Text>
                <Text style={styles.statLbl}>Input Terakhir</Text>
              </Card3D>
            </View>

            {}
            <Card3D style={{ marginBottom: 16 }}>
              <View style={styles.calHeader}>
                <IconBox emoji="📅" size={32} colors={["#4ADE80", "#15803D"]} />
                <Text style={styles.calTitle}>Aktivitas 35 Hari Terakhir</Text>
              </View>

              {}
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((d) => (
                  <Text key={d} style={styles.weekLabel}>
                    {d}
                  </Text>
                ))}
              </View>

              {}
              <View style={styles.calGrid}>
                {}
                {Array.from({ length: calendar[0]?.weekday || 0 }).map(
                  (_, i) => (
                    <View key={`off_${i}`} style={styles.calCell} />
                  ),
                )}
                {}
                {calendar.map((d) => (
                  <View key={d.iso} style={styles.calCell}>
                    <View
                      style={[
                        styles.calDayWrap,
                        d.hasLog && styles.calDayWrapActive,
                        d.isToday && !d.hasLog && styles.calDayWrapToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDay,
                          d.hasLog && styles.calDayActive,
                          d.isToday && !d.hasLog && styles.calDayToday,
                        ]}
                      >
                        {d.day}
                      </Text>
                    </View>
                    {d.hasLog && <View style={styles.calDot} />}
                  </View>
                ))}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#4ADE80" }]}
                  />
                  <Text style={styles.legendText}>Ada laporan</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: "rgba(255,255,255,0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.2)",
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>Tidak ada</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        borderWidth: 2,
                        borderColor: "#FB923C",
                        backgroundColor: "transparent",
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>Hari ini</Text>
                </View>
              </View>
            </Card3D>

            {}
            <Card3D>
              <Text style={styles.tipsTitle}>💡 Tips Pertahankan Streak</Text>
              {[
                "Buat laporan setiap hari sebelum tidur",
                "Gunakan meal template untuk input cepat",
                "Aktifkan notifikasi pengingat (coming soon)",
                "Streak terhitung dari laporan harian, bukan input saja",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
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
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    fontSize: 22,
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
  heroInner: { alignItems: "center", paddingVertical: 26 },
  flameWrap: { alignItems: "center", marginBottom: 10 },
  flameBig: { fontSize: 64, marginBottom: 2 },
  flameOff: { opacity: 0.25 },
  streakNum: { fontSize: 54, fontWeight: "900", lineHeight: 58 },
  streakLabel: {
    fontSize: 13.5,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCardOuter: { flex: 1 },
  statCardInner: {
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  statVal: { fontSize: 17, fontWeight: "900" },
  statLbl: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
    textAlign: "center",
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  calTitle: { fontSize: 15.5, fontWeight: "800", color: "#FFFFFF", flex: 1 },

  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: "800",
    color: "#4ADE80",
  },

  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  calDayWrapActive: {
    borderColor: "#4ADE80",
    backgroundColor: "rgba(74,222,128,0.08)",
  },
  calDayWrapToday: {
    borderColor: "#FB923C",
    backgroundColor: "rgba(251,146,60,0.08)",
  },
  calDay: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  calDayActive: { color: "#4ADE80", fontWeight: "800" },
  calDayToday: { color: "#FB923C", fontWeight: "800" },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4ADE80",
    marginTop: 2,
  },

  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 11, color: "rgba(255,255,255,0.5)" },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 9 },
  tipDot: { fontSize: 14, color: "#4ADE80", marginTop: 1 },
  tipText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.6)",
    flex: 1,
    lineHeight: 19,
  },
});
