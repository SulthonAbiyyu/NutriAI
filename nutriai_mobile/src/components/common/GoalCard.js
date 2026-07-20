import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import api from "../../config/api";
import { ROUTES } from "../../constants";
const BG_BOX = require("../../../assets/bgbox.jpg");

const RADIUS = 22;
const OVERLAY_TOP = "rgba(6,14,10,0.94)";
const OVERLAY_MID = "rgba(4,9,7,0.96)";
const OVERLAY_BOTTOM = "rgba(2,5,4,0.97)";
const ACCENT_GREEN = "#22E070";
const ACCENT_GREEN_SOFT = ["#7CF5A0", "#22E070"];

const GOAL_CONFIG = {
  bulking: { label: "Bulking", emoji: "💪", dumbbell: "🏋️" },
  cutting: { label: "Cutting", emoji: "🔥", dumbbell: "⚡" },
  maintain: { label: "Maintain", emoji: "⚖️", dumbbell: "🌿" },
};
const MODAL_CARD_TOP = "#122217";
const MODAL_CARD_MID = "#0A160C";
const MODAL_CARD_BOTTOM = "#050C06";
const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = RADIUS }) {
  return (
    <>
      {DEPTH_LAYERS.map((l, i) => (
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
function ShadowOverlay({ opacity = 0.3 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.1, y: 0.05 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
const NOISE_DOTS = Array.from({ length: 55 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.55,
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

export default function GoalCard({
  tujuan = "bulking",
  bbSekarang = 70,
  bbTarget = 75,
  bbAwal = 65,
  mingguKe = 3,
  onGoalUpdated,
  style,
}) {
  const config = GOAL_CONFIG[tujuan] ?? GOAL_CONFIG.bulking;
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [selTujuan, setSelTujuan] = useState(tujuan);
  const [targetInput, setTargetInput] = useState(String(bbTarget));
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setSelTujuan(tujuan);
    setTargetInput(String(bbTarget));
    setModalVisible(true);
  };

  const handleSaveGoal = async () => {
    const targetNum = parseFloat(targetInput.replace(",", "."));
    if (isNaN(targetNum) || targetNum < 30 || targetNum > 300) {
      return Alert.alert(
        "Input Salah",
        "Target berat badan harus antara 30–300 kg",
      );
    }
    setSaving(true);
    try {
      await api.put("/api/profile", {
        tujuan: selTujuan,
        target_bb: targetNum,
      });
      setModalVisible(false);
      onGoalUpdated?.();
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Gagal menyimpan goal, coba lagi",
      );
    } finally {
      setSaving(false);
    }
  };

  const goToWeightTracker = () => {
    setModalVisible(false);
    navigation.navigate(ROUTES.WEIGHT_TRACKER);
  };
  const totalDelta = bbTarget - bbAwal;
  const doneDelta = bbSekarang - bbAwal;
  const pct =
    totalDelta !== 0 ? Math.min(Math.max(doneDelta / totalDelta, 0), 1) : 0;
  const pctLabel = Math.round(pct * 100);

  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[st.wrapper, style]}>
      {}
      <DepthStack />

      <ImageBackground
        source={BG_BOX}
        style={st.card}
        imageStyle={st.cardImage}
        resizeMode="cover"
      >
        <LinearGradient
          pointerEvents="none"
          colors={[OVERLAY_TOP, OVERLAY_MID, OVERLAY_BOTTOM]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <ShadowOverlay />
        <Texture />

        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(255,255,255,0.09)",
            "rgba(255,255,255,0.03)",
            "rgba(255,255,255,0)",
          ]}
          locations={[0, 0.35, 0.75]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />

        {}
        <View style={st.dumbbellWrap} pointerEvents="none">
          <Text style={st.dumbbellEmoji}>{config.dumbbell}</Text>
        </View>

        {}
        <View style={st.content}>
          {}
          <View style={st.badgeWrap}>
            <Text style={st.goalActif}>GOAL AKTIF</Text>
          </View>

          {}
          <View style={st.titleRow}>
            <Text style={st.titleEmoji}>{config.emoji}</Text>
            <Text style={st.titleLabel}>{config.label}</Text>
          </View>

          {}
          <View style={st.barBg}>
            <Animated.View
              style={[
                st.barFillWrap,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={ACCENT_GREEN_SOFT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.barFill}
              />
            </Animated.View>
          </View>

          {}
          <View style={st.footerRow}>
            <Text style={st.pctRow}>
              <Text style={st.pctLabel}>{pctLabel}%</Text>
              <Text style={st.pctSuffix}> selesai</Text>
            </Text>

            <View style={st.targetRow}>
              <Text style={st.targetLabel}>
                Target: {bbTarget}kg · Sekarang: {bbSekarang}kg
              </Text>

              {}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={openModal}
                style={st.updateBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={st.updateBtnText}>✎ Edit Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalCardOuter}>
            <DepthStack radius={24} />
            <LinearGradient
              colors={[MODAL_CARD_TOP, MODAL_CARD_MID, MODAL_CARD_BOTTOM]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={st.modalCard}
            >
              <ShadowOverlay opacity={0.26} />
              <Texture opacity={0.6} />

              <Text style={st.modalTitle}>🎯 Edit Goal</Text>

              {}
              <Text style={st.modalLabel}>Tujuan</Text>
              <View style={st.segmentRow}>
                {Object.entries(GOAL_CONFIG).map(([key, cfg]) => {
                  const active = selTujuan === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.8}
                      onPress={() => setSelTujuan(key)}
                      style={[st.segmentBtn, active && st.segmentBtnActive]}
                    >
                      <Text style={st.segmentEmoji}>{cfg.emoji}</Text>
                      <Text
                        style={[st.segmentText, active && st.segmentTextActive]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {}
              <Text style={[st.modalLabel, { marginTop: 16 }]}>
                Target Berat (kg)
              </Text>
              <View style={st.modalInputBox}>
                <TextInput
                  style={st.modalInputText}
                  value={targetInput}
                  onChangeText={setTargetInput}
                  keyboardType="decimal-pad"
                  placeholder="Contoh: 75"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>

              {}
              <Text style={st.modalInfo}>
                Berat awal: {bbAwal}kg · Berat sekarang: {bbSekarang}kg
              </Text>

              {}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={goToWeightTracker}
                style={st.linkWeightBtn}
              >
                <Text style={st.linkWeightText}>
                  📈 Catat berat hari ini di Weight Tracker →
                </Text>
              </TouchableOpacity>

              {}
              <View style={st.modalBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(false)}
                  style={st.btnSecOuter}
                  disabled={saving}
                >
                  <Text style={st.btnSecText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSaveGoal}
                  disabled={saving}
                  style={st.btnPriOuter}
                >
                  <LinearGradient
                    colors={ACCENT_GREEN_SOFT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[st.btnPriInner, saving && { opacity: 0.7 }]}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#052E16" />
                    ) : (
                      <Text style={st.btnPriText}>Simpan</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    width: "100%",
    borderRadius: RADIUS,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.65)",
    shadowOffset: { width: 5, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },

  card: {
    borderRadius: RADIUS,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  cardImage: {
    borderRadius: RADIUS,
  },
  dumbbellWrap: {
    position: "absolute",
    right: -8,
    top: -6,
    bottom: -6,
    width: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  dumbbellEmoji: {
    fontSize: 80,
    opacity: 0.9,
    transform: [{ rotate: "-15deg" }],
  },

  content: {
    paddingRight: 110,
  },
  badgeWrap: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    borderLeftColor: "rgba(255,255,255,0.18)",
    borderRightColor: "rgba(0,0,0,0.25)",
    borderBottomColor: "rgba(0,0,0,0.25)",
    marginBottom: 10,
  },
  goalActif: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  titleEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  titleLabel: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  barBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
  },
  barFillWrap: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    flex: 1,
    borderRadius: 999,
  },
  footerRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  pctRow: {
    fontSize: 15,
  },
  pctLabel: {
    fontWeight: "900",
    color: ACCENT_GREEN,
    letterSpacing: -0.3,
  },
  pctSuffix: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  targetLabel: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  updateBtn: {
    backgroundColor: "rgba(34,224,112,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(34,224,112,0.35)",
  },
  updateBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: ACCENT_GREEN,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,2,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCardOuter: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    position: "relative",
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    paddingBottom: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 2,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(34,224,112,0.14)",
    borderColor: "rgba(34,224,112,0.55)",
  },
  segmentEmoji: {
    fontSize: 18,
  },
  segmentText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
  },
  segmentTextActive: {
    color: ACCENT_GREEN,
  },
  modalInputBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalInputText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  modalInfo: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.45)",
    marginTop: 10,
  },
  linkWeightBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  linkWeightText: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT_GREEN,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  btnSecOuter: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
  },
  btnSecText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    fontSize: 13.5,
  },
  btnPriOuter: {
    flex: 1.2,
    borderRadius: 24,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPriInner: {
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
  },
  btnPriText: {
    color: "#052E16",
    fontWeight: "900",
    fontSize: 13.5,
  },
});
