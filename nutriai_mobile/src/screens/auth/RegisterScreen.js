import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { useAuth } from "../../context/AuthContext";
import {
  checkUsernameAvailability,
  register,
} from "../../services/AuthService";
let ICONS = {};
try {
  ICONS = require("../../constants").ICONS || {};
} catch (e) {
  ICONS = {};
}

const { width, height } = Dimensions.get("window");
const W = width;
const CURRENT_YEAR = new Date().getFullYear();
const C = {
  bg0: "#0B160F",
  bg1: "#060D08",
  bg2: "#020602",
  surface: "#0C1811",
  surfaceLight: "#12241A",
  bevelHi: "rgba(255,255,255,0.10)",
  bevelLo: "rgba(0,0,0,0.55)",
  line: "rgba(140,255,120,0.28)",
  lineStrong: "rgba(140,255,120,0.55)",
  glow: "rgba(120,255,110,0.55)",
  ink: "#F4FFF6",
  inkSub: "rgba(232,255,238,0.72)",
  inkMuted: "rgba(210,235,215,0.42)",
  lime: "#8CFF4D",
  limeDk: "#2F8F1E",
  mint: "#5EEAD4",
  teal: "#14B8A6",
  gold: "#FFD166",
  coral: "#FF8A65",
  cyan: "#22D3EE",
};
const G = [
  ["#9CFF5C", "#33A21F"],
  ["#5EEAD4", "#0F9C86"],
  ["#FF8A65", "#E4572E"],
  ["#FFD166", "#F2A93B"],
  ["#5EEAD4", "#14B8A6"],
  ["#9CFF5C", "#22A83E"],
  ["#9CFF5C", "#5EEAD4"],
  ["#FFD166", "#9CFF5C"],
  ["#5EEAD4", "#9CFF5C"],
];

const STEPS = [
  {
    id: "username",
    type: "text",
    field: "username",
    icon: "person-outline",
    title: "Siapa\nkamu?",
    hint: "Username unik untuk akunmu",
    placeholder: "contoh: ",
    placeholderAccent: "budi_fit",
    cap: "none",
  },
  {
    id: "password",
    type: "text",
    field: "password",
    icon: "lock-closed-outline",
    title: "Password\nrahasiamu",
    hint: "Minimal 6 karakter",
    placeholder: "",
    placeholderAccent: "••••••••",
    secure: true,
  },
  {
    id: "gender",
    type: "gender",
    field: "gender",
    icon: "people-outline",
    title: "Kamu\nlaki atau perempuan?",
    hint: "Untuk menghitung kebutuhan kalorimu",
    opts: [
      {
        v: "laki_laki",
        emoji: "👨",
        label: "Laki-laki",
        sub: "Male",
        g: ["#22D3EE", "#0E7490"],
      },
      {
        v: "perempuan",
        emoji: "👩",
        label: "Perempuan",
        sub: "Female",
        g: ["#FF8A65", "#E4572E"],
      },
    ],
  },
  {
    id: "umur",
    type: "age",
    icon: "calendar-outline",
    title: "Berapa\numurmu?",
    hint: "Usia mempengaruhi kebutuhan nutrisimu",
  },
  {
    id: "tb",
    type: "height",
    icon: "resize-outline",
    title: "Seberapa\ntinggimu?",
    hint: "Seret ruler naik↑ atau turun↓",
  },
  {
    id: "bb",
    type: "weight",
    icon: "fitness-outline",
    title: "Berapa\nberatmu?",
    hint: "Hold & geser untuk memilih angka",
  },
  {
    id: "tujuan",
    type: "choice",
    field: "tujuan",
    icon: "flag-outline",
    title: "Apa\ntujuanmu?",
    hint: "Target utamamu sekarang",
    opts: [
      {
        v: "bulking",
        e: "💪",
        l: "Bulking",
        d: "Tambah massa otot",
        g: ["#9CFF5C", "#33A21F"],
      },
      {
        v: "cutting",
        e: "🔥",
        l: "Cutting",
        d: "Turunkan lemak tubuh",
        g: ["#FF8A65", "#E4572E"],
      },
      {
        v: "maintain",
        e: "⚖️",
        l: "Maintain",
        d: "Jaga berat ideal",
        g: ["#5EEAD4", "#0F9C86"],
      },
    ],
  },
  {
    id: "aktivitas",
    type: "choice",
    field: "aktivitas",
    icon: "pulse-outline",
    title: "Seberapa\naktifmu?",
    hint: "Aktivitas fisik harianmu",
    opts: [
      {
        v: "sangat_tidak_aktif",
        e: "🛋️",
        l: "Santai",
        d: "Jarang olahraga",
        g: ["#7C8B7F", "#3E4A40"],
      },
      {
        v: "aktivitas_ringan",
        e: "🚶",
        l: "Ringan",
        d: "1–3x/minggu",
        g: ["#5EEAD4", "#0F9C86"],
      },
      {
        v: "aktivitas_sedang",
        e: "🏋️",
        l: "Sedang",
        d: "3–5x/minggu",
        g: ["#22D3EE", "#0E7490"],
      },
      {
        v: "aktivitas_berat",
        e: "⚡",
        l: "Intensif",
        d: "Tiap hari",
        g: ["#FFD166", "#F2A93B"],
      },
    ],
  },
  {
    id: "body_type",
    type: "body",
    field: "body_type",
    icon: "body-outline",
    title: "Tipe\ntubuhmu?",
    hint: "Yang paling mendekati kondisimu",
    opts: [
      {
        v: "ectomorph",
        e: "🏃",
        l: "Ecto",
        d: "Ramping,\nsulit gemuk",
        g: ["#22D3EE", "#0E7490"],
      },
      {
        v: "mesomorph",
        e: "💪",
        l: "Meso",
        d: "Atletis,\nmudah berotot",
        g: ["#9CFF5C", "#33A21F"],
      },
      {
        v: "endomorph",
        e: "🏋️",
        l: "Endo",
        d: "Padat,\nmudah gemuk",
        g: ["#FFD166", "#F2A93B"],
      },
    ],
  },
];

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

