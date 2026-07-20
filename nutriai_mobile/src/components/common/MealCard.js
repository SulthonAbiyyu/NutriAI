import { LinearGradient } from "expo-linear-gradient";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { deleteDaily } from "../../services/DailyService";

const CARD_BG_TOP = "#0B120D";
const CARD_BG_MID = "#060A07";
const CARD_BG_BOTTOM = "#020403";
const CARD_BORDER_TL = "rgba(255,255,255,0.10)";
const CARD_BORDER_BR = "rgba(0,0,0,0.55)";
const CARD_RADIUS = 22;

const IMG_COL_WIDTH = 90;
const BADGE_WIDTH = 50;
const BADGE_RADIUS = 14;
const BADGE_HALF_HEIGHT = 26;

const MEAL_CONFIG = [
  {
    label: "Sarapan",
    short: "PAGI",
    time: "06.00 - 10.00",
    img: require("../../../assets/pagi.png"),
    icon: "sunrise",
    accent: "#22C55E",
  },
  {
    label: "Siang",
    short: "SIANG",
    time: "11.00 - 15.00",
    img: require("../../../assets/siang.png"),
    icon: "sun",
    accent: "#22D3EE",
  },
  {
    label: "Sore",
    short: "SORE",
    time: "15.00 - 18.00",
    img: require("../../../assets/sore.png"),
    icon: "sunset",
    accent: "#F97316",
  },
  {
    label: "Malam",
    short: "MALAM",
    time: "18.00 - 23.00",
    img: require("../../../assets/malam.png"),
    icon: "moon",
    accent: "#3B82F6",
  },
];

