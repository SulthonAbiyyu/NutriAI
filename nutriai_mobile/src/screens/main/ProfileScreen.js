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
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { ICONS } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { getProfile } from "../../services/ProfileService";
import { Spacing } from "../../theme";
import { getBmiStatus, getTujuanConfig } from "../../utils";

const LABEL = {
  aktivitas: {
    sangat_tidak_aktif: "Sangat Tidak Aktif",
    aktivitas_ringan: "Aktif Ringan",
    aktivitas_sedang: "Aktif Sedang",
    aktivitas_berat: "Aktif Berat",
  },
  tipe_tubuh: {
    ectomorph: "Ectomorph 🏃",
    mesomorph: "Mesomorph 💪",
    endomorph: "Endomorph 🏋️",
  },
  gender: { laki_laki: "Laki-laki", perempuan: "Perempuan" },
};
function stripIcons(str) {
  return String(str || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "")
    .trim();
}
const SCREEN_BG = "#050A06";
const CARD_BG_TOP = "#0B120D";
const CARD_BG_MID = "#060A07";
const CARD_BG_BOTTOM = "#020403";
const CARD_BORDER_TL = "rgba(255,255,255,0.10)";
const CARD_BORDER_BR = "rgba(0,0,0,0.55)";
const ACCENT_GREEN = "#3DFF8F";
const SUB_GREEN = "#8FE3A8";
const TEXT_WHITE = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const HUE = {
  green: {
    top: "#173C22",
    bottom: "#0A1A0E",
    accent: "#4CC584",
    shadow: "rgba(20,120,60,0.45)",
  },
  blue: {
    top: "#123A5C",
    bottom: "#081826",
    accent: "#5EA3FF",
    shadow: "rgba(20,80,150,0.45)",
  },
  purple: {
    top: "#3A1F5C",
    bottom: "#180A26",
    accent: "#B98CFF",
    shadow: "rgba(80,30,140,0.45)",
  },
  orange: {
    top: "#5C3D12",
    bottom: "#2A1B08",
    accent: "#FF9A3D",
    shadow: "rgba(150,80,20,0.45)",
  },
  red: {
    top: "#5C1F1F",
    bottom: "#280D0D",
    accent: "#FF7A7A",
    shadow: "rgba(150,30,30,0.45)",
  },
  amber: {
    top: "#5C3D12",
    bottom: "#2A1B08",
    accent: "#FFC24B",
    shadow: "rgba(150,110,20,0.45)",
  },
  grey: {
    top: "#1B241C",
    bottom: "#0A0F0B",
    accent: "rgba(255,255,255,0.6)",
    shadow: "rgba(0,0,0,0.5)",
  },
};
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
const DEPTH_LAYERS = [
  { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
  { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
  { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
  { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
];

const CARD_DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = 18, layers = DEPTH_LAYERS }) {
  return (
    <>
      {layers.map((l, i) => (
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

const NOISE_DOTS = Array.from({ length: 40 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.5,
  o: 0.03 + Math.random() * 0.05,
  dark: Math.random() > 0.55,
}));

function Texture({ opacity = 1 }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
    >
      {NOISE_DOTS.map((d, i) => (
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
function IconBox3D({ icon, size = 44 }) {
  return (
    <Image
      source={icon}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
function SectionCard3D({ icon, title, children, style }) {
  return (
    <View style={[styles.sectionOuter, style]}>
      <DepthStack radius={20} layers={CARD_DEPTH_LAYERS} />
      <LinearGradient
        colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.sectionInner}
      >
        <ShadowOverlay opacity={0.22} />
        <Texture opacity={0.55} />
        <Text style={styles.sectionLeaf}>🌿</Text>
        {title && (
          <View style={styles.sectionHeaderRow}>
            <IconBox3D icon={icon} size={32} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        {children}
      </LinearGradient>
    </View>
  );
}

function InfoRow3D({ icon, hue, label, value, isLast }) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <IconBox3D icon={icon} size={38} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function MenuRow3D({
  icon,
  hue,
  label,
  sub,
  onPress,
  danger,
  rightBadge,
  isLast,
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconBox3D icon={icon} size={42} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.menuLabel, danger && { color: HUE.red.accent }]}>
          {label}
        </Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      {rightBadge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{rightBadge}</Text>
        </View>
      ) : null}
      <Text style={[styles.menuArrow, danger && { color: HUE.red.accent }]}>
        ›
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: user, loading, execute } = useApi(getProfile);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: signOut },
    ]);
  };

  if (loading && !user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT_GREEN} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={execute}>
          <Text style={{ color: ACCENT_GREEN, fontWeight: "700" }}>
            Tap untuk retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tujuan = getTujuanConfig(user.tujuan);
  const bmiInfo = getBmiStatus(user.bmi);

  const bmiDesc =
    user.bmi < 18.5
      ? "Perlu tambah berat badan"
      : user.bmi < 25
        ? "Berat badan ideal"
        : user.bmi < 30
          ? "Sedikit berlebih"
          : "Perlu turunkan berat badan";
  const bmiIsNormal = user.bmi >= 18.5 && user.bmi < 25;
  const RING_R = 30;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const bmiPct = Math.min(Math.max((user.bmi - 15) / (35 - 15), 0), 1);

  const STATS = [
    {
      icon: ICONS.beratbadan,
      label: "Berat",
      val: `${user.bb} kg`,
      hue: HUE.green,
    },
    {
      icon: ICONS.tinggibadan,
      label: "Tinggi",
      val: `${user.tb} cm`,
      hue: HUE.blue,
    },
    {
      icon: ICONS.umur,
      label: "Umur",
      val: `${user.umur} thn`,
      hue: HUE.purple,
    },
    { icon: ICONS.bmr, label: "BMR", val: `${user.bmr}`, hue: HUE.orange },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconOuter}>
            <DepthStack radius={14} />
            <LinearGradient
              colors={["#173C22", "#050B06"]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.titleIconInner}
            >
              <ShadowOverlay opacity={0.28} />
              <Texture opacity={0.6} />
              <Image
                source={ICONS.profile}
                style={styles.titleIconImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <View style={styles.titleStack}>
            <Text style={styles.titleShadow}>Profile</Text>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          Kelola data diri &amp; pantau progresmu
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ACCENT_GREEN]}
            tintColor={ACCENT_GREEN}
          />
        }
      >
        {}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("EditProfile", { user })}
        >
          <View style={styles.heroOuter}>
            <DepthStack radius={22} layers={CARD_DEPTH_LAYERS} />
            <LinearGradient
              colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={styles.heroInner}
            >
              <ShadowOverlay opacity={0.24} />
              <Texture opacity={0.7} />

              <View style={styles.heroTop}>
                <View style={styles.avatarOuter}>
                  <DepthStack radius={32} />
                  <LinearGradient
                    colors={["#BFF2CE", "#7FD99A"]}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.avatarInner}
                  >
                    <ShadowOverlay opacity={0.1} />
                    <Text style={styles.avatarText}>
                      {user.username[0].toUpperCase()}
                    </Text>
                  </LinearGradient>

                  <View style={styles.avatarEditBadge}>
                    <DepthStack radius={12} />
                    <LinearGradient
                      colors={["#0E7A3B", "#4CC584"]}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={styles.avatarEditInner}
                    >
                      <Text style={styles.avatarEditIcon}>✏️</Text>
                    </LinearGradient>
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {user.username}
                  </Text>

                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: "rgba(79,143,82,0.18)",
                        borderColor: "rgba(79,143,82,0.45)",
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: SUB_GREEN }]}>
                      {stripIcons(tujuan.label)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: "rgba(94,163,255,0.15)",
                        borderColor: "rgba(94,163,255,0.4)",
                        marginTop: 6,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: HUE.blue.accent }]}>
                      {stripIcons(
                        LABEL.tipe_tubuh[user.tipe_tubuh] || user.tipe_tubuh,
                      )}
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroChevron}>›</Text>
              </View>

              {}
              <View style={styles.bmiOuter}>
                <DepthStack radius={18} layers={CARD_DEPTH_LAYERS} />
                <LinearGradient
                  colors={["#0E1A11", "#050A06"]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.bmiInner}
                >
                  <ShadowOverlay opacity={0.2} />
                  <Texture opacity={0.45} />

                  <View style={styles.bmiRingWrap}>
                    <Svg width={72} height={72}>
                      <Circle
                        cx={36}
                        cy={36}
                        r={RING_R}
                        stroke="rgba(255,255,255,0.10)"
                        strokeWidth={7}
                        fill="none"
                      />
                      <Circle
                        cx={36}
                        cy={36}
                        r={RING_R}
                        stroke={bmiInfo.color}
                        strokeWidth={7}
                        fill="none"
                        strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                        strokeDashoffset={RING_CIRC - RING_CIRC * bmiPct}
                        strokeLinecap="round"
                        rotation={-90}
                        origin="36, 36"
                      />
                    </Svg>
                    <View style={styles.bmiRingTextWrap} pointerEvents="none">
                      <Text style={styles.bmiValText}>{user.bmi}</Text>
                      <Text style={styles.bmiUnitText}>BMI</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 58 }}>
                    <View style={styles.bmiStatusRow}>
                      <Text
                        style={[styles.bmiStatusText, { color: bmiInfo.color }]}
                      >
                        {stripIcons(bmiInfo.label)}
                      </Text>
                      <Text
                        style={[
                          styles.bmiCheckIcon,
                          { color: bmiIsNormal ? bmiInfo.color : undefined },
                        ]}
                      >
                        {bmiIsNormal ? "✓" : "⚠️"}
                      </Text>
                    </View>
                    <Text style={styles.bmiDescText} numberOfLines={1}>
                      {bmiDesc}
                    </Text>
                    <Text style={styles.bmiTdeeText}>
                      TDEE: {user.tdee} kcal/hari
                    </Text>
                  </View>

                  <Image
                    source={ICONS.timbangan}
                    style={styles.bmiScaleImg}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View
              key={s.label}
              style={[styles.statOuter, { shadowColor: s.hue.shadow }]}
            >
              <DepthStack radius={16} layers={CARD_DEPTH_LAYERS} />
              <LinearGradient
                colors={[s.hue.top, s.hue.bottom]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={[
                  styles.statInner,
                  {
                    borderTopColor: "rgba(255,255,255,0.30)",
                    borderLeftColor: "rgba(255,255,255,0.30)",
                    borderRightColor: "rgba(0,0,0,0.28)",
                    borderBottomColor: "rgba(0,0,0,0.35)",
                  },
                ]}
              >
                <ShadowOverlay opacity={0.28} />
                <Texture opacity={0.6} />
                <Image
                  source={s.icon}
                  style={styles.statIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.statVal, { color: s.hue.accent }]}>
                  {s.val}
                </Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {}
        <SectionCard3D icon={ICONS.datadiri} title="DATA DIRI">
          <InfoRow3D
            icon={ICONS.gender}
            hue={HUE.green}
            label="Gender"
            value={LABEL.gender[user.gender] || user.gender}
          />
          <InfoRow3D
            icon={ICONS.aktifitas}
            hue={HUE.green}
            label="Aktivitas"
            value={LABEL.aktivitas[user.aktivitas] || user.aktivitas}
          />
          <InfoRow3D
            icon={ICONS.tujuan}
            hue={HUE.green}
            label="Tujuan"
            value={user.tujuan.charAt(0).toUpperCase() + user.tujuan.slice(1)}
          />
          <InfoRow3D
            icon={ICONS.tdee}
            hue={HUE.red}
            label="TDEE"
            value={`${user.tdee} kcal / hari`}
            isLast
          />
        </SectionCard3D>

        {}
        <SectionCard3D icon={ICONS.tracking} title="TRACKING">
          <MenuRow3D
            icon={ICONS.weighttracker}
            hue={HUE.green}
            label="Weight Tracker"
            sub="Pantau perubahan berat badan"
            onPress={() => navigation.navigate("WeightTracker")}
          />
          <MenuRow3D
            icon={ICONS.watertracker}
            hue={HUE.blue}
            label="Water Tracker"
            sub="Target minum harian"
            onPress={() => navigation.navigate("WaterTracker")}
          />
          <MenuRow3D
            icon={ICONS.streak}
            hue={HUE.orange}
            label="Streak"
            sub="Konsistensi adalah kunci"
            onPress={() => navigation.navigate("Streak")}
          />
          <MenuRow3D
            icon={ICONS.mealtemplate}
            hue={HUE.purple}
            label="Meal Templates"
            sub="Preset kombinasi makanan"
            onPress={() => navigation.navigate("MealTemplates")}
          />
          <MenuRow3D
            icon={ICONS.chatai}
            hue={HUE.blue}
            label="Chat NutriAI"
            sub="Tanya soal nutrisi & diet"
            onPress={() => navigation.navigate("AiChat")}
            isLast
          />
        </SectionCard3D>

        {}
        <SectionCard3D icon={ICONS.pengaturan} title="PENGATURAN">
          <MenuRow3D
            icon={ICONS.editprofile}
            hue={HUE.grey}
            label="Edit Profil"
            sub="Ubah data fisik & tujuan"
            onPress={() => navigation.navigate("EditProfile", { user })}
          />
          <MenuRow3D
            icon={ICONS.gantipassword}
            hue={HUE.grey}
            label="Ganti Password"
            sub="Ubah password akun"
            onPress={() =>
              navigation.navigate("EditProfile", { user, tab: "password" })
            }
            isLast
          />
        </SectionCard3D>

        {}
        <SectionCard3D>
          <MenuRow3D
            icon={ICONS.logout}
            hue={HUE.red}
            label="Logout"
            onPress={handleLogout}
            danger
            isLast
          />
        </SectionCard3D>

        {}
        <Text style={styles.version}>NutriAI v1.0.0</Text>
      </ScrollView>

      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.navigate("Dashboard")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BG },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  content: { paddingHorizontal: Spacing.md || 16, paddingTop: 2 },
  header: {
    paddingHorizontal: Spacing.md || 16,
    paddingBottom: 14,
    paddingTop: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: TEXT_WHITE,
    textShadowColor: "rgba(61,255,143,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: "600",
    color: SUB_GREEN,
    marginTop: 8,
    marginLeft: 2,
  },
  heroOuter: {
    borderRadius: 22,
    position: "relative",
    marginBottom: 14,
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 4, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 9,
  },
  heroInner: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    padding: 16,
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },

  avatarOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: "relative",
  },
  avatarInner: {
    flex: 1,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.5)",
    borderLeftColor: "rgba(255,255,255,0.5)",
    borderRightColor: "rgba(0,0,0,0.15)",
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#0E7A3B" },
  avatarEditBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarEditInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.3)",
  },
  avatarEditIcon: { fontSize: 10 },

  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  heroChevron: {
    fontSize: 26,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "300",
  },

  bmiOuter: {
    borderRadius: 18,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 3, height: 7 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bmiInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    padding: 12,
    overflow: "visible",
  },
  bmiRingWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  bmiRingTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bmiValText: { fontSize: 16, fontWeight: "900", color: TEXT_WHITE },
  bmiUnitText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  bmiStatusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  bmiStatusText: { fontSize: 15, fontWeight: "800" },
  bmiCheckIcon: { fontSize: 15, fontWeight: "900" },
  bmiDescText: { fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  bmiTdeeText: { fontSize: 10.5, color: TEXT_MUTED, marginTop: 4 },
  bmiScaleImg: {
    position: "absolute",
    top: -14,
    right: -6,
    width: 144,
    height: 124,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statOuter: {
    flex: 1,
    borderRadius: 16,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 4, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 7,
  },
  statInner: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  statIcon: { width: 32, height: 32, marginBottom: 2 },
  statVal: { fontSize: 13, fontWeight: "800" },
  statLbl: { fontSize: 9, color: TEXT_MUTED, marginTop: 1, fontWeight: "600" },
  sectionOuter: {
    borderRadius: 20,
    position: "relative",
    marginBottom: 14,
    shadowColor: "rgba(0,0,0,0.55)",
    shadowOffset: { width: 3, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 7,
  },
  sectionInner: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    padding: 14,
    overflow: "hidden",
  },
  sectionLeaf: {
    position: "absolute",
    top: 6,
    right: 10,
    fontSize: 30,
    opacity: 0.08,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: TEXT_WHITE,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  infoLabel: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.55)" },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_WHITE,
    maxWidth: "55%",
    textAlign: "right",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  menuLabel: { fontSize: 14, color: TEXT_WHITE, fontWeight: "700" },
  menuSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
  menuArrow: { fontSize: 20, color: "rgba(255,255,255,0.3)", marginLeft: 8 },
  menuBadge: {
    backgroundColor: HUE.red.accent,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  menuBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },

  version: {
    textAlign: "center",
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },
});