function DepthStack({ radius = 18 }) {
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

const NOISE_DOTS = Array.from({ length: 26 }).map(() => ({
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
function Panel3D({
  children,
  style,
  radius = 20,
  grad,
  glow = true,
  glowColor,
  padding,
}) {
  const gc = glowColor || (grad ? grad[0] : C.lime);
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <View
        style={{
          borderRadius: radius,
          position: "relative",
          shadowColor: "rgba(0,0,0,0.7)",
          shadowOffset: { width: 4, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <DepthStack radius={radius} />
        <View style={{ borderRadius: radius, overflow: "hidden" }}>
          <LinearGradient
            colors={
              grad ? [grad[0] + "22", C.surface] : [C.surfaceLight, C.surface]
            }
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ borderRadius: radius, padding }}
          >
            <ShadowOverlay opacity={0.28} />
            <Texture opacity={1} />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: radius,
                borderWidth: 1.5,
                borderTopColor: C.bevelHi,
                borderLeftColor: C.bevelHi,
                borderRightColor: C.bevelLo,
                borderBottomColor: C.bevelLo,
              }}
            />
            {glow && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: radius,
                  borderWidth: 1.3,
                  borderColor: gc + "55",
                }}
              />
            )}
            {children}
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}
function LeafDecor({ source, style }) {
  if (!source) return null;
  return (
    <Image
      source={source}
      style={[{ position: "absolute", resizeMode: "contain" }, style]}
      pointerEvents="none"
    />
  );
}
const STAR_DOTS = Array.from({ length: 34 }).map(() => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  r: 0.35 + Math.random() * 0.65,
  o: 0.25 + Math.random() * 0.55,
}));