const WAKTU_INDEX = { Pagi: 0, Siang: 1, Sore: 2, Malam: 3 };
function ShadowOverlay({ opacity = 0.3 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = CARD_RADIUS, layers = DEPTH_LAYERS }) {
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
  r: 0.3 + Math.random() * 0.55,
  o: 0.035 + Math.random() * 0.05,
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
function SunIcon({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="5.2" fill={color} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 12 + Math.cos(rad) * 8.2;
        const y1 = 12 + Math.sin(rad) * 8.2;
        const x2 = 12 + Math.cos(rad) * 10.6;
        const y2 = 12 + Math.sin(rad) * 10.6;
        return (
          <Path
            key={deg}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function MoonIcon({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.2 14.7A8.6 8.6 0 1 1 9.3 3.8a7 7 0 0 0 10.9 10.9Z"
        fill={color}
      />
    </Svg>
  );
}
function HorizonSunIcon({ color, size = 20, direction = "up" }) {
  const yFar = direction === "up" ? 9 : 3.5;
  const yNear = direction === "up" ? 3.5 : 9;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 18h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M6.3 18a5.7 5.7 0 0 1 11.4 0Z" fill={color} />
      {[8, 12, 16].map((x) => (
        <Path
          key={x}
          d={`M${x} ${yFar} V${yNear}`}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
function TimeBadge({ short, icon, accent }) {
  return (
    <View style={[styles.badgeWrap, { shadowColor: accent }]}>
      <DepthStack
        radius={BADGE_RADIUS}
        layers={[
          { dx: 1, dy: 1.5, color: "rgba(0,0,0,0.5)" },
          { dx: 2, dy: 3.5, color: "rgba(0,0,0,0.32)" },
          { dx: 3.5, dy: 6, color: "rgba(0,0,0,0.18)" },
        ]}
      />

      <LinearGradient
        colors={["#161D17", "#070B08"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.badgeInner,
          {
            borderTopColor: "rgba(255,255,255,0.20)",
            borderLeftColor: "rgba(255,255,255,0.20)",
            borderRightColor: "rgba(0,0,0,0.45)",
            borderBottomColor: "rgba(0,0,0,0.55)",
          },
        ]}
      >
        <Texture opacity={0.55} />
        <View
          style={[
            styles.badgeIconWrap,
            { backgroundColor: `${accent}22`, borderColor: `${accent}80` },
          ]}
        >
          {icon === "moon" && <MoonIcon color={accent} size={14} />}
          {icon === "sunrise" && (
            <HorizonSunIcon color={accent} size={14} direction="up" />
          )}
          {icon === "sunset" && (
            <HorizonSunIcon color={accent} size={14} direction="down" />
          )}
          {icon === "sun" && <SunIcon color={accent} size={14} />}
        </View>
        <Text
          style={[styles.badgeLabel, { color: accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {short}
        </Text>
      </LinearGradient>
    </View>
  );
}

export default function MealCard({
  waktu,
  items = [],
  onTambahMakanan,
  onDeleteEntry,
}) {
  const config = MEAL_CONFIG[WAKTU_INDEX[waktu]];
  const totalKal = items.reduce((s, it) => s + (it.food?.kalori || 0), 0);
  const isEmpty = items.length === 0;
  const status = isEmpty ? "Belum diisi" : "Tercatat";
  const statusBg = isEmpty ? "rgba(148,163,184,0.15)" : "rgba(34,197,94,0.16)";
  const statusColor = isEmpty ? "#94A3B8" : "#4ADE80";

  const handleDeleteItem = (item) => {
    Alert.alert("Hapus", `Hapus ${item.food?.nama_makanan}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDaily(item.id);
            onDeleteEntry();
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={[styles.cardOuter, { shadowColor: "rgba(0,0,0,0.6)" }]}>
      {}
      <DepthStack />

      {}
      <LinearGradient
        colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[
          styles.cardInner,
          {
            borderTopColor: CARD_BORDER_TL,
            borderLeftColor: CARD_BORDER_TL,
            borderRightColor: CARD_BORDER_BR,
            borderBottomColor: CARD_BORDER_BR,
          },
        ]}
      >
        {}
        <ShadowOverlay />
        <Texture />

        <View style={styles.mealTopRow}>
          <Image
            source={config.img}
            style={styles.mealCardImg}
            resizeMode="cover"
          />

          {}
          <View style={styles.mealCardBody}>
            <View style={styles.mealCardHeader}>
              <View style={styles.mealCardTitleRow}>
                <Text style={styles.mealCardTitle}>{waktu}</Text>
                <Text style={[styles.mealCardTime, { color: config.accent }]}>
                  {config.time}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.mealStatusBadge, { backgroundColor: statusBg }]}
                onPress={() => onTambahMakanan(waktu)}
                activeOpacity={0.7}
              >
                {!isEmpty && (
                  <Text
                    style={[styles.mealStatusCheck, { color: statusColor }]}
                  >
                    ✓
                  </Text>
                )}
                <Text style={[styles.mealStatusText, { color: statusColor }]}>
                  {status}
                </Text>
                <Text style={[styles.mealStatusChev, { color: statusColor }]}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>

            {!isEmpty ? (
              <Text style={styles.mealKaloriSum}>
                {items.length} makanan ·{" "}
                <Text style={{ color: config.accent, fontWeight: "700" }}>
                  {totalKal} kkal
                </Text>
              </Text>
            ) : (
              <Text style={styles.mealEmpty}>Belum ada makanan</Text>
            )}

            {items.map((item, idx) => (
              <View key={item.id || idx} style={styles.mealFoodRow}>
                <View style={styles.mealFoodThumb}>
                  {item.food?.image ? (
                    <Image
                      source={{ uri: item.food.image }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 18 }}>🍽</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealFoodName} numberOfLines={1}>
                    {item.food?.nama_makanan}
                  </Text>
                  <Text style={styles.mealFoodPorsi}>
                    {item.food?.porsi || 1} porsi
                  </Text>
                </View>
                <Text style={styles.mealFoodKal}>{item.food?.kalori} kkal</Text>
                <TouchableOpacity
                  style={styles.mealFoodMenu}
                  onPress={() => handleDeleteItem(item)}
                >
                  <Text style={styles.mealFoodMenuDot}>⋮</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.mealAddBtn}
              onPress={() => onTambahMakanan(waktu)}
              activeOpacity={0.7}
            >
              <Text style={styles.mealAddBtnText}>+ Tambah Makanan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.badgeAnchor} pointerEvents="box-none">
        <TimeBadge
          short={config.short}
          icon={config.icon}
          accent={config.accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: CARD_RADIUS,
    marginBottom: 22,
    position: "relative",
    shadowOffset: { width: 5, height: 11 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 9,
  },
  cardInner: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    overflow: "hidden",
  },

  mealTopRow: { flexDirection: "row" },

  mealCardImg: {
    width: IMG_COL_WIDTH,
    height: "100%",
    minHeight: 80,
    borderTopRightRadius: 46,
    borderBottomRightRadius: 46,
  },

  mealCardBody: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  mealCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  mealCardTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  mealCardTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  mealCardTime: { fontSize: 11.5, fontWeight: "600" },

  mealStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mealStatusCheck: { fontSize: 11, fontWeight: "800" },
  mealStatusText: { fontSize: 11, fontWeight: "700" },
  mealStatusChev: { fontSize: 14, fontWeight: "700" },

  mealKaloriSum: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 7,
    marginTop: 1,
  },
  mealEmpty: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 5,
    marginTop: 1,
    fontStyle: "italic",
  },

  mealFoodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  mealFoodThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mealFoodName: { fontSize: 13, fontWeight: "600", color: "#F1F5F9" },
  mealFoodPorsi: {
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    marginTop: 1,
  },
  mealFoodKal: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  mealFoodMenu: { padding: 6 },
  mealFoodMenuDot: {
    fontSize: 18,
    color: "rgba(255,255,255,0.40)",
    lineHeight: 20,
  },

  mealAddBtn: {
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.45)",
    borderStyle: "dashed",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  mealAddBtnText: { fontSize: 13, fontWeight: "700", color: "#4ADE80" },
  badgeAnchor: {
    position: "absolute",
    top: "50%",
    marginTop: -BADGE_HALF_HEIGHT,
    left: 6,
    zIndex: 20,
  },
  badgeWrap: {
    width: BADGE_WIDTH,
    height: BADGE_HALF_HEIGHT * 2,
    borderRadius: BADGE_RADIUS,
    position: "relative",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeInner: {
    height: BADGE_HALF_HEIGHT * 2,
    borderRadius: BADGE_RADIUS,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    overflow: "hidden",
  },
  badgeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  badgeLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
