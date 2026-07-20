import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "../../theme";

const FAB_SIZE = 58;
const DEPTH_LAYERS = [
  { dx: 1, dy: 1.5, color: "rgba(0,0,0,0.55)" },
  { dx: 2, dy: 3, color: "rgba(0,0,0,0.42)" },
  { dx: 3.2, dy: 4.5, color: "rgba(0,0,0,0.30)" },
  { dx: 4.5, dy: 6.2, color: "rgba(0,0,0,0.18)" },
];

function OrbDepthStack({ size }) {
  return DEPTH_LAYERS.map((l, i) => (
    <View
      key={i}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: size / 2,
          backgroundColor: l.color,
          transform: [{ translateX: l.dx }, { translateY: l.dy }],
        },
      ]}
    />
  ));
}
function OrbShadowOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const NOISE_DOTS = Array.from({ length: 34 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.4 + Math.random() * 0.6,
  o: 0.04 + Math.random() * 0.06,
  dark: Math.random() > 0.55,
}));
function OrbTexture() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
    >
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
        />
      ))}
    </Svg>
  );
}

function OrbButton({
  size,
  onPress,
  onPressIn,
  onPressOut,
  children,
  accessibilityLabel,
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2 }}>
        <OrbDepthStack size={size} />
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityLabel={accessibilityLabel}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={["#1E8449", "#052E16"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[
              styles.orbInner,
              {
                borderRadius: size / 2,
                borderTopColor: "rgba(255,255,255,0.40)",
                borderLeftColor: "rgba(255,255,255,0.40)",
                borderRightColor: "rgba(0,0,0,0.45)",
                borderBottomColor: "rgba(0,0,0,0.55)",
              },
            ]}
          >
            <OrbShadowOverlay />
            <OrbTexture />
            {children}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FAB_ITEMS = [
  {
    key: "scan",
    label: "Scan Barcode",
    emoji: "▦",
    color: "#3B82F6",
    offset: 4,
  },
  {
    key: "ai",
    label: "Analisis AI",
    emoji: "✦",
    color: "#A855F7",
    offset: 3,
  },
  {
    key: "templates",
    label: "Meal Templates",
    emoji: "☰",
    color: "#F59E0B",
    offset: 2,
  },
  {
    key: "data",
    label: "Tambah Data",
    emoji: "+",
    color: Colors.primary,
    offset: 1,
  },
];

export default function FabMenu({
  bottomOffset = 100,
  onScan,
  onAI,
  onTambahData,
  onMealTemplates,
}) {
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const pressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    }).start();

  const toggleFab = () => {
    const toVal = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);
    Animated.spring(fabAnim, {
      toValue: toVal,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  };

  const ACTIONS = {
    scan: onScan,
    ai: onAI,
    templates: onMealTemplates,
    data: onTambahData,
  };
  const visibleItems = FAB_ITEMS.filter(
    (item) => typeof ACTIONS[item.key] === "function",
  );

  const handleItemPress = (key) => {
    toggleFab();
    ACTIONS[key]?.();
  };
  if (visibleItems.length === 0) return null;

  return (
    <>
      {}
      {fabOpen && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={toggleFab}
        />
      )}

      {}
      {visibleItems.map((item) => {
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(item.offset * 66)],
        });
        const opacity = fabAnim.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, 0, 1],
        });
        const scale = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        });

        return (
          <Animated.View
            key={item.key}
            style={[
              styles.fabItem,
              {
                bottom: bottomOffset,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
            pointerEvents={fabOpen ? "auto" : "none"}
          >
            <TouchableOpacity
              style={styles.fabItemLabel}
              onPress={() => handleItemPress(item.key)}
              activeOpacity={0.85}
            >
              <BlurView intensity={70} tint="light" style={styles.fabLabelBlur}>
                <Text style={styles.fabItemLabelText}>{item.label}</Text>
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { borderColor: item.color + "55" }]}
              onPress={() => handleItemPress(item.key)}
              activeOpacity={0.8}
            >
              <BlurView intensity={80} tint="light" style={styles.fabMiniBlur}>
                <Text style={[styles.fabMiniIcon, { color: item.color }]}>
                  {item.emoji}
                </Text>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {}
      <Text
        pointerEvents="none"
        style={[
          styles.deco,
          { bottom: bottomOffset + FAB_SIZE - 6, right: 8, fontSize: 13 },
        ]}
      >
        ✦
      </Text>

      {}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            bottom: bottomOffset,
            transform: [
              { scale: pressScale },
              {
                rotate: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          },
        ]}
      >
        <OrbButton
          size={FAB_SIZE}
          onPress={toggleFab}
          onPressIn={pressIn}
          onPressOut={pressOut}
          accessibilityLabel="Menu tambah"
        >
          <Text style={styles.plusGlyph}>+</Text>
        </OrbButton>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    zIndex: 90,
  },

  fabWrap: {
    position: "absolute",
    right: 20,
    zIndex: 100,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fabTouchable: { flex: 1, alignItems: "center", justifyContent: "center" },

  orbInner: {
    flex: 1,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "rgba(5,46,22,0.65)",
    shadowOffset: { width: 4, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 12,
  },
  plusGlyph: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: -2,
  },

  fabItem: {
    position: "absolute",
    right: 20,
    zIndex: 95,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fabItemLabel: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  fabLabelBlur: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  fabItemLabelText: { fontSize: 13, fontWeight: "700", color: Colors.text },
  fabMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  fabMiniBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
  },
  fabMiniIcon: { fontSize: 20, fontWeight: "800" },

  deco: { position: "absolute", color: "#DFFFE8", zIndex: 96 },
});