function Background({ g }) {
  return (
    <>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[C.bg0, C.bg1, C.bg2]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      </View>

      {}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 220"
        preserveAspectRatio="none"
      >
        {STAR_DOTS.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y * 2.2}
            r={s.r}
            fill={`rgba(220,255,225,${s.o})`}
          />
        ))}
      </Svg>

      {}
      <View
        style={[
          bg.blob,
          {
            top: -width * 0.55,
            left: -width * 0.35,
            width: width * 1.15,
            height: width * 1.15,
            borderRadius: width,
            borderWidth: 1,
            borderColor: g[0] + "30",
            backgroundColor: g[0] + "0A",
          },
        ]}
      />
      <View
        style={[
          bg.blob,
          {
            top: height * 0.3,
            right: -width * 0.45,
            width: width * 0.85,
            height: width * 0.85,
            borderRadius: width,
            borderWidth: 1,
            borderColor: g[1] + "26",
            backgroundColor: g[1] + "08",
          },
        ]}
      />
      <View
        style={[
          bg.blob,
          {
            top: height * 0.2,
            left: width * 0.58,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: g[0] + "10",
          },
        ]}
      />
      <View
        style={[
          bg.blob,
          {
            bottom: -width * 0.4,
            left: -width * 0.25,
            width: width * 0.9,
            height: width * 0.9,
            borderRadius: width,
            borderWidth: 1,
            borderColor: g[0] + "20",
            backgroundColor: g[0] + "08",
          },
        ]}
      />

      {}
      <LeafDecor
        source={ICONS.leafTopRight}
        style={{ top: -10, right: -8, width: 130, height: 130 }}
      />
      <LeafDecor
        source={ICONS.leafBottomLeft}
        style={{ bottom: -10, left: -14, width: 150, height: 220 }}
      />
      <LeafDecor
        source={ICONS.leafBottomRight}
        style={{ bottom: -6, right: -10, width: 150, height: 220 }}
      />
    </>
  );
}
const bg = StyleSheet.create({ blob: { position: "absolute" } });
function LanjutFab({
  label = "Lanjut",
  onPress,
  g,
  loading,
  variant = "pill",
  icon = "arrow-forward",
}) {
  const sc = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(sc, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(sc, {
        toValue: 1,
        tension: 250,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.();
  };
  if (variant === "circle") {
    return (
      <TouchableOpacity onPress={press} activeOpacity={0.9}>
        <Animated.View
          style={{
            transform: [{ scale: sc }],
            borderRadius: 40,
            shadowColor: g[0],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.55,
            shadowRadius: 14,
            elevation: 10,
          }}
        >
          <LinearGradient
            colors={g}
            style={lb.circle}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          >
            <View style={lb.circleInner}>
              <Ionicons name={icon} size={24} color="#082408" />
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  if (variant === "fat") {
    return (
      <TouchableOpacity
        onPress={press}
        activeOpacity={0.9}
        style={{ width: "100%" }}
      >
        <Animated.View
          style={[
            {
              borderRadius: 22,
              overflow: "hidden",
              transform: [{ scale: sc }],
            },
            {
              shadowColor: g[0],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 10,
            },
          ]}
        >
          <LinearGradient
            colors={g}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={lb.fat}
          >
            <ShadowOverlay opacity={0.18} />
            <Text style={lb.fatTxt}>{label}</Text>
            <View style={lb.fatCircle}>
              <Ionicons name={icon} size={18} color="#DFFFC8" />
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  if (variant === "badge") {
    return (
      <TouchableOpacity onPress={press} activeOpacity={0.9}>
        <Animated.View style={{ transform: [{ scale: sc }] }}>
          <Panel3D grad={g} radius={100} glowColor={g[0]}>
            <View style={lb.badgeRow}>
              <Text style={[lb.badgeTxt, { color: g[0] }]}>{label}</Text>
              <LinearGradient
                colors={g}
                style={lb.badgeIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={icon} size={14} color="#082408" />
              </LinearGradient>
            </View>
          </Panel3D>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.9}>
      <Animated.View
        style={[
          { borderRadius: 100, overflow: "hidden", transform: [{ scale: sc }] },
          {
            shadowColor: g[0],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 14,
            elevation: 10,
          },
        ]}
      >
        <LinearGradient
          colors={g}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={lb.pill}
        >
          <ShadowOverlay opacity={0.16} />
          <Text style={lb.pillTxt}>{label}</Text>
          <View style={lb.pillIcon}>
            <Ionicons name={icon} size={16} color="#DFFFC8" />
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}
const lb = StyleSheet.create({
  circle: { width: 66, height: 66, borderRadius: 33, padding: 3.5 },
  circleInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: "#DFFFC8",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  badgeTxt: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  badgeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  fat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 19,
  },
  fatTxt: {
    fontSize: 17,
    fontWeight: "900",
    color: "#08260B",
    letterSpacing: 0.3,
  },
  fatCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(6,14,8,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingLeft: 28,
    paddingRight: 8,
  },
  pillTxt: { fontSize: 16, fontWeight: "900", color: "#08260B" },
  pillIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(4,12,6,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
function TextStep({
  s,
  form,
  set,
  showPass,
  setShowPass,
  g,
  onNext,
  usernameStatus,
}) {
  const [focused, setFocused] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(lineAnim, {
      toValue: focused ? 1 : 0,
      tension: 150,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [focused]);
  const borderColor = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.line, g[0] + "CC"],
  });
  const showCustomPlaceholder = !form[s.field];

  return (
    <View style={{ width: "100%" }}>
      {}
      <View style={{ marginBottom: 30 }}>
        <Text style={txt.eyebrow}>Langkah dasar</Text>
        <Text style={txt.h1}>{s.title.split("\n")[0]}</Text>
        <Text
          style={[
            txt.h1,
            {
              color: g[0],
              textShadowColor: g[0] + "55",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 18,
            },
          ]}
        >
          {s.title.split("\n")[1]}
        </Text>
        <Text style={txt.hint}>{s.hint}</Text>
      </View>

      {}
      <Panel3D radius={20} grad={g} glowColor={g[0]}>
        <Animated.View
          style={{
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            {}
            <View style={{ marginRight: 12 }}>
              <Panel3D radius={12} glow glowColor={g[0]} grad={g}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={s.icon} size={16} color={g[0]} />
                </View>
              </Panel3D>
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
              <TextInput
                style={txt.input}
                value={form[s.field]}
                onChangeText={(v) => set(s.field, v)}
                placeholder=""
                secureTextEntry={s.secure && !showPass}
                autoCapitalize={s.cap || "sentences"}
                autoFocus
                selectionColor={g[0]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />

              {showCustomPlaceholder && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    paddingVertical: 18,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "600",
                      color: C.inkMuted,
                    }}
                  >
                    {s.placeholder}
                  </Text>
                  <Text
                    style={{ fontSize: 17, fontWeight: "700", color: g[0] }}
                  >
                    {s.placeholderAccent}
                  </Text>
                </View>
              )}
            </View>

            {s.secure && (
              <TouchableOpacity
                onPress={() => setShowPass((p) => !p)}
                style={{ padding: 8 }}
              >
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.inkMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Panel3D>

      {}
      {s.field === "username" && form.username?.trim().length > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            paddingLeft: 6,
          }}
        >
          {usernameStatus === "checking" && (
            <>
              <Ionicons name="time-outline" size={14} color={C.inkMuted} />
              <Text
                style={{ fontSize: 12, color: C.inkMuted, fontWeight: "600" }}
              >
                Mengecek ketersediaan...
              </Text>
            </>
          )}
          {usernameStatus === "available" && (
            <>
              <Ionicons name="checkmark-circle" size={14} color={C.lime} />
              <Text style={{ fontSize: 12, color: C.lime, fontWeight: "700" }}>
                Username tersedia!
              </Text>
            </>
          )}
          {usernameStatus === "taken" && (
            <>
              <Ionicons name="close-circle" size={14} color={C.coral} />
              <Text style={{ fontSize: 12, color: C.coral, fontWeight: "700" }}>
                Username sudah dipakai
              </Text>
            </>
          )}
          {usernameStatus === "error" && (
            <>
              <Ionicons name="alert-circle-outline" size={14} color={C.gold} />
              <Text style={{ fontSize: 12, color: C.gold, fontWeight: "600" }}>
                Gagal mengecek, coba lagi
              </Text>
            </>
          )}
        </View>
      )}

      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 26,
        }}
      >
        <Panel3D grad={g} radius={100} glowColor={g[0]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="person-circle-outline" size={14} color={g[0]} />
            <Text
              style={{
                fontSize: 10.5,
                color: g[0],
                fontWeight: "800",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {s.field === "username" ? "Identitas" : "Keamanan"}
            </Text>
          </View>
        </Panel3D>

        <LanjutFab g={g} onPress={onNext} label="Lanjut" />
      </View>
    </View>
  );
}
const txt = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: C.lime,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  h1: {
    fontSize: 42,
    fontWeight: "900",
    color: C.ink,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  hint: {
    fontSize: 13,
    color: C.inkMuted,
    marginTop: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  input: { fontSize: 17, fontWeight: "700", color: C.ink, paddingVertical: 18 },
});
function GenderStep({ s, form, set, g, onNext }) {
  const CW = (W - 72) / 2;
  const CH = CW * 1.45;
  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <View style={{ width: "100%", marginBottom: 24 }}>
        <Text style={txt.eyebrow}>Jenis kelamin</Text>
        <Text style={txt.h1}>{s.title.split("\n")[0]}</Text>
        <Text style={[txt.h1, { color: g[0] }]}>
          {s.title.split("\n")[1] || ""}
        </Text>
        <Text style={txt.hint}>{s.hint}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        {s.opts.map((opt) => (
          <GFCard
            key={opt.v}
            opt={opt}
            sel={form.gender === opt.v}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              set("gender", opt.v);
            }}
            W={CW}
            H={CH}
          />
        ))}
      </View>

      <View style={{ marginTop: 28, alignItems: "center" }}>
        {form.gender ? (
          <LanjutFab
            g={g}
            onPress={onNext}
            variant="circle"
            icon="arrow-forward"
          />
        ) : (
          <Panel3D grad={g} radius={100} glowColor={g[0]}>
            <Text
              style={{
                fontSize: 12,
                color: g[0],
                fontWeight: "700",
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              ← Pilih salah satu →
            </Text>
          </Panel3D>
        )}
      </View>
    </View>
  );
}

function GFCard({ opt, sel, onPress, W, H }) {
  const flip = useRef(new Animated.Value(sel ? 1 : 0)).current;
  const prev = useRef(sel);
  useEffect(() => {
    if (prev.current === sel) return;
    prev.current = sel;
    Animated.spring(flip, {
      toValue: sel ? 1 : 0,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [sel]);
  const fRot = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const bRot = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const fOp = flip.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const bOp = flip.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const sc = flip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.87, 1],
  });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={{ width: W, height: H }}
    >
      <Animated.View
        style={{ width: W, height: H, transform: [{ scale: sc }] }}
      >
        <Animated.View
          style={[
            gf.face,
            {
              width: W,
              height: H,
              opacity: fOp,
              transform: [{ rotateY: fRot }],
            },
          ]}
        >
          <Panel3D radius={28} glowColor={opt.g[0]} style={{ flex: 1 }}>
            <View style={[gf.inner, { width: W - 4, height: H - 4 }]}>
              <Text style={{ fontSize: 56, marginBottom: 10 }}>
                {opt.emoji}
              </Text>
              <Text style={gf.fl}>{opt.label}</Text>
              <Text style={gf.fs}>{opt.sub}</Text>
              <View style={[gf.tap, { backgroundColor: opt.g[0] + "55" }]} />
            </View>
          </Panel3D>
        </Animated.View>
        <Animated.View
          style={[
            gf.face,
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              opacity: bOp,
              transform: [{ rotateY: bRot }],
            },
          ]}
        >
          <LinearGradient
            colors={opt.g}
            style={[gf.inner, { borderRadius: 28, width: W, height: H }]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          >
            <ShadowOverlay opacity={0.2} />
            <View style={gf.ck}>
              <Ionicons name="checkmark" size={26} color={opt.g[1]} />
            </View>
            <Text style={{ fontSize: 50, marginBottom: 10 }}>{opt.emoji}</Text>
            <Text style={gf.bl}>{opt.label}</Text>
            <Text style={gf.bs}>Terpilih ✓</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}
const gf = StyleSheet.create({
  face: {
    position: "absolute",
    backfaceVisibility: "hidden",
    borderRadius: 28,
  },
  inner: {
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tap: { width: 40, height: 6, borderRadius: 3, marginTop: 14 },
  ck: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(6,14,8,0.85)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  fl: {
    fontSize: 18,
    fontWeight: "900",
    color: C.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  fs: { fontSize: 12, color: C.inkMuted, fontWeight: "600" },
  bl: {
    fontSize: 18,
    fontWeight: "900",
    color: "#08240B",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  bs: { fontSize: 12, color: "rgba(8,36,11,0.75)", fontWeight: "700" },
});
function AgeStep({ form, set, g, onNext }) {
  const scA = useRef(new Animated.Value(1)).current;
  const bump = () =>
    Animated.sequence([
      Animated.timing(scA, {
        toValue: 1.22,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.spring(scA, {
        toValue: 1,
        tension: 320,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  const change = (d) => {
    const n = Math.min(80, Math.max(10, form.umur + d));
    if (n !== form.umur) {
      bump();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      set("umur", n);
    }
  };
  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Data diri</Text>
      <Text style={txt.h1}>Berapa</Text>
      <Text style={[txt.h1, { color: g[0], marginBottom: 8 }]}>umurmu?</Text>
      <Text style={[txt.hint, { marginBottom: 30 }]}>{STEPS[3].hint}</Text>

      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <View
          style={{
            width: 200,
            height: 200,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[200, 158, 116].map((sz, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                width: sz,
                height: sz,
                borderRadius: sz / 2,
                borderWidth: i === 0 ? 1.5 : 1,
                borderColor: i === 0 ? g[0] + "55" : g[0] + "26",
              }}
            />
          ))}
          <View
            style={{
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: g[0],
              top: 8,
              right: 52,
              shadowColor: g[0],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 8,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: g[1] + "AA",
              bottom: 20,
              left: 28,
            }}
          />
          <View
            style={{
              shadowColor: g[0],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 10,
              borderRadius: 63,
            }}
          >
            <LinearGradient
              colors={g}
              style={{
                width: 126,
                height: 126,
                borderRadius: 63,
                alignItems: "center",
                justifyContent: "center",
              }}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
            >
              <ShadowOverlay opacity={0.2} />
              <Animated.Text
                style={{
                  fontSize: 50,
                  fontWeight: "900",
                  color: "#08260B",
                  letterSpacing: -3,
                  transform: [{ scale: scA }],
                }}
              >
                {form.umur}
              </Animated.Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "rgba(8,38,11,0.7)",
                  marginTop: -4,
                }}
              >
                tahun
              </Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <Panel3D grad={g} radius={100} glowColor={g[0]}>
          <View style={{ flexDirection: "row", padding: 6, gap: 6 }}>
            {[-10, -1, 1, 10].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => change(d)}
                activeOpacity={0.8}
                style={{ borderRadius: 100, overflow: "hidden" }}
              >
                {d > 0 ? (
                  <LinearGradient
                    colors={g}
                    style={ag.btn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={[ag.btnT, { color: "#08260B" }]}
                    >{`+${d}`}</Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      ag.btn,
                      { backgroundColor: "rgba(255,255,255,0.06)" },
                    ]}
                  >
                    <Text style={ag.btnT}>{d}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Panel3D>
        <LanjutFab g={g} onPress={onNext} variant="circle" />
      </View>
    </View>
  );
}
const ag = StyleSheet.create({
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    minWidth: 56,
    alignItems: "center",
    borderRadius: 100,
  },
  btnT: { fontSize: 13, fontWeight: "900", color: C.inkSub },
});
const HT_MIN = 140,
  HT_MAX = 220;
const RH = height * 0.38;
const PPC = RH / (HT_MAX - HT_MIN);

function HeightStep({ form, set, g, onNext }) {
  const startY = useRef(0),
    startV = useRef(form.tb),
    cur = useRef(form.tb);
  const animV = useRef(new Animated.Value(form.tb)).current;
  const lastH = useRef(form.tb);

  const apply = useCallback((v) => {
    const c = Math.max(HT_MIN, Math.min(HT_MAX, Math.round(v)));
    if (c !== lastH.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastH.current = c;
    }
    cur.current = c;
    animV.setValue(c);
    set("tb", c);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        startY.current = e.nativeEvent.pageY;
        startV.current = cur.current;
      },
      onPanResponderMove: (e) => {
        apply(startV.current - (e.nativeEvent.pageY - startY.current) / PPC);
      },
    }),
  ).current;

  const indicY = animV.interpolate({
    inputRange: [HT_MIN, HT_MAX],
    outputRange: [RH - 2, 2],
    extrapolate: "clamp",
  });
  const ticks = useMemo(() => {
    const a = [];
    for (let cm = HT_MAX; cm >= HT_MIN; cm--) {
      a.push({
        cm,
        y: ((HT_MAX - cm) / (HT_MAX - HT_MIN)) * RH,
        big: cm % 10 === 0,
        mid: cm % 5 === 0 && cm % 10 !== 0,
      });
    }
    return a;
  }, []);

  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Pengukuran</Text>
      <Text style={txt.h1}>Seberapa</Text>
      <Text style={[txt.h1, { color: g[0], marginBottom: 8 }]}>tinggimu?</Text>
      <Text style={[txt.hint, { marginBottom: 20 }]}>{STEPS[4].hint}</Text>

      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <View {...pan.panHandlers}>
          <Panel3D
            radius={24}
            glowColor={g[0]}
            style={{ width: 96, height: RH }}
          >
            <View style={{ width: 96 - 3, height: RH - 3, overflow: "hidden" }}>
              {ticks.map(({ cm, y, big, mid }) => (
                <View
                  key={cm}
                  style={{
                    position: "absolute",
                    top: y - 1,
                    left: 0,
                    right: 0,
                    paddingLeft: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: big ? 50 : mid ? 34 : 18,
                        height: big ? 2.5 : mid ? 1.8 : 1,
                        backgroundColor: big
                          ? C.inkSub
                          : mid
                            ? C.inkMuted
                            : "rgba(255,255,255,0.14)",
                        borderRadius: 2,
                      }}
                    />
                    {big && (
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "800",
                          color: C.inkMuted,
                        }}
                      >
                        {cm}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 3,
                  top: indicY,
                  zIndex: 10,
                }}
              >
                <LinearGradient
                  colors={g}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  right: 0,
                  top: Animated.subtract(indicY, 7),
                  zIndex: 11,
                }}
              >
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderTopWidth: 7,
                    borderBottomWidth: 7,
                    borderRightWidth: 12,
                    borderTopColor: "transparent",
                    borderBottomColor: "transparent",
                    borderRightColor: g[0],
                  }}
                />
              </Animated.View>
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                }}
              >
                <LinearGradient
                  colors={[C.surface, C.surface + "00"]}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                }}
              >
                <LinearGradient
                  colors={[C.surface + "00", C.surface]}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>
          </Panel3D>
        </View>

        <View style={{ flex: 1, alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: "100%",
              shadowColor: g[0],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 10,
              borderRadius: 24,
            }}
          >
            <LinearGradient
              colors={g}
              style={{
                paddingVertical: 20,
                alignItems: "center",
                borderRadius: 24,
              }}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
            >
              <ShadowOverlay opacity={0.2} />
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: "900",
                  color: "#08260B",
                  letterSpacing: -2,
                }}
              >
                {form.tb}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "rgba(8,38,11,0.7)",
                  marginTop: -4,
                }}
              >
                cm
              </Text>
            </LinearGradient>
          </View>

          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
            {[1, -1].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => apply(form.tb + d)}
                activeOpacity={0.8}
                style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              >
                {d > 0 ? (
                  <LinearGradient
                    colors={g}
                    style={ht.sBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={[ht.sBtnT, { color: "#08260B" }]}
                    >{`+${d}`}</Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      ht.sBtn,
                      {
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1.5,
                        borderColor: C.line,
                      },
                    ]}
                  >
                    <Text style={ht.sBtnT}>{d}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <LanjutFab g={g} onPress={onNext} variant="pill" />
        </View>
      </View>
    </View>
  );
}
const ht = StyleSheet.create({
  sBtn: { paddingVertical: 13, alignItems: "center", borderRadius: 14 },
  sBtnT: { fontSize: 14, fontWeight: "900", color: C.inkSub },
});
const AS = -210,
  SW = 240,
  BMIN = 30,
  BMAX = 150;
