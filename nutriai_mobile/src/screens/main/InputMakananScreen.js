import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ROUTES } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { getDaily, submitDaily } from "../../services/DailyService";
import { Radius, Spacing } from "../../theme";

const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";

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

const ICON_DEPTH_LAYERS = [
  { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
  { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
  { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
  { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = 16 }) {
  return (
    <>
      {ICON_DEPTH_LAYERS.map((l, i) => (
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

import AddFoodModal from "../../components/common/AddFoodModal";
import AiAnalyzeModal from "../../components/common/AiAnalyzeModal";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import CartSection from "../../components/common/CartSection";
import FabMenu from "../../components/common/FabMenu";
import MealCard from "../../components/common/MealCard";

const WAKTU_OPTS = ["Pagi", "Siang", "Sore", "Malam"];
const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const HARI_MINI = ["M", "S", "S", "R", "K", "J", "S"];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a, b) {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const PICKER_BG_TOP = "#0B120D";
const PICKER_BG_MID = "#060A07";
const PICKER_BG_BOTTOM = "#020403";
const PICKER_RADIUS = 22;

function DatePickerModal({ visible, initialDate, onClose, onSelect }) {
  const [cursor, setCursor] = useState(initialDate || new Date());

  useEffect(() => {
    if (visible) setCursor(initialDate || new Date());
  }, [visible]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goMonth = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.pickerOuter}
        >
          {[
            { dx: 1.5, dy: 2.5, o: 0.55 },
            { dx: 3, dy: 5, o: 0.4 },
            { dx: 5, dy: 7.5, o: 0.26 },
          ].map((l, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: PICKER_RADIUS,
                  backgroundColor: `rgba(0,0,0,${l.o})`,
                  transform: [{ translateX: l.dx }, { translateY: l.dy }],
                },
              ]}
            />
          ))}
          <LinearGradient
            colors={[PICKER_BG_TOP, PICKER_BG_MID, PICKER_BG_BOTTOM]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.pickerCard}
          >
            {}
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                style={styles.pickerNavBtn}
                onPress={() => goMonth(-1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.pickerNavTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerMonthLabel}>
                {BULAN[month]} {year}
              </Text>
              <TouchableOpacity
                style={styles.pickerNavBtn}
                onPress={() => goMonth(1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.pickerNavTxt}>›</Text>
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.pickerWeekRow}>
              {HARI_MINI.map((h, i) => (
                <Text key={i} style={styles.pickerWeekLabel}>
                  {h}
                </Text>
              ))}
            </View>

            {}
            <View style={styles.pickerGrid}>
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={styles.pickerCell} />;
                const cellDate = new Date(year, month, d);
                const selected = isSameDay(cellDate, initialDate);
                const isToday = !selected && isSameDay(cellDate, new Date());
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.pickerCell}
                    onPress={() => onSelect(cellDate)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.pickerDayWrap,
                        selected && styles.pickerDaySelected,
                        isToday && styles.pickerDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerDayTxt,
                          selected && styles.pickerDayTxtSelected,
                        ]}
                      >
                        {d}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.pickerTodayBtn}
              onPress={() => onSelect(new Date())}
              activeOpacity={0.8}
            >
              <Text style={styles.pickerTodayTxt}>Hari ini</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function InputMakananScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [waktu, setWaktu] = useState("Pagi");
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [addModal, setAddModal] = useState({ visible: false, waktu: "Pagi" });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const today = selectedDate;

  const { data: dailyData, execute: refreshDaily } = useApi(getDaily);
  useEffect(() => {
    refreshDaily(toISODate(selectedDate));
  }, [selectedDate]);
  useRefreshOnFocus(
    useCallback(() => refreshDaily(toISODate(selectedDate)), [selectedDate]),
  );
  const addToCart = (food) => {
    const exists = cart.find(
      (c) => c.id === food.id && !food.fromAI && !food.fromBarcode,
    );
    if (exists) {
      setCart((prev) =>
        prev.map((c) =>
          c.id === food.id ? { ...c, porsi: Math.min(10, c.porsi + 1) } : c,
        ),
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          ...food,
          _uid: `${food.id || Date.now()}_${Math.random().toString(36).slice(2)}`,
          porsi: 1,
          base_protein: food.protein,
          base_kalori: food.kalori,
        },
      ]);
    }
  };

  const removeFromCart = (uid) =>
    setCart((prev) => prev.filter((c) => c._uid !== uid));
  const changePorsi = (uid, v) =>
    setCart((prev) =>
      prev.map((c) => (c._uid === uid ? { ...c, porsi: v } : c)),
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
      setCart([]);
      await refreshDaily(toISODate(selectedDate));
      Alert.alert("✅ Berhasil", `${cart.length} item ditambahkan ke ${waktu}`);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteEntry = useCallback(
    () => refreshDaily(toISODate(selectedDate)),
    [refreshDaily, selectedDate],
  );
  const openAddModal = (waktu) => setAddModal({ visible: true, waktu });
  const grouped = dailyData?.grouped || {};

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
        <View style={styles.titleRow}>
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
                source={require("../../../assets/makanan.png")}
                style={styles.titleIconImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <View style={styles.titleStack}>
            <Text style={styles.titleShadow}>Input Makanan</Text>
            <Text style={styles.title}>Input Makanan</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.dateBadge}
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(true)}
        >
          <LinearGradient
            colors={["#4ADE80", "#15803D"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.calIcon}
          >
            <View style={styles.calTab1} />
            <View style={styles.calTab2} />
            <Text style={styles.calNum}>{today.getDate()}</Text>
          </LinearGradient>
          <Text style={styles.dateText}>
            {today.getDate()} {BULAN[today.getMonth()]} {today.getFullYear()}
          </Text>
          <Text style={styles.dateChev}>﹀</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 130 },
          ]}
        >
          {}
          {WAKTU_OPTS.map((w) => (
            <MealCard
              key={w}
              waktu={w}
              items={grouped[w] || []}
              onTambahMakanan={openAddModal}
              onDeleteEntry={onDeleteEntry}
            />
          ))}

          {}
          <CartSection
            cart={cart}
            waktu={waktu}
            submitting={submitting}
            onRemove={removeFromCart}
            onChangePorsi={changePorsi}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

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
        style={[styles.footerBox, { height: insets.bottom + 108 }]}
      />

      {}
      <FabMenu
        bottomOffset={insets.bottom + 30}
        onScan={() =>
          navigation.navigate(ROUTES.BARCODE_SCANNER, { onScanned: addToCart })
        }
        onAI={() => setShowAI(true)}
        onTambahData={() => navigation.navigate("TambahData")}
        onMealTemplates={() => navigation.navigate("MealTemplates")}
      />

      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.navigate("Dashboard")}
      />

      {}
      <AiAnalyzeModal
        visible={showAI}
        onClose={() => setShowAI(false)}
        onAdd={addToCart}
      />

      {}
      <DatePickerModal
        visible={showDatePicker}
        initialDate={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => {
          setSelectedDate(d);
          setShowDatePicker(false);
        }}
      />

      {}
      <AddFoodModal
        visible={addModal.visible}
        waktu={addModal.waktu}
        onClose={() => setAddModal((prev) => ({ ...prev, visible: false }))}
        onSuccess={() => refreshDaily(toISODate(selectedDate))}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 14,
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
  title: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textShadowColor: "rgba(61,255,143,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(6,10,7,0.85)",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "rgba(61,255,143,0.4)",
  },
  calIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "visible",
  },
  calTab1: {
    position: "absolute",
    top: -3,
    left: 5,
    width: 2.5,
    height: 5,
    borderRadius: 1.5,
    backgroundColor: "#DFFFE8",
  },
  calTab2: {
    position: "absolute",
    top: -3,
    right: 5,
    width: 2.5,
    height: 5,
    borderRadius: 1.5,
    backgroundColor: "#DFFFE8",
  },
  calNum: { fontSize: 10, fontWeight: "900", color: "#FFFFFF" },
  dateText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  dateChev: { fontSize: 12, color: "rgba(200,255,220,0.7)", marginTop: -1 },

  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  footerBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,5,3,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  pickerOuter: {
    width: "100%",
    maxWidth: 340,
    borderRadius: PICKER_RADIUS,
    position: "relative",
  },
  pickerCard: {
    borderRadius: PICKER_RADIUS,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    padding: 18,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerNavTxt: { fontSize: 17, fontWeight: "800", color: "#4ADE80" },
  pickerMonthLabel: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  pickerWeekRow: { flexDirection: "row", marginBottom: 4 },
  pickerWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
  },

  pickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  pickerCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  pickerDayWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerDayToday: {
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.6)",
  },
  pickerDaySelected: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pickerDayTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  pickerDayTxtSelected: { color: "#04140A", fontWeight: "800" },

  pickerTodayBtn: {
    marginTop: 14,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(74,222,128,0.4)",
    borderStyle: "dashed",
  },
  pickerTodayTxt: { fontSize: 12.5, fontWeight: "700", color: "#4ADE80" },
});
