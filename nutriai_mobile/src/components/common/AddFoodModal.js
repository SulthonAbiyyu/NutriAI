import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { submitDaily } from "../../services/DailyService";
import { getFoods } from "../../services/FoodService";

const CARD_BG_TOP = "#0B120D";
const CARD_BG_MID = "#060A07";
const CARD_BG_BOTTOM = "#020403";
const CARD_BORDER_TL = "rgba(255,255,255,0.10)";
const CARD_BORDER_BR = "rgba(0,0,0,0.55)";
const MODAL_RADIUS = 26;

const TEXT_PRIMARY = "#F1F5F9";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const ROW_BG_TOP = "#151C16";
const ROW_BG_BOTTOM = "#0A0F0A";
const MEAL_META = {
  Pagi: { icon: "sunrise", color: "#22C55E", time: "06.00 - 10.00" },
  Siang: { icon: "sun", color: "#22D3EE", time: "11.00 - 15.00" },
  Sore: { icon: "sunset", color: "#F97316", time: "15.00 - 18.00" },
  Malam: { icon: "moon", color: "#3B82F6", time: "18.00 - 23.00" },
};
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
function DepthStack({ radius = MODAL_RADIUS, layers }) {
  const L = layers || [
    { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
    { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
    { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
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
const NOISE_DOTS = Array.from({ length: 45 }).map(() => ({
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

function MealIcon({ icon, color, size = 20 }) {
  if (icon === "moon") return <MoonIcon color={color} size={size} />;
  if (icon === "sunrise")
    return <HorizonSunIcon color={color} size={size} direction="up" />;
  if (icon === "sunset")
    return <HorizonSunIcon color={color} size={size} direction="down" />;
  return <SunIcon color={color} size={size} />;
}
function HeaderIconBadge({ icon, color }) {
  return (
    <View style={styles.headerBadgeWrap}>
      <DepthStack
        radius={22}
        layers={[
          { dx: 1, dy: 1.5, color: "rgba(0,0,0,0.5)" },
          { dx: 2, dy: 3.5, color: "rgba(0,0,0,0.3)" },
        ]}
      />

      <LinearGradient
        colors={["#161D17", "#070B08"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.headerBadgeInner,
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
            styles.headerBadgeCircle,
            { backgroundColor: `${color}22`, borderColor: `${color}80` },
          ]}
        >
          <MealIcon icon={icon} color={color} size={18} />
        </View>
      </LinearGradient>
    </View>
  );
}
const bevel = (elevation = 4) =>
  Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: elevation * 0.4, height: elevation * 0.7 },
      shadowOpacity: 0.5,
      shadowRadius: elevation * 1.3,
    },
    android: { elevation },
  });
function DarkRow({ style, children }) {
  return (
    <LinearGradient
      colors={[ROW_BG_TOP, ROW_BG_BOTTOM]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.darkRowBase,
        {
          borderTopColor: "rgba(255,255,255,0.10)",
          borderLeftColor: "rgba(255,255,255,0.10)",
          borderRightColor: "rgba(0,0,0,0.4)",
          borderBottomColor: "rgba(0,0,0,0.5)",
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}
function CartRow({ item, onRemove, onChangePorsi, accent }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
  };

  const kal = Math.round((item.base_kalori || item.kalori) * item.porsi);
  const prot = Math.round((item.base_protein || item.protein) * item.porsi);

  return (
    <Animated.View
      style={[
        bevel(4),
        {
          transform: [{ scale: scaleAnim }],
          marginBottom: 8,
          borderRadius: 16,
        },
      ]}
    >
      <DarkRow style={styles.cartRow}>
        <Image
          source={item.image ? { uri: item.image } : null}
          style={styles.cartRowImg}
          resizeMode="cover"
        />

        <View style={styles.cartRowInfo}>
          <Text style={styles.cartRowName} numberOfLines={1}>
            {item.nama_makanan}
          </Text>
          <Text style={styles.cartRowMacro}>
            {prot}g protein · {kal} kcal
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepBtn, bevel(3)]}
              onPress={() => {
                bounce();
                onChangePorsi(item._uid, Math.max(0.5, item.porsi - 0.5));
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.stepLabel, { color: accent }]}>−</Text>
            </TouchableOpacity>
            <View style={[styles.stepDisplay, bevel(2)]}>
              <Text style={styles.stepValue}>{item.porsi}×</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepBtn, bevel(3)]}
              onPress={() => {
                bounce();
                onChangePorsi(item._uid, item.porsi + 0.5);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.stepLabel, { color: accent }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.removeBtn, bevel(3)]}
          onPress={() => onRemove(item._uid)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </DarkRow>
    </Animated.View>
  );
}
export default function AddFoodModal({ visible, waktu, onClose, onSuccess }) {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const meta = MEAL_META[waktu] || MEAL_META.Pagi;
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 10,
          tension: 60,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSearchResult([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getFoods(text, 1, 15);
        setSearchResult(res.data || []);
      } catch {
        setSearchResult([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };
  const addToCart = (food) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === food.id);
      if (exists)
        return prev.map((c) =>
          c.id === food.id ? { ...c, porsi: Math.min(10, c.porsi + 1) } : c,
        );
      return [
        ...prev,
        {
          ...food,
          _uid: `${food.id}_${Math.random().toString(36).slice(2)}`,
          porsi: 1,
          base_protein: food.protein,
          base_kalori: food.kalori,
        },
      ];
    });
    setSearch("");
    setSearchResult([]);
  };

  const removeFromCart = (uid) =>
    setCart((prev) => prev.filter((c) => c._uid !== uid));
  const changePorsi = (uid, v) =>
    setCart((prev) =>
      prev.map((c) => (c._uid === uid ? { ...c, porsi: v } : c)),
    );

  const cartTotal = cart.reduce(
    (acc, c) => ({
      kalori: acc.kalori + (c.base_kalori || c.kalori) * c.porsi,
      protein: acc.protein + (c.base_protein || c.protein) * c.porsi,
    }),
    { kalori: 0, protein: 0 },
  );
  const handleSubmit = async () => {
    if (cart.length === 0)
      return Alert.alert("Keranjang Kosong", "Pilih makanan terlebih dahulu");
    setSubmitting(true);
    try {
      const payload = cart.map((item) => ({
        nama_makanan: item.nama_makanan,
        porsi: item.porsi,
        protein: (item.base_protein || item.protein) * item.porsi,
        kalori: (item.base_kalori || item.kalori) * item.porsi,
        karbo: (item.karbo || 0) * item.porsi,
        lemak: (item.lemak || 0) * item.porsi,
        waktu_makan: waktu,
        image: item.image || "",
      }));
      await submitDaily(payload);
      handleClose();
      onSuccess();
      Alert.alert(
        "✅ Berhasil",
        `${cart.length} makanan ditambahkan ke ${waktu}`,
      );
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCart([]);
    setSearch("");
    setSearchResult([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      {}
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        {}
        <Animated.View
          style={[
            styles.modalOuter,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <DepthStack radius={MODAL_RADIUS} />
          <LinearGradient
            colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={[
              styles.modalCard,
              {
                borderTopColor: CARD_BORDER_TL,
                borderLeftColor: CARD_BORDER_TL,
                borderRightColor: CARD_BORDER_BR,
                borderBottomColor: CARD_BORDER_BR,
              },
            ]}
          >
            <ShadowOverlay />
            <Texture opacity={0.7} />

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              {}
              <View style={styles.handle} />

              {}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <HeaderIconBadge icon={meta.icon} color={meta.color} />
                  <View>
                    <Text style={[styles.headerTitle, { color: meta.color }]}>
                      Tambah Makanan
                    </Text>
                    <Text style={styles.headerSub}>
                      {waktu} · {meta.time}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, bevel(3)]}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {}
              <DarkRow style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari makanan, brand, atau menu..."
                  placeholderTextColor={TEXT_MUTED}
                  value={search}
                  onChangeText={handleSearch}
                  autoFocus
                />

                {search ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearch("");
                      setSearchResult([]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ color: TEXT_MUTED, fontSize: 15 }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </DarkRow>

              {}
              <ScrollView
                style={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {}
                {searching && (
                  <ActivityIndicator
                    size="small"
                    color={meta.color}
                    style={{ marginVertical: 16 }}
                  />
                )}

                {}
                {!searching && searchResult.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.sectionLabel}>Hasil Pencarian</Text>
                    {searchResult.map((food) => (
                      <TouchableOpacity
                        key={food.id}
                        onPress={() => addToCart(food)}
                        activeOpacity={0.75}
                        style={[
                          bevel(3),
                          { marginBottom: 8, borderRadius: 16 },
                        ]}
                      >
                        <DarkRow style={styles.resultRow}>
                          <Image
                            source={food.image ? { uri: food.image } : null}
                            style={styles.resultThumb}
                            resizeMode="cover"
                          />

                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultName}>
                              {food.nama_makanan}
                            </Text>
                            <Text style={styles.resultMacro}>
                              {food.protein}g protein · {food.kalori} kcal
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.addBtn,
                              bevel(3),
                              { borderColor: `${meta.color}55` },
                            ]}
                          >
                            <Text
                              style={{
                                color: meta.color,
                                fontWeight: "800",
                                fontSize: 18,
                                lineHeight: 20,
                              }}
                            >
                              +
                            </Text>
                          </View>
                        </DarkRow>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {search.length > 2 &&
                  !searching &&
                  searchResult.length === 0 && (
                    <Text style={styles.noResult}>
                      Makanan tidak ditemukan 😕
                    </Text>
                  )}

                {}
                {cart.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <View style={styles.cartHeader}>
                      <Text style={styles.sectionLabel}>
                        Keranjang ({cart.length})
                      </Text>
                      <Text style={[styles.cartTotal, { color: meta.color }]}>
                        {Math.round(cartTotal.protein)}g ·{" "}
                        {Math.round(cartTotal.kalori)} kcal
                      </Text>
                    </View>
                    {cart.map((item) => (
                      <CartRow
                        key={item._uid}
                        item={item}
                        onRemove={removeFromCart}
                        onChangePorsi={changePorsi}
                        accent={meta.color}
                      />
                    ))}
                  </View>
                )}

                {}
                {cart.length === 0 && search.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🍽️</Text>
                    <Text style={styles.emptyText}>Cari makanan di atas</Text>
                    <Text style={styles.emptyHint}>
                      Ketik nama makanan untuk mulai menambahkan
                    </Text>
                  </View>
                )}
              </ScrollView>

              {}
              {cart.length > 0 && (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={[bevel(6), submitting && { opacity: 0.6 }]}
                >
                  <LinearGradient
                    colors={[meta.color, shade(meta.color, -0.25)]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.submitBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Simpan ke {waktu} ({cart.length} item)
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
function shade(hex, amt) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round(255 * amt);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * amt);
  let b = (num & 0x0000ff) + Math.round(255 * amt);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,5,3,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalOuter: {
    width: "100%",
    borderRadius: MODAL_RADIUS,
    position: "relative",
    maxHeight: "88%",
  },
  modalCard: {
    borderRadius: MODAL_RADIUS,
    borderWidth: 1.5,
    padding: 20,
    paddingTop: 14,
    overflow: "hidden",
  },

  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  headerSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },

  headerBadgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: "relative",
  },
  headerBadgeInner: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 14, color: TEXT_MUTED, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRIMARY },
  body: { maxHeight: 380 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  darkRowBase: {
    borderRadius: 16,
    borderWidth: 1.2,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  resultThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  resultName: { fontSize: 13, fontWeight: "700", color: TEXT_PRIMARY },
  resultMacro: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  noResult: {
    textAlign: "center",
    color: TEXT_MUTED,
    fontSize: 13,
    paddingVertical: 24,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cartTotal: { fontSize: 12, fontWeight: "700" },

  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  cartRowImg: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cartRowInfo: { flex: 1, gap: 2 },
  cartRowName: { fontSize: 13, fontWeight: "700", color: TEXT_PRIMARY },
  cartRowMacro: { fontSize: 11, color: TEXT_MUTED },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 6,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 15, fontWeight: "700", lineHeight: 17 },
  stepDisplay: {
    width: 38,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 12, fontWeight: "700", color: TEXT_PRIMARY },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: { fontSize: 11, color: "#F87171", fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptyHint: { fontSize: 12, color: TEXT_MUTED, textAlign: "center" },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