function bTicks(R) {
  const a = [];
  for (let kg = BMIN; kg <= BMAX; kg++) {
    const fr = (kg - BMIN) / (BMAX - BMIN),
      deg = AS + fr * SW,
      rad = (deg * Math.PI) / 180;
    const big = kg % 10 === 0,
      mid = kg % 5 === 0 && !big,
      tL = big ? 22 : mid ? 14 : 7;
    const OR = R - 22,
      IR = OR - tL;
    const ox = R + OR * Math.cos(rad),
      oy = R + OR * Math.sin(rad);
    const ix = R + IR * Math.cos(rad),
      iy = R + IR * Math.sin(rad);
    const dx = ox - ix,
      dy = oy - iy,
      len = Math.sqrt(dx * dx + dy * dy),
      ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const LR = OR - tL - 16,
      lx = R + LR * Math.cos(rad),
      ly = R + LR * Math.sin(rad);
    a.push({ kg, ix, iy, len, ang, lx, ly, big, mid });
  }
  return a;
}

function DialView({ D, val, g, ticks }) {
  const R = D / 2,
    PX = R,
    PY = R * 0.88;
  const na = useRef(
    new Animated.Value(AS + ((val - BMIN) / (BMAX - BMIN)) * SW),
  ).current;
  const lv = useRef(val);
  useEffect(() => {
    const t = AS + ((val - BMIN) / (BMAX - BMIN)) * SW;
    if (Math.abs(val - lv.current) <= 2) na.setValue(t);
    else
      Animated.spring(na, {
        toValue: t,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    lv.current = val;
  }, [val]);
  const rot = na.interpolate({
    inputRange: [AS, AS + SW],
    outputRange: [`${AS}deg`, `${AS + SW}deg`],
  });
  return (
    <View style={{ width: D, height: D * 0.6, overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          width: D,
          height: D,
          borderRadius: R,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[C.surfaceLight, C.surface]}
          style={StyleSheet.absoluteFill}
        />
        <Texture opacity={0.6} />
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            bottom: 10,
            borderRadius: R - 10,
            borderWidth: 1.2,
            borderColor: C.line,
          }}
        />
      </View>
      {ticks.map(({ kg, ix, iy, len, ang, lx, ly, big, mid }) => {
        const act = kg <= val,
          near = Math.abs(kg - val) <= 1;
        return (
          <React.Fragment key={kg}>
            <View
              style={{
                position: "absolute",
                left: ix,
                top: iy,
                width: len,
                height: big ? 2.5 : mid ? 1.8 : 1,
                backgroundColor: near
                  ? g[0]
                  : act
                    ? g[0] + "BB"
                    : "rgba(255,255,255,0.14)",
                borderRadius: 2,
                transform: [{ rotate: `${ang}deg` }],
                transformOrigin: "left center",
              }}
            />
            {big && (
              <Text
                style={{
                  position: "absolute",
                  left: lx - 15,
                  top: ly - 8,
                  fontSize: D > 300 ? 11 : 9,
                  fontWeight: "800",
                  width: 30,
                  textAlign: "center",
                  color: act ? g[0] : C.inkMuted,
                }}
              >
                {kg}
              </Text>
            )}
          </React.Fragment>
        );
      })}
      <Animated.View
        style={{
          position: "absolute",
          left: PX,
          top: PY - 2.5,
          width: R * 0.65,
          height: 5,
          borderRadius: 5,
          overflow: "hidden",
          transform: [{ rotate: rot }],
          transformOrigin: "left center",
        }}
      >
        <LinearGradient
          colors={g}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          left: PX - 22,
          top: PY - 2,
          width: 22,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.14)",
          transform: [{ rotate: rot }],
          transformOrigin: "right center",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: PX - 11,
          top: PY - 11,
          width: 22,
          height: 22,
          borderRadius: 11,
          overflow: "hidden",
          shadowColor: g[0],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
        }}
      >
        <LinearGradient colors={g} style={StyleSheet.absoluteFill} />
        <View
          style={{
            position: "absolute",
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: "rgba(255,255,255,0.55)",
            top: 6.5,
            left: 6.5,
          }}
        />
      </View>
    </View>
  );
}

