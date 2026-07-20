import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { readAsStringAsync } from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import GoalCard from "../../components/common/GoalCard";
import GreetCard from "../../components/common/GreetCard";
import JarvisCard from "../../components/common/JarvisCard";
import JarvisTextInput from "../../components/common/JarvisTextInput";
import JarvisVoiceOverlay from "../../components/common/JarvisVoiceOverlay";
import NutrisiBox from "../../components/common/NutrisiBox";
import QuickAccessGrid from "../../components/common/QuickAccessGrid";
import api from "../../config/api";
import { BG_IMAGE, ROUTES } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { getDashboard } from "../../services/DashboardService";
const { width: SW } = Dimensions.get("window");
const PAD = 14;
const GAP = 8;
const AVAIL = SW - PAD * 2 - GAP;
const L = Math.floor(AVAIL * 0.535);
const R = Math.floor(AVAIL * 0.465);
const BG = "#F0F7F2";
const GREEN = "#22C55E";
const GREEN_DRK = "#16A34A";
const GREEN_LT = "#DCFCE7";
const GREEN_MNT = "#F0FDF4";
const GREEN_BRD = "#BBF7D0";
const AMBER = "#F59E0B";
const PURPLE = "#818CF8";
const WHITE = "#FFFFFF";
const TXT = "#081229";
const TXT_S = "#64748B";
const TXT_M = "#94A3B8";
const DANGER = "#EF4444";
const SHD_W = "rgba(15,23,42,0.08)";
const SHD_G = "rgba(34,197,94,0.25)";
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: 2,
    audioEncoder: 3,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    audioQuality: 127,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
};
const AUDIO_MIME = "audio/mp4";
const MAX_RECORD_MS = 60000;
const PROCESS_TIMEOUT_MS = 25000;
const JARVIS_HISTORY_KEY = "jarvis_chat_history_v1";
function NutritionCard({
  emoji,
  label,
  current,
  target,
  unit,
  barColors,
  bgColors,
  pctColor,
  style,
}) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[st.nutriCard, style]}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.nutriCardInner}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={st.nutriIconWrap}>
            <Text style={st.nutriIcon}>{emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.nutriLabel}>{label}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={st.nutriCur}>
                {current}
                {unit}
              </Text>
              <Text style={st.nutriTgt}>
                {" "}
                / {target}
                {unit}
              </Text>
            </View>
          </View>
          <Text style={[st.nutriPct, { color: pctColor }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
        <View style={st.nutriBarBg}>
          <Animated.View
            style={{ overflow: "hidden", borderRadius: 999, flex: 1 }}
          >
            <Animated.View
              style={[
                st.nutriBarFill,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={barColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 999 }}
              />
            </Animated.View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}
function shadeColor(hex, amount = 0.55) {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const r = Math.round(((num >> 16) & 255) * amount);
  const g = Math.round(((num >> 8) & 255) * amount);
  const b = Math.round((num & 255) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}
const RES_CARD_TOP = "#122217";
const RES_CARD_MID = "#0A160C";
const RES_CARD_BOTTOM = "#050C06";

function ResShadowOverlay({ opacity = 0.28 }) {
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

const RES_DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.15)" },
];

function ResDepthStack({ radius = 20, layers = RES_DEPTH_LAYERS }) {
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

const RES_NOISE_DOTS = Array.from({ length: 36 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.5,
  o: 0.03 + Math.random() * 0.05,
  dark: Math.random() > 0.55,
}));

function ResTexture({ opacity = 1 }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
    >
      {RES_NOISE_DOTS.map((d, i) => (
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
function ResultModal({
  visible,
  intent,
  reply,
  result,
  onClose,
  onRefresh,
  onRevise,
  onAddMissing,
}) {
  const ICONS = {
    add_food: "🍽",
    tambah_data: "➕",
    use_template: "📋",
    delete_food: "🗑",
    check_today: "📋",
    check_nutrition: "📊",
    check_laporan: "📈",
    add_water: "💧",
    check_water: "💧",
    add_weight: "⚖️",
    check_weight: "⚖️",
    meal_suggestion: "🥗",
    analyze_nutrition: "🔬",
    general: "🤖",
    unclear: "🎤",
  };
  const INTENT_COLORS = {
    add_food: GREEN,
    tambah_data: "#10B981",
    delete_food: DANGER,
    add_water: "#38BDF8",
    check_water: "#38BDF8",
    use_template: "#8B5CF6",
    add_weight: AMBER,
    check_weight: AMBER,
    meal_suggestion: GREEN,
    analyze_nutrition: "#8B5CF6",
    check_nutrition: GREEN,
    check_today: GREEN,
    check_laporan: "#6366F1",
    general: TXT_S,
    unclear: AMBER,
  };

  const needsRefresh = [
    "add_food",
    "use_template",
    "delete_food",
    "add_water",
    "add_weight",
  ].includes(intent);
  const hasNotFound =
    intent === "add_food" && (result?.not_found?.length || 0) > 0;
  const intentColor = INTENT_COLORS[intent] || TXT_S;

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 130,
          friction: 9,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[st.resDialogWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <ResDepthStack radius={26} />
          <View style={st.resDialog}>
            <LinearGradient
              colors={[RES_CARD_TOP, RES_CARD_MID, RES_CARD_BOTTOM]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={st.resGlass}
            >
              <ResShadowOverlay opacity={0.24} />
              <ResTexture opacity={0.6} />

              {}
              <View style={st.resHeader}>
                <View style={st.resBadgeOuter}>
                  <ResDepthStack radius={16} />
                  <LinearGradient
                    colors={[intentColor, shadeColor(intentColor)]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={[
                      st.resBadge,
                      {
                        borderTopColor: "rgba(255,255,255,0.4)",
                        borderLeftColor: "rgba(255,255,255,0.4)",
                        borderRightColor: "rgba(0,0,0,0.3)",
                        borderBottomColor: "rgba(0,0,0,0.4)",
                      },
                    ]}
                  >
                    <ResShadowOverlay opacity={0.2} />
                    <Text style={st.resBadgeIcon}>{ICONS[intent] || "🎙"}</Text>
                  </LinearGradient>
                </View>
                <TouchableOpacity
                  style={st.resCloseBtn}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={st.resCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {}
              <View style={[st.resBubble, { borderLeftColor: intentColor }]}>
                <Text style={st.resReply}>{reply}</Text>
              </View>

              <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {intent === "add_food" && (
                  <View style={st.resBox}>
                    <ResShadowOverlay opacity={0.15} />
                    {result?.added?.length > 0 ? (
                      result.added.map((a, i) => (
                        <View key={i} style={st.resRow}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              flex: 1,
                            }}
                          >
                            <View style={st.resCheckBadge}>
                              <Text style={st.resCheckBadgeTxt}>✓</Text>
                            </View>
                            <Text style={st.resRowTxt}>
                              {a.nama} ×{a.porsi}{" "}
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.45)",
                                  fontSize: 12,
                                }}
                              >
                                ({a.waktu})
                              </Text>
                            </Text>
                          </View>
                          <Text
                            style={[
                              st.resRowMeta,
                              { color: "#4ADE80", fontWeight: "800" },
                            ]}
                          >
                            +{a.kalori} kcal
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text
                        style={[
                          st.resRowTxt,
                          { color: "rgba(255,255,255,0.5)" },
                        ]}
                      >
                        Tidak ada makanan yang berhasil dicatat.
                      </Text>
                    )}
                    {result?.not_found?.map((n, i) => (
                      <View
                        key={i}
                        style={[
                          st.resRow,
                          {
                            backgroundColor: "rgba(248,113,113,0.10)",
                            borderRadius: 10,
                            padding: 8,
                            marginTop: 4,
                          },
                        ]}
                      >
                        <Text style={[st.resRowTxt, { color: "#F87171" }]}>
                          ⚠️ "{n}" tidak ada di database
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {intent === "tambah_data" && result?.status === "added" && (
                  <View style={st.resBox}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View style={st.resCheckBadge}>
                        <Text style={st.resCheckBadgeTxt}>✓</Text>
                      </View>
                      <Text
                        style={[
                          st.resRowTxt,
                          { fontWeight: "800", color: "#4ADE80" },
                        ]}
                      >
                        {result.nama} ({result.gram_per_porsi}g/porsi)
                      </Text>
                    </View>
                    {[
                      ["Kalori", result.kalori, "kcal"],
                      ["Protein", result.protein, "g"],
                      ["Karbo", result.karbo, "g"],
                      ["Lemak", result.lemak, "g"],
                    ].map(([k, v, u]) => (
                      <View key={k} style={st.resRow}>
                        <Text style={st.resRowMeta}>{k}</Text>
                        <Text
                          style={[st.resRowTxt, { flex: 0, fontWeight: "700" }]}
                        >
                          {v}
                          {u}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {intent === "tambah_data" && result?.status === "duplicate" && (
                  <View
                    style={[
                      st.resBox,
                      {
                        backgroundColor: "rgba(251,191,36,0.10)",
                        borderColor: "rgba(251,191,36,0.35)",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={{ color: "#FCD34D", fontSize: 13 }}>
                      ⚠️ {result.nama} sudah ada — {result.kalori} kcal |{" "}
                      {result.protein}g protein
                    </Text>
                  </View>
                )}
                {intent === "tambah_data" && result?.status === "error" && (
                  <View
                    style={[
                      st.resBox,
                      {
                        backgroundColor: "rgba(248,113,113,0.10)",
                        borderColor: "rgba(248,113,113,0.35)",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={{ color: "#F87171", fontSize: 13 }}>
                      {result.error}
                    </Text>
                  </View>
                )}

                {intent === "use_template" && result?.status === "ok" && (
                  <View style={st.resBox}>
                    <Text
                      style={[
                        st.resRowTxt,
                        { color: "#4ADE80", fontWeight: "700" },
                      ]}
                    >
                      ✓ Template "{result.template_nama}" diterapkan
                    </Text>
                    <Text style={st.resRowMeta}>
                      {result.added} makanan ditambahkan untuk {result.waktu}
                    </Text>
                  </View>
                )}
                {intent === "use_template" &&
                  result?.status === "not_found" && (
                    <View
                      style={[
                        st.resBox,
                        {
                          backgroundColor: "rgba(251,191,36,0.10)",
                          borderColor: "rgba(251,191,36,0.35)",
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <Text style={{ color: "#FCD34D", fontSize: 13 }}>
                        ⚠️ Template tidak ditemukan
                      </Text>
                    </View>
                  )}

                {intent === "delete_food" && result?.status === "deleted" && (
                  <View style={st.resBox}>
                    <Text style={[st.resRowTxt, { color: "#F87171" }]}>
                      🗑 {result.nama} dihapus dari log hari ini
                    </Text>
                  </View>
                )}
                {intent === "delete_food" && result?.status === "not_found" && (
                  <View
                    style={[
                      st.resBox,
                      {
                        backgroundColor: "rgba(251,191,36,0.10)",
                        borderColor: "rgba(251,191,36,0.35)",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={{ color: "#FCD34D", fontSize: 13 }}>
                      ⚠️ Makanan tidak ditemukan di log hari ini
                    </Text>
                  </View>
                )}

                {intent === "add_water" && result && (
                  <View style={st.resBox}>
                    <View style={st.resRow}>
                      <Text style={st.resRowTxt}>💧 Ditambahkan</Text>
                      <Text
                        style={[
                          st.resRowMeta,
                          { color: "#60A5FA", fontWeight: "700" },
                        ]}
                      >
                        +{result.added_ml} ml
                      </Text>
                    </View>
                    <View style={st.resRow}>
                      <Text style={st.resRowMeta}>Total hari ini</Text>
                      <Text style={st.resRowMeta}>
                        {result.total_ml} / {result.target_ml} ml
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderRadius: 999,
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          backgroundColor: "#60A5FA",
                          borderRadius: 999,
                          width: `${Math.min((result.total_ml / result.target_ml) * 100, 100)}%`,
                        }}
                      />
                    </View>
                    {result.sisa_ml === 0 && (
                      <Text
                        style={{
                          color: "#4ADE80",
                          fontSize: 12,
                          fontWeight: "700",
                          marginTop: 6,
                          textAlign: "center",
                        }}
                      >
                        🎉 Target air tercapai!
                      </Text>
                    )}
                  </View>
                )}

                {intent === "check_water" && result && (
                  <View style={st.resBox}>
                    <View style={st.resRow}>
                      <Text style={st.resRowTxt}>💧 Total air hari ini</Text>
                      <Text style={[st.resRowMeta, { fontWeight: "700" }]}>
                        {result.total_ml} / {result.target_ml} ml
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderRadius: 999,
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          backgroundColor: "#60A5FA",
                          borderRadius: 999,
                          width: `${result.progress}%`,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        marginTop: 4,
                        textAlign: "right",
                      }}
                    >
                      {result.progress}%
                    </Text>
                  </View>
                )}

                {intent === "add_weight" && result?.status === "saved" && (
                  <View style={st.resBox}>
                    <Text
                      style={[
                        st.resRowTxt,
                        { color: "#4ADE80", fontWeight: "700" },
                      ]}
                    >
                      ⚖️ Berat badan {result.berat} kg berhasil dicatat
                    </Text>
                  </View>
                )}
                {intent === "add_weight" && result?.status === "error" && (
                  <View
                    style={[
                      st.resBox,
                      {
                        backgroundColor: "rgba(248,113,113,0.10)",
                        borderColor: "rgba(248,113,113,0.35)",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={{ color: "#F87171", fontSize: 13 }}>
                      {result.error}
                    </Text>
                  </View>
                )}

                {intent === "check_weight" && result?.berat && (
                  <View style={st.resBox}>
                    <View style={st.resRow}>
                      <Text style={st.resRowTxt}>⚖️ Berat terakhir</Text>
                      <Text style={[st.resRowMeta, { fontWeight: "700" }]}>
                        {result.berat} kg
                      </Text>
                    </View>
                    <Text style={[st.resRowMeta, { marginBottom: 4 }]}>
                      {result.tanggal}
                    </Text>
                    {result.perubahan !== 0 && (
                      <View style={st.resRow}>
                        <Text style={st.resRowMeta}>Perubahan</Text>
                        <Text
                          style={[
                            st.resRowMeta,
                            {
                              color:
                                result.perubahan < 0 ? "#4ADE80" : "#F87171",
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {result.perubahan > 0 ? "+" : ""}
                          {result.perubahan} kg
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {intent === "check_today" && (
                  <View style={st.resBox}>
                    {result?.entries?.length > 0 ? (
                      result.entries.map((e, i) => (
                        <View key={i} style={st.resRow}>
                          <Text style={st.resRowTxt}>
                            • {e.nama}{" "}
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                fontSize: 11,
                              }}
                            >
                              ({e.waktu})
                            </Text>
                          </Text>
                          <Text style={[st.resRowMeta, { fontWeight: "600" }]}>
                            {e.kalori} kcal
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text
                        style={[
                          st.resRowTxt,
                          {
                            color: "rgba(255,255,255,0.5)",
                            textAlign: "center",
                          },
                        ]}
                      >
                        Belum ada makanan hari ini 🥄
                      </Text>
                    )}
                    {result?.entries?.length > 0 && (
                      <View
                        style={[
                          st.resRow,
                          {
                            marginTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: "rgba(255,255,255,0.08)",
                            paddingTop: 8,
                          },
                        ]}
                      >
                        <Text style={[st.resRowTxt, { fontWeight: "800" }]}>
                          Total
                        </Text>
                        <Text
                          style={[
                            st.resRowMeta,
                            { fontWeight: "800", color: "#4ADE80" },
                          ]}
                        >
                          {result.total_kalori} kcal · {result.total_protein}g P
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {intent === "check_nutrition" && result && (
                  <View style={st.resBox}>
                    {[
                      [
                        "Kalori",
                        result.total_kalori,
                        result.target_kalori,
                        "kcal",
                        "#4ADE80",
                      ],
                      [
                        "Protein",
                        result.total_protein,
                        result.target_protein,
                        "g",
                        "#60A5FA",
                      ],
                    ].map(([k, cur, tgt, u, c]) => (
                      <View key={k} style={{ marginBottom: 10 }}>
                        <View style={st.resRow}>
                          <Text style={st.resRowTxt}>{k}</Text>
                          <Text
                            style={[
                              st.resRowMeta,
                              { fontWeight: "700", color: c },
                            ]}
                          >
                            {cur}
                            {u}{" "}
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                fontWeight: "400",
                              }}
                            >
                              / {tgt}
                              {u}
                            </Text>
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 7,
                            backgroundColor: "rgba(255,255,255,0.08)",
                            borderRadius: 999,
                            marginTop: 4,
                          }}
                        >
                          <View
                            style={{
                              height: 7,
                              backgroundColor: c,
                              borderRadius: 999,
                              width: `${Math.min((cur / Math.max(tgt, 1)) * 100, 100)}%`,
                            }}
                          />
                        </View>
                      </View>
                    ))}
                    {result.streak?.current > 0 && (
                      <Text
                        style={[
                          st.resRowMeta,
                          {
                            marginTop: 2,
                            textAlign: "center",
                            fontWeight: "600",
                          },
                        ]}
                      >
                        🔥 Streak {result.streak.current} hari berturut-turut
                      </Text>
                    )}
                  </View>
                )}

                {intent === "check_laporan" && result?.per_hari?.length > 0 && (
                  <View style={st.resBox}>
                    <Text
                      style={[
                        st.resRowMeta,
                        { marginBottom: 8, textAlign: "center" },
                      ]}
                    >
                      {result.since} – {result.until} ({result.total_hari} hari)
                    </Text>
                    {result.per_hari.map((h, i) => (
                      <View key={i} style={st.resRow}>
                        <Text style={st.resRowTxt}>{h.tanggal}</Text>
                        <Text style={st.resRowMeta}>
                          {h.kalori} kcal · {h.protein}g P
                        </Text>
                      </View>
                    ))}
                    <View
                      style={[
                        st.resRow,
                        {
                          marginTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: "rgba(255,255,255,0.08)",
                          paddingTop: 8,
                        },
                      ]}
                    >
                      <Text style={[st.resRowTxt, { fontWeight: "800" }]}>
                        Rata-rata
                      </Text>
                      <Text
                        style={[
                          st.resRowMeta,
                          { fontWeight: "800", color: "#4ADE80" },
                        ]}
                      >
                        {result.avg_kalori} kcal · {result.avg_protein}g P
                      </Text>
                    </View>
                  </View>
                )}
                {intent === "check_laporan" &&
                  (!result?.per_hari || result.per_hari.length === 0) && (
                    <View
                      style={[
                        st.resBox,
                        {
                          backgroundColor: "rgba(251,191,36,0.10)",
                          borderColor: "rgba(251,191,36,0.35)",
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#FCD34D",
                          fontSize: 13,
                          textAlign: "center",
                        }}
                      >
                        Belum ada data makanan untuk periode ini.
                      </Text>
                    </View>
                  )}

                {["meal_suggestion", "analyze_nutrition", "general"].includes(
                  intent,
                ) &&
                  result?.answer && (
                    <View style={st.resBox}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#FFFFFF",
                          lineHeight: 21,
                        }}
                      >
                        {result.answer}
                      </Text>
                    </View>
                  )}

                {intent === "unclear" && (
                  <View
                    style={[
                      st.resBox,
                      {
                        backgroundColor: "rgba(251,191,36,0.10)",
                        borderColor: "rgba(251,191,36,0.35)",
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#FCD34D",
                        fontSize: 13,
                        lineHeight: 20,
                        textAlign: "center",
                      }}
                    >
                      🎤 Coba ulangi — bicara lebih dekat, jelas, dan tidak
                      terlalu cepat.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {}
              <View style={st.resBtnRow}>
                {hasNotFound ? (
                  <View style={st.btnPriOuter}>
                    <ResDepthStack radius={24} />
                    <TouchableOpacity
                      onPress={() => {
                        handleClose();
                        onAddMissing(result.not_found);
                      }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={["#4ADE80", "#15803D"]}
                        start={{ x: 0.15, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={st.btnPri}
                      >
                        <ResShadowOverlay opacity={0.22} />
                        <Text style={st.btnPriTxt}>Tambahkan Datanya</Text>
                        <View style={st.btnPriArrow}>
                          <Text style={st.btnPriArrowTxt}>+</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  needsRefresh && (
                    <View style={st.btnPriOuter}>
                      <ResDepthStack radius={24} />
                      <TouchableOpacity
                        onPress={() => {
                          onRefresh();
                          handleClose();
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={["#4ADE80", "#15803D"]}
                          start={{ x: 0.15, y: 0 }}
                          end={{ x: 0.9, y: 1 }}
                          style={st.btnPri}
                        >
                          <ResShadowOverlay opacity={0.22} />
                          <Text style={st.btnPriTxt}>Lihat Dashboard</Text>
                          <View style={st.btnPriArrow}>
                            <Text style={st.btnPriArrowTxt}>→</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )
                )}
                <View style={st.btnSecOuter}>
                  <ResDepthStack
                    radius={24}
                    layers={[
                      { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.4)" },
                      { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.25)" },
                    ]}
                  />
                  <TouchableOpacity
                    style={st.btnSec}
                    onPress={() => {
                      handleClose();
                      onRevise();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={st.btnSecTxt}>🎙 Revisi</Text>
                  </TouchableOpacity>
                </View>
                <View style={[st.btnSecOuter, { flex: 0 }]}>
                  <ResDepthStack
                    radius={24}
                    layers={[
                      { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.4)" },
                      { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.25)" },
                    ]}
                  />
                  <TouchableOpacity
                    style={[st.btnSec, { paddingHorizontal: 16 }]}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Text style={st.btnSecTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
function meteringToLevel(db) {
  if (typeof db !== "number" || !isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}
function useMicRecorder({ onResult, onRefresh }) {
  const [micStatus, setMicStatus] = useState("idle");
  const [micLevel, setMicLevel] = useState(0);
  const recRef = useRef(null);
  const busyRef = useRef(false);
  const recTimerRef = useRef(null);
  const stopRef = useRef(null);
  const abortRef = useRef(null);
  const historyRef = useRef([]);
  const persistHistory = useCallback(() => {
    AsyncStorage.setItem(
      JARVIS_HISTORY_KEY,
      JSON.stringify(historyRef.current),
    ).catch((e) => {
      console.warn("[Mic] Gagal simpan history:", e);
    });
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(JARVIS_HISTORY_KEY);
        if (raw) historyRef.current = JSON.parse(raw);
      } catch (e) {
        console.warn("[Mic] Gagal load history:", e);
      }
    })();
  }, []);

  const clearRecordTimer = useCallback(() => {
    if (recTimerRef.current) {
      clearTimeout(recTimerRef.current);
      recTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecordTimer();
      if (recRef.current) {
        recRef.current.stopAndUnloadAsync().catch(() => {});
        recRef.current = null;
      }
    };
  }, [clearRecordTimer]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Izin Mikrofon",
          "Izin mikrofon diperlukan untuk fitur ini.",
        );
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } =
        await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) setMicLevel(meteringToLevel(status.metering));
      });
      recRef.current = recording;
      setMicLevel(0);
      setMicStatus("recording");
      clearRecordTimer();
      recTimerRef.current = setTimeout(() => {
        if (recRef.current) stopRef.current?.();
      }, MAX_RECORD_MS);

      return true;
    } catch (e) {
      console.warn("[Mic] startRecording error:", e);
      Alert.alert("Gagal memulai rekaman", e?.message ?? "Terjadi kesalahan.");
      recRef.current = null;
      setMicStatus("idle");
      return false;
    }
  }, []);
  const processCommand = useCallback(
    async (payload) => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT")), PROCESS_TIMEOUT_MS);
        });
        const res = await Promise.race([
          api.post(
            "/api/ai/voice-command",
            {
              ...payload,
              history: historyRef.current.slice(-8),
            },
            { signal: controller.signal },
          ),
          timeout,
        ]);

        const { intent, reply, action_result } = res.data;
        if (payload.text)
          historyRef.current.push({ role: "user", text: payload.text });
        historyRef.current.push({ role: "assistant", text: reply });
        if (historyRef.current.length > 16)
          historyRef.current = historyRef.current.slice(-16);
        persistHistory();

        onResult({ intent, reply, result: action_result });

        if (
          [
            "add_food",
            "use_template",
            "delete_food",
            "add_water",
            "add_weight",
          ].includes(intent)
        ) {
          await onRefresh();
        }
      } catch (e) {
        const isAborted =
          controller.signal.aborted ||
          e?.name === "CanceledError" ||
          e?.code === "ERR_CANCELED" ||
          e?.message === "canceled";
        if (isAborted) {
          console.log("[Mic] Permintaan dibatalkan user.");
          return;
        }
        console.warn("[Mic] processCommand error:", e);
        const isTimeout = e?.message === "TIMEOUT";
        const errMsg = isTimeout
          ? "Waktu tunggu habis. Cek koneksi internet kamu, lalu coba lagi."
          : (e?.response?.data?.error ?? "Gagal memproses, coba lagi.");
        onResult({ intent: "general", reply: errMsg, result: null });
      } finally {
        abortRef.current = null;
      }
    },
    [onResult, onRefresh, persistHistory],
  );

  const stopAndProcess = useCallback(async () => {
    clearRecordTimer();
    const recording = recRef.current;
    if (!recording) {
      busyRef.current = false;
      return;
    }

    setMicStatus("processing");
    setMicLevel(0);
    recRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) throw new Error("URI rekaman tidak ditemukan.");

      const b64 = await readAsStringAsync(uri, { encoding: "base64" });
      await processCommand({ audio_base64: b64, mime_type: AUDIO_MIME });
    } catch (e) {
      console.warn("[Mic] stopAndProcess error:", e);
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      const errMsg = e?.response?.data?.error ?? "Gagal memproses, coba lagi.";
      onResult({ intent: "general", reply: errMsg, result: null });
    } finally {
      setMicStatus("idle");
      busyRef.current = false;
    }
  }, [processCommand, onResult]);
  useEffect(() => {
    stopRef.current = stopAndProcess;
  }, [stopAndProcess]);
  const cancelRecording = useCallback(async () => {
    clearRecordTimer();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setMicStatus("idle");
      busyRef.current = false;
      return;
    }

    const recording = recRef.current;
    recRef.current = null;
    setMicLevel(0);

    if (!recording) {
      busyRef.current = false;
      setMicStatus("idle");
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (e) {
      console.warn("[Mic] cancelRecording error:", e);
    } finally {
      setMicStatus("idle");
      busyRef.current = false;
    }
  }, []);

  const handleTalk = useCallback(async () => {
    if (busyRef.current || micStatus === "processing") return;
    busyRef.current = true;

    if (micStatus === "idle") {
      const ok = await startRecording();
      if (!ok) {
        busyRef.current = false;
      } else {
        busyRef.current = false;
      }
    } else if (micStatus === "recording") {
      await stopAndProcess();
    }
  }, [micStatus, startRecording, stopAndProcess]);
  const sendText = useCallback(
    async (text) => {
      if (busyRef.current || micStatus === "processing") return;
      busyRef.current = true;
      setMicStatus("processing");
      try {
        await processCommand({ text });
      } finally {
        setMicStatus("idle");
        busyRef.current = false;
      }
    },
    [processCommand, micStatus],
  );
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    AsyncStorage.removeItem(JARVIS_HISTORY_KEY).catch(() => {});
  }, []);

  return {
    micStatus,
    micLevel,
    handleTalk,
    cancelRecording,
    clearHistory,
    sendText,
  };
}
export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, execute } = useApi(getDashboard);
  const { userId } = useAuth();

  const [resVis, setResVis] = useState(false);
  const [resData, setResData] = useState({
    intent: "general",
    reply: "",
    result: null,
  });
  const [pendingFood, setPendingFood] = useState(null);
  const [jarvisAnchor, setJarvisAnchor] = useState(null);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [scaledContentH, setScaledContentH] = useState(0);
  const CONTENT_SCALE = 0.9;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 580,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 580,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleResult = useCallback(({ intent, reply, result }) => {
    if (intent === "tambah_data" && result?.status === "needs_confirmation") {
      setPendingFood({
        nama: result.nama,
        kalori: result.kalori,
        protein: result.protein,
        karbo: result.karbo,
        lemak: result.lemak,
        serat: result.serat,
        gram_per_porsi: result.gram_per_porsi,
      });
      return;
    }
    setResData({ intent, reply, result });
    setResVis(true);
  }, []);
  const handleTalkRef = useRef(null);

  const handleRevise = useCallback(() => {
    setResVis(false);
    setTimeout(() => {
      if (handleTalkRef.current) handleTalkRef.current();
    }, 300);
  }, []);
  const handleConfirmFood = useCallback(
    async (formData) => {
      try {
        const res = await api.post("/api/ai/confirm-tambah-data", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        });
        const data = res.data;
        if (data?.status === "duplicate") {
          return {
            status: "duplicate",
            message: data.message || data.error,
            food: data.food || null,
          };
        }
        if (data?.status !== "added" || !data?.food?.id) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Server tidak mengkonfirmasi penyimpanan.",
          );
        }
        await onRefresh();
        return data;
      } catch (err) {
        if (err?.response?.status === 409) {
          const d = err.response.data;
          return {
            status: "duplicate",
            message: d?.error || d?.message || "Makanan sudah ada di database.",
            food: d?.food || null,
          };
        }
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Gagal menyimpan, coba lagi.";
        throw new Error(msg);
      }
    },
    [onRefresh],
  );

  const handleCancelFood = useCallback(() => setPendingFood(null), []);

  const { micStatus, micLevel, handleTalk, cancelRecording, sendText } =
    useMicRecorder({
      onResult: handleResult,
      onRefresh,
    });
  const handleAddMissing = useCallback(
    (notFoundList = []) => {
      if (!notFoundList.length) return;
      const nama = notFoundList[0];
      sendText(`tambah data ${nama} ke database`);
    },
    [sendText],
  );
  handleTalkRef.current = handleTalk;

  if (loading && !data) {
    return (
      <ImageBackground
        source={BG_IMAGE}
        resizeMode="cover"
        style={[st.center, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={GREEN} />
      </ImageBackground>
    );
  }
  if (!data) {
    return (
      <ImageBackground
        source={BG_IMAGE}
        resizeMode="cover"
        style={[st.center, { paddingTop: insets.top }]}
      >
        <Text style={{ color: TXT_S }}>Tarik ke bawah untuk refresh</Text>
      </ImageBackground>
    );
  }

  const { user, target_kalori, total_kalori, target_protein, total_protein } =
    data;
  const target_karbo =
    data.target_karbo ?? Math.round((target_kalori * 0.5) / 4);
  const total_karbo = data.total_karbo ?? 0;
  const total_lemak = data.total_lemak ?? Math.round((total_kalori * 0.3) / 9);
  const target_lemak =
    data.target_lemak ?? Math.round((target_kalori * 0.3) / 9);
  const mingguKe = data.streak?.current
    ? Math.max(1, Math.ceil(data.streak.current / 7))
    : 1;

  return (
    <ImageBackground
      source={BG_IMAGE}
      resizeMode="cover"
      style={[st.root, { paddingTop: insets.top }]}
    >
      {}
      <View style={[st.floatingGreet, { top: 62 }]} pointerEvents="box-none">
        <GreetCard username={user.username} compact />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          st.scroll,
          { paddingBottom: insets.bottom + 8 },
        ]}
        style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
      >
        <View
          onLayout={(e) => setScaledContentH(e.nativeEvent.layout.height)}
          style={{
            transform: [{ scale: CONTENT_SCALE }],
            transformOrigin: "top",
            marginBottom: scaledContentH
              ? -(scaledContentH * (1 - CONTENT_SCALE))
              : 0,
          }}
        >
          <GoalCard
            tujuan={user.tujuan ?? "bulking"}
            bbSekarang={user.bb ?? 0}
            bbTarget={user.target_bb ?? (user.bb ?? 0) + 5}
            bbAwal={user.bb_awal ?? user.bb ?? 0}
            mingguKe={mingguKe}
            onGoalUpdated={onRefresh}
            style={{ marginBottom: 8 }}
          />

          {}
          {pendingFood && (
            <View style={[st.row, { marginBottom: 8 }]}>
              <JarvisCard
                onTalk={handleTalk}
                micStatus={micStatus}
                pendingFood={pendingFood}
                onConfirmFood={handleConfirmFood}
                onCancelFood={handleCancelFood}
              />
            </View>
          )}

          {}
          <NutrisiBox
            kaloriCurrent={total_kalori}
            kaloriTarget={target_kalori}
            karboCurrent={total_karbo}
            karboTarget={target_karbo}
            proteinCurrent={total_protein}
            proteinTarget={target_protein}
            lemakCurrent={total_lemak}
            lemakTarget={target_lemak}
            style={{ marginBottom: 8 }}
          />

          {}
          <View style={{ marginTop: 14 }}>
            <QuickAccessGrid
              onInputMakanan={() => navigation.navigate(ROUTES.INPUT_MAKAN)}
              onTambahData={() => navigation.navigate("TambahData")}
              onLaporan={() => navigation.navigate(ROUTES.LAPORAN)}
              onProfile={() => navigation.navigate(ROUTES.PROFIL)}
              onJarvis={(rect) => {
                setJarvisAnchor(rect);
                handleTalk();
              }}
              onJarvisType={(rect) => {
                setJarvisAnchor(rect);
                setTextInputVisible(true);
              }}
              onChatAI={() => navigation.navigate("AiChat")}
              micStatus={micStatus}
            />
          </View>
        </View>
      </Animated.ScrollView>

      <ResultModal
        visible={resVis}
        intent={resData.intent}
        reply={resData.reply}
        result={resData.result}
        onClose={() => setResVis(false)}
        onRefresh={onRefresh}
        onRevise={handleRevise}
        onAddMissing={handleAddMissing}
      />

      <JarvisVoiceOverlay
        visible={micStatus === "recording" || micStatus === "processing"}
        status={micStatus}
        level={micLevel}
        anchor={jarvisAnchor}
        onStop={handleTalk}
        onCancel={cancelRecording}
      />

      <JarvisTextInput
        visible={textInputVisible}
        anchor={jarvisAnchor}
        sending={micStatus === "processing"}
        onSend={(text) => {
          setTextInputVisible(false);
          sendText(text);
        }}
        onClose={() => setTextInputVisible(false)}
      />
    </ImageBackground>
  );
}
const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: PAD, paddingTop: 118, paddingBottom: 12 },
  row: { flexDirection: "row", gap: GAP },
  floatingGreet: {
    position: "absolute",
    right: PAD + 20,
    zIndex: 20,
    elevation: 20,
  },

  ringCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: SHD_G,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.70)",
  },

  nutriCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: SHD_W,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.70)",
  },
  nutriCardInner: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },
  nutriIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  nutriIcon: { fontSize: 26, lineHeight: 30 },
  nutriLabel: {
    fontSize: 12,
    color: TXT_S,
    fontWeight: "600",
    marginBottom: 2,
  },
  nutriCur: {
    fontSize: 18,
    fontWeight: "900",
    color: TXT,
    letterSpacing: -0.5,
  },
  nutriTgt: { fontSize: 13, color: TXT_M, fontWeight: "400" },
  nutriPct: {
    fontSize: 13,
    fontWeight: "800",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  nutriBarBg: {
    height: 9,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderRadius: 999,
    marginTop: 10,
    overflow: "hidden",
  },
  nutriBarFill: { height: 9, borderRadius: 999 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,2,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  resDialogWrap: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 26,
    position: "relative",
  },
  resDialog: {
    borderRadius: 26,
    overflow: "hidden",
  },
  resGlass: {
    padding: 20,
    paddingBottom: 16,
    borderRadius: 26,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
  },
  resHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  resBadgeOuter: {
    width: 50,
    height: 50,
    borderRadius: 16,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.55)",
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 5,
  },
  resBadge: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  resBadgeIcon: { fontSize: 22 },
  resCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(74,222,128,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  resCloseTxt: { fontSize: 13, color: "#4ADE80", fontWeight: "800" },
  resBubble: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#4ADE80",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  resReply: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 21,
  },
  resBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 4,
  },
  resRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    alignItems: "center",
  },
  resRowTxt: { fontSize: 13, color: "#FFFFFF", flex: 1, lineHeight: 18 },
  resRowMeta: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  resCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
  },
  resCheckBadgeTxt: { fontSize: 11, fontWeight: "900", color: "#052E16" },
  resBtnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  btnPriOuter: {
    flex: 1.2,
    borderRadius: 24,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPri: {
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  btnPriTxt: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },
  btnPriArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPriArrowTxt: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  btnSecOuter: {
    flex: 1,
    borderRadius: 24,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.35)",
    shadowOffset: { width: 1.5, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
  btnSec: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
  },
  btnSecTxt: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    fontSize: 13,
  },
});