function WeightStep({ form, set, g, onNext }) {
  const [zoomed, setZoomed] = useState(false);
  const zA = useRef(new Animated.Value(0)).current;
  const valR = useRef(form.bb);
  const lastH = useRef(form.bb);
  const orig = useRef({ x: 0, y: 0 });

  const FD = W - 32,
    FR = FD / 2;
  const SD = W * 0.72,
    SR = SD / 2;
  const sFT = useMemo(() => bTicks(SR), []);
  const fFT = useMemo(() => bTicks(FR), []);

  const tv = (px, py) => {
    const dx = px - orig.current.x - FR,
      dy = py - orig.current.y - FR * 0.88;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const frac = Math.max(0, Math.min(1, (angle - AS) / SW));
    return Math.round(BMIN + frac * (BMAX - BMIN));
  };
  const at = (px, py) => {
    const v = tv(px, py);
    if (v !== lastH.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastH.current = v;
    }
    valR.current = v;
    set("bb", v);
  };

  const zIn = () => {
    setZoomed(true);
    Animated.spring(zA, {
      toValue: 1,
      tension: 70,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };
  const zOut = () => {
    Animated.timing(zA, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setZoomed(false));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => zIn(),
      onPanResponderMove: (e) => {
        if (orig.current.x > 0) at(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderRelease: () => zOut(),
      onPanResponderTerminate: () => zOut(),
    }),
  ).current;

  const oOp = zA.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const dSc = zA.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const dTY = zA.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Pengukuran</Text>
      <Text style={txt.h1}>Berapa</Text>
      <Text style={[txt.h1, { color: g[0], marginBottom: 8 }]}>beratmu?</Text>
      <Text style={[txt.hint, { marginBottom: 20 }]}>{STEPS[5].hint}</Text>

      <View
        style={{
          alignSelf: "flex-start",
          marginBottom: 16,
          shadowColor: g[0],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 8,
          borderRadius: 100,
        }}
      >
        <LinearGradient
          colors={g}
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 4,
            paddingHorizontal: 26,
            paddingVertical: 12,
            borderRadius: 100,
          }}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        >
          <ShadowOverlay opacity={0.18} />
          <Text
            style={{
              fontSize: 40,
              fontWeight: "900",
              color: "#08260B",
              letterSpacing: -2,
            }}
          >
            {form.bb}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "rgba(8,38,11,0.7)",
              marginBottom: 6,
            }}
          >
            kg
          </Text>
        </LinearGradient>
      </View>

      <View {...pan.panHandlers}>
        <Panel3D radius={28} glowColor={g[0]} padding={10}>
          <DialView D={SD} val={form.bb} g={g} ticks={sFT} />
        </Panel3D>
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Panel3D grad={g} radius={100} glowColor={g[0]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
              }}
            >
              <Ionicons name="hand-left-outline" size={14} color={g[0]} />
              <Text style={{ fontSize: 12, color: g[0], fontWeight: "700" }}>
                Hold & geser timbangan
              </Text>
            </View>
          </Panel3D>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <Panel3D grad={g} radius={100} glowColor={g[0]}>
          <View style={{ flexDirection: "row", padding: 6, gap: 6 }}>
            {[-5, -1, 1, 5].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() =>
                  set("bb", Math.max(BMIN, Math.min(BMAX, form.bb + d)))
                }
                activeOpacity={0.8}
                style={{ borderRadius: 100, overflow: "hidden" }}
              >
                {d > 0 ? (
                  <LinearGradient
                    colors={g}
                    style={ag.btn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={[ag.btnT, { color: "#08260B" }]}
                    >{`+${d}`}</Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      ag.btn,
                      { backgroundColor: "rgba(255,255,255,0.06)" },
                    ]}
                  >
                    <Text style={ag.btnT}>{d}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Panel3D>
        <LanjutFab g={g} onPress={onNext} variant="circle" />
      </View>

      {}
      <Modal
        visible={zoomed}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: oOp, backgroundColor: "rgba(2,6,3,0.88)" },
          ]}
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Animated.View
            style={{
              alignItems: "center",
              paddingHorizontal: 16,
              transform: [{ scale: dSc }, { translateY: dTY }],
            }}
            onLayout={(e) =>
              e.target.measure((_, __, ___, ____, px, py) => {
                orig.current = { x: px, y: py };
              })
            }
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: C.lime,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              ✦ Timbangan Digital
            </Text>
            <View
              style={{
                marginBottom: 20,
                shadowColor: g[0],
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.6,
                shadowRadius: 18,
                elevation: 10,
                borderRadius: 100,
              }}
            >
              <LinearGradient
                colors={g}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 4,
                  paddingHorizontal: 36,
                  paddingVertical: 14,
                  borderRadius: 100,
                }}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
              >
                <ShadowOverlay opacity={0.18} />
                <Text
                  style={{
                    fontSize: 54,
                    fontWeight: "900",
                    color: "#08260B",
                    letterSpacing: -2,
                  }}
                >
                  {form.bb}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "rgba(8,38,11,0.7)",
                    marginBottom: 10,
                  }}
                >
                  kg
                </Text>
              </LinearGradient>
            </View>
            <Panel3D radius={28} glowColor={g[0]} padding={12}>
              <DialView D={FD} val={form.bb} g={g} ticks={fFT} />
            </Panel3D>
            <Text
              style={{
                marginTop: 18,
                fontSize: 13,
                color: C.inkMuted,
                fontWeight: "700",
                letterSpacing: 0.4,
              }}
            >
              Geser jarum · Lepas untuk konfirmasi ✓
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
function ChoiceStep({ s, form, set, g, onNext }) {
  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Pilihan</Text>
      <Text style={txt.h1}>{s.title.split("\n")[0]}</Text>
      <Text style={[txt.h1, { color: g[0], marginBottom: 8 }]}>
        {s.title.split("\n")[1] || ""}
      </Text>
      <Text style={[txt.hint, { marginBottom: 20 }]}>{s.hint}</Text>

      <View style={{ gap: 10, marginBottom: 22 }}>
        {s.opts.map((opt) => (
          <ChoiceRow
            key={opt.v}
            opt={opt}
            sel={form[s.field] === opt.v}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              set(s.field, opt.v);
            }}
          />
        ))}
      </View>

      <LanjutFab
        g={g}
        onPress={onNext}
        variant="fat"
        label="Lanjut"
        icon="arrow-forward"
      />
    </View>
  );
}

function ChoiceRow({ opt, sel, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;
  const go = () => {
    Animated.sequence([
      Animated.timing(sc, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(sc, {
        toValue: 1,
        tension: 350,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity onPress={go} activeOpacity={1}>
        <Panel3D radius={20} glow={sel} glowColor={opt.g[0]}>
          <View style={chS.card}>
            <LinearGradient
              colors={
                sel
                  ? opt.g
                  : ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.04)"]
              }
              style={chS.bar}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            {sel ? (
              <LinearGradient
                colors={opt.g}
                style={chS.ibox}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={{ fontSize: 22 }}>{opt.e}</Text>
              </LinearGradient>
            ) : (
              <View
                style={[
                  chS.ibox,
                  { backgroundColor: "rgba(255,255,255,0.06)" },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{opt.e}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[chS.label, sel && { color: C.ink }]}>{opt.l}</Text>
              {opt.d && <Text style={chS.desc}>{opt.d}</Text>}
            </View>
            <View style={[chS.dot, sel && { borderColor: opt.g[0] }]}>
              {sel && (
                <LinearGradient
                  colors={opt.g}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>
          </View>
        </Panel3D>
      </TouchableOpacity>
    </Animated.View>
  );
}
const chS = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingRight: 16,
  },
  bar: { width: 4, alignSelf: "stretch", marginRight: 14, borderRadius: 2 },
  ibox: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderRadius: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: "900",
    color: C.inkSub,
    letterSpacing: -0.2,
  },
  desc: { fontSize: 12, color: C.inkMuted, marginTop: 2 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
});
function BodyStep({ s, form, set, g, onNext }) {
  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Tipe tubuh</Text>
      <Text style={txt.h1}>{s.title.split("\n")[0]}</Text>
      <Text style={[txt.h1, { color: g[0], marginBottom: 8 }]}>
        {s.title.split("\n")[1] || ""}
      </Text>
      <Text style={[txt.hint, { marginBottom: 20 }]}>{s.hint}</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 26 }}>
        {s.opts.map((opt) => {
          const sel = form.body_type === opt.v;
          return (
            <TouchableOpacity
              key={opt.v}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                set("body_type", opt.v);
              }}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <Panel3D radius={24} glow={sel} glowColor={opt.g[0]}>
                <View style={[bdS.card]}>
                  {sel ? (
                    <LinearGradient
                      colors={opt.g}
                      style={bdS.icon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={{ fontSize: 26 }}>{opt.e}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        bdS.icon,
                        { backgroundColor: "rgba(255,255,255,0.06)" },
                      ]}
                    >
                      <Text style={{ fontSize: 26 }}>{opt.e}</Text>
                    </View>
                  )}
                  <Text style={[bdS.label, sel && { color: C.ink }]}>
                    {opt.l}
                  </Text>
                  <Text style={bdS.desc}>{opt.d}</Text>
                  {sel && (
                    <LinearGradient
                      colors={opt.g}
                      style={bdS.ck}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="checkmark" size={10} color="#08260B" />
                    </LinearGradient>
                  )}
                </View>
              </Panel3D>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ alignSelf: "center" }}>
        <LanjutFab g={g} onPress={onNext} variant="badge" label="Lanjut" />
      </View>
    </View>
  );
}
const bdS = StyleSheet.create({
  card: {
    padding: 14,
    alignItems: "center",
    minHeight: 150,
    justifyContent: "center",
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    color: C.inkSub,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 10,
    color: C.inkMuted,
    textAlign: "center",
    lineHeight: 15,
  },
  ck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
function ConfirmStep({ form, onRegister, loading }) {
  const rows = [
    { g: ["#9CFF5C", "#33A21F"], e: "👤", l: "Username", v: form.username },
    {
      g: ["#FF8A65", "#E4572E"],
      e: "⚡",
      l: "Gender",
      v: form.gender === "laki_laki" ? "Laki-laki" : "Perempuan",
    },
    { g: ["#FFD166", "#F2A93B"], e: "🎂", l: "Umur", v: `${form.umur} tahun` },
    { g: ["#5EEAD4", "#0F9C86"], e: "📏", l: "Tinggi", v: `${form.tb} cm` },
    { g: ["#9CFF5C", "#22A83E"], e: "⚖️", l: "Berat", v: `${form.bb} kg` },
    {
      g: ["#9CFF5C", "#5EEAD4"],
      e: "🎯",
      l: "Tujuan",
      v: { bulking: "Bulking", cutting: "Cutting", maintain: "Maintain" }[
        form.tujuan
      ],
    },
    {
      g: ["#FFD166", "#9CFF5C"],
      e: "🏃",
      l: "Aktivitas",
      v: {
        sangat_tidak_aktif: "Santai",
        aktivitas_ringan: "Ringan",
        aktivitas_sedang: "Sedang",
        aktivitas_berat: "Intensif",
      }[form.aktivitas],
    },
    {
      g: ["#5EEAD4", "#9CFF5C"],
      e: "💪",
      l: "Tipe",
      v: form.body_type
        ? form.body_type[0].toUpperCase() + form.body_type.slice(1)
        : "",
    },
  ];

  return (
    <View style={{ width: "100%" }}>
      <Text style={txt.eyebrow}>Hampir selesai!</Text>
      <Text style={txt.h1}>Semua</Text>
      <Text style={[txt.h1, { color: C.lime, marginBottom: 8 }]}>siap! 🌱</Text>
      <Text style={[txt.hint, { marginBottom: 22 }]}>
        Cek data sebelum mendaftar
      </Text>

      <Panel3D radius={24} glowColor={C.lime} style={{ marginBottom: 26 }}>
        <View style={{ paddingHorizontal: 16 }}>
          {rows.map(({ g, e, l, v }, i) => (
            <View
              key={l}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                gap: 12,
                borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(255,255,255,0.08)",
              }}
            >
              <LinearGradient
                colors={g}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={{ fontSize: 13 }}>{e}</Text>
              </LinearGradient>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: C.inkSub,
                  fontWeight: "700",
                }}
              >
                {l}
              </Text>
              <Text style={{ fontSize: 13, color: C.ink, fontWeight: "900" }}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      </Panel3D>

      <LanjutFab
        g={["#9CFF5C", "#FF8A65"]}
        onPress={onRegister}
        variant="fat"
        label={loading ? "Mendaftar..." : "Daftar Sekarang"}
        icon={loading ? "hourglass-outline" : "checkmark-circle-outline"}
      />
    </View>
  );
}
export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    gender: "",
    umur: 22,
    tb: 170,
    bb: 65,
    tujuan: "",
    aktivitas: "",
    body_type: "",
  });
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const fadeA = useRef(new Animated.Value(1)).current;
  const slideA = useRef(new Animated.Value(0)).current;
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isConfirm = step === STEPS.length;
  const s = isConfirm ? null : STEPS[step];
  const g = G[Math.min(step, G.length - 1)];
  useEffect(() => {
    if (step !== 0) return;
    const username = form.username?.trim();
    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameStatus(available ? "available" : "taken");
      } catch (e) {
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(t);
  }, [form.username, step]);

  const validate = () => {
    if (!s) return true;
    if (s.type === "text") {
      if (!form[s.field]?.trim()) {
        Alert.alert("Isi dulu!", "Field ini wajib diisi.");
        return false;
      }
      if (s.field === "password" && form.password.length < 6) {
        Alert.alert("Password kurang panjang", "Minimal 6 karakter.");
        return false;
      }
      if (s.field === "username") {
        if (usernameStatus === "checking") {
          Alert.alert(
            "Tunggu sebentar",
            "Masih mengecek ketersediaan username...",
          );
          return false;
        }
        if (usernameStatus === "taken") {
          Alert.alert("Username sudah dipakai", "Coba username lain, ya.");
          return false;
        }
        if (usernameStatus === "error") {
          Alert.alert(
            "Gagal mengecek",
            "Tidak bisa mengecek username sekarang. Coba lagi.",
          );
          return false;
        }
        if (usernameStatus !== "available") {
          Alert.alert(
            "Cek username dulu",
            "Tunggu status username muncul sebelum lanjut.",
          );
          return false;
        }
      }
    }
    if (["choice", "body", "gender"].includes(s.type) && !form[s.field]) {
      Alert.alert("Pilih dulu!", "Tolong pilih salah satu.");
      return false;
    }
    return true;
  };

  const tx = (cb, back = false) => {
    Animated.timing(fadeA, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      slideA.setValue(back ? -44 : 44);
      cb();
      Animated.parallel([
        Animated.timing(fadeA, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(slideA, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goNext = () => {
    if (!validate()) return;
    tx(() => setStep((p) => p + 1));
  };
  const goBack = () => {
    if (step === 0) {
      navigation.goBack?.();
      return;
    }
    tx(() => setStep((p) => p - 1), true);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await register({ ...form });
      await signIn(res?.user || null);
    } catch (err) {
      Alert.alert(
        "Gagal Daftar",
        err?.message || err?.response?.data?.error || "Coba lagi ya 🙏",
      );
    } finally {
      setLoading(false);
    }
  };

  const isText = s?.type === "text";

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <Background g={g} />

      <View style={{ flex: 1 }}>
        {}
        <View style={[mn.top, { paddingTop: insets.top + 6 }]}>
          {!isConfirm && (
            <View
              style={{ flexDirection: "row", gap: 4, alignItems: "center" }}
            >
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === step ? 24 : 6,
                    height: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                    backgroundColor:
                      i < step
                        ? g[0] + "77"
                        : i === step
                          ? "transparent"
                          : "rgba(255,255,255,0.12)",
                  }}
                >
                  {i === step && (
                    <LinearGradient
                      colors={g}
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          shadowColor: g[0],
                          shadowOpacity: 0.8,
                          shadowRadius: 6,
                        },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={isText && Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
          >
            <Animated.View
              style={{
                opacity: fadeA,
                transform: [{ translateY: slideA }],
                width: "100%",
              }}
            >
              {s?.type === "text" && (
                <TextStep
                  s={s}
                  form={form}
                  set={setF}
                  showPass={showPass}
                  setShowPass={setShowPass}
                  g={g}
                  onNext={goNext}
                  usernameStatus={usernameStatus}
                />
              )}
              {s?.type === "gender" && (
                <GenderStep
                  s={s}
                  form={form}
                  set={setF}
                  g={g}
                  onNext={goNext}
                />
              )}
              {s?.type === "age" && (
                <AgeStep form={form} set={setF} g={g} onNext={goNext} />
              )}
              {s?.type === "height" && (
                <HeightStep form={form} set={setF} g={g} onNext={goNext} />
              )}
              {s?.type === "weight" && (
                <WeightStep form={form} set={setF} g={g} onNext={goNext} />
              )}
              {s?.type === "choice" && (
                <ChoiceStep
                  s={s}
                  form={form}
                  set={setF}
                  g={g}
                  onNext={goNext}
                />
              )}
              {s?.type === "body" && (
                <BodyStep s={s} form={form} set={setF} g={g} onNext={goNext} />
              )}
              {isConfirm && (
                <ConfirmStep
                  form={form}
                  onRegister={handleRegister}
                  loading={loading}
                />
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        <View
          style={{ paddingBottom: insets.bottom + 10, alignItems: "center" }}
        >
          <Text
            style={{
              fontSize: 11,
              color: C.inkMuted,
              fontWeight: "600",
              letterSpacing: 0.5,
            }}
          >
            © {CURRENT_YEAR} Matchaby
          </Text>
        </View>
      </View>

      <BackButtonFloating
        onPress={goBack}
        bottom={insets.bottom + 16}
        left={20}
      />
    </View>
  );
}

const mn = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
});
