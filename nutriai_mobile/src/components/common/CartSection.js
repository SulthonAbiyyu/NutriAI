import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../../theme";
import Card from "./Card";
const NM_BASE = "#ECF0F3";
const NM_LIGHT = "#FFFFFF";
const NM_DARK = "#C8CDD5";

const nm = (elevation = 6, inset = false) => {
  const h = inset ? -elevation : elevation;
  return Platform.select({
    ios: {
      shadowColor: NM_DARK,
      shadowOffset: { width: h, height: h },
      shadowOpacity: 0.9,
      shadowRadius: elevation * 1.5,
    },
    android: {
      elevation: inset ? 0 : elevation,
    },
  });
};
const nmHighlight = (elevation = 6) => ({
  borderTopWidth: Platform.OS === "android" ? 1.5 : 0,
  borderLeftWidth: Platform.OS === "android" ? 1.5 : 0,
  borderTopColor: NM_LIGHT,
  borderLeftColor: NM_LIGHT,
});
function NmCartRow({ item, onRemove, onChangePorsi }) {
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

  const protein = (item.base_protein || item.protein) * item.porsi;
  const kalori = (item.base_kalori || item.kalori) * item.porsi;

  return (
    <Animated.View
      style={[styles.nmRow, nm(5), { transform: [{ scale: scaleAnim }] }]}
    >
      {}
      <Image
        source={item.image ? { uri: item.image } : null}
        style={styles.nmRowImage}
        resizeMode="cover"
      />

      {}
      <View style={styles.nmRowInfo}>
        <Text style={styles.nmRowName} numberOfLines={1}>
          {item.nama_makanan}
        </Text>
        <Text style={styles.nmRowMacro}>
          {Math.round(protein)}g protein · {Math.round(kalori)} kcal
        </Text>

        {}
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, nm(3)]}
            onPress={() => {
              bounce();
              onChangePorsi(item._uid, Math.max(0.5, item.porsi - 0.5));
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepperLabel}>−</Text>
          </TouchableOpacity>

          <View style={[styles.stepperDisplay, nm(3, true)]}>
            <Text style={styles.stepperValue}>{item.porsi}×</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepperBtn, nm(3)]}
            onPress={() => {
              bounce();
              onChangePorsi(item._uid, item.porsi + 0.5);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepperLabel}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <TouchableOpacity
        style={[styles.nmRemoveBtn, nm(3)]}
        onPress={() => onRemove(item._uid)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.nmRemoveIcon}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
function MacroBar({ label, value, max, color, unit }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.macroBarWrap}>
      <View style={styles.macroBarLabelRow}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarValue, { color }]}>
          {Math.round(value)}
          {unit}
        </Text>
      </View>
      <View style={[styles.macroBarTrack, nm(2, true)]}>
        <Animated.View
          style={[
            styles.macroBarFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}
export default function CartSection({
  cart,
  waktu,
  submitting,
  onRemove,
  onChangePorsi,
  onSubmit,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (cart.length === 0) return;
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.4,
        useNativeDriver: true,
        friction: 4,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
    ]).start();
  }, [cart.length]);

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 10,
        tension: 60,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  if (cart.length === 0) return null;

  const cartTotal = cart.reduce(
    (acc, c) => ({
      protein: acc.protein + (c.base_protein || c.protein) * c.porsi,
      kalori: acc.kalori + (c.base_kalori || c.kalori) * c.porsi,
    }),
    { protein: 0, kalori: 0 },
  );
  const TARGET_PROTEIN = 60;
  const TARGET_KALORI = 2000;

  const modalScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const modalOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {}
      <TouchableOpacity activeOpacity={0.85} onPress={openModal}>
        <Card style={[styles.cartCard, nm(8)]}>
          <View style={styles.cartHeader}>
            <View style={styles.cartTitleRow}>
              <Text style={styles.sectionTitle}>Keranjang</Text>
              <Animated.View
                style={[
                  styles.badge,
                  nm(3),
                  { transform: [{ scale: badgeScale }] },
                ]}
              >
                <Text style={styles.badgeText}>{cart.length}</Text>
              </Animated.View>
            </View>
            <View style={styles.cartTotalCol}>
              <Text style={styles.cartTotalPrimary}>
                {Math.round(cartTotal.kalori)} kcal
              </Text>
              <Text style={styles.cartTotalSub}>
                {Math.round(cartTotal.protein)}g protein
              </Text>
            </View>
          </View>

          {}
          <View style={styles.imageStrip}>
            {cart.slice(0, 4).map((item, i) => (
              <View
                key={item._uid}
                style={[
                  styles.stripImageWrap,
                  nm(3),
                  { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i },
                ]}
              >
                <Image
                  source={item.image ? { uri: item.image } : null}
                  style={styles.stripImage}
                  resizeMode="cover"
                />
              </View>
            ))}
            {cart.length > 4 && (
              <View
                style={[
                  styles.stripImageWrap,
                  styles.stripMore,
                  nm(3),
                  { marginLeft: -10 },
                ]}
              >
                <Text style={styles.stripMoreText}>+{cart.length - 4}</Text>
              </View>
            )}
            <Text style={styles.tapHint}>Ketuk untuk detail →</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {}
      <Modal
        transparent
        visible={modalVisible}
        statusBarTranslucent
        animationType="none"
        onRequestClose={closeModal}
      >
        {}
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {}
        <View style={styles.modalWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.modalCard,
              nm(16),
              { transform: [{ scale: modalScale }], opacity: modalOpacity },
            ]}
          >
            {}
            <View style={[styles.handle, nm(2, true)]} />

            {}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Keranjang</Text>
                <Text style={styles.modalSubtitle}>
                  Simpan ke sesi{" "}
                  <Text style={{ color: Colors.primary }}>{waktu}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, nm(5)]}
                onPress={closeModal}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {}
            <View style={[styles.macroCard, nm(4, true)]}>
              <MacroBar
                label="Protein"
                value={cartTotal.protein}
                max={TARGET_PROTEIN}
                color="#5A8DF5"
                unit="g"
              />
              <MacroBar
                label="Kalori"
                value={cartTotal.kalori}
                max={TARGET_KALORI}
                color="#F5925A"
                unit=" kcal"
              />
            </View>

            {}
            <ScrollView
              style={styles.itemScroll}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {cart.map((item) => (
                <NmCartRow
                  key={item._uid}
                  item={item}
                  onRemove={(uid) => {
                    if (cart.length === 1) closeModal();
                    onRemove(uid);
                  }}
                  onChangePorsi={onChangePorsi}
                />
              ))}
            </ScrollView>

            {}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                nm(6),
                submitting && styles.saveBtnDisabled,
              ]}
              disabled={submitting}
              onPress={() => {
                onSubmit();
                closeModal();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {submitting ? "Menyimpan…" : `Simpan ke ${waktu}`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  cartCard: {
    marginBottom: 14,
    backgroundColor: NM_BASE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 0,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text || "#2D3A4A",
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: Colors.primary || "#5A8DF5",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cartTotalCol: { alignItems: "flex-end" },
  cartTotalPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary || "#5A8DF5",
  },
  cartTotalSub: { fontSize: 12, color: "#7A8A9A", marginTop: 1 },

  imageStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stripImageWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: NM_BASE,
    borderWidth: 2,
    borderColor: NM_BASE,
  },
  stripImage: { width: "100%", height: "100%" },
  stripMore: {
    backgroundColor: Colors.primary || "#5A8DF5",
    alignItems: "center",
    justifyContent: "center",
  },
  stripMoreText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tapHint: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9AAABB",
    fontStyle: "italic",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,28,40,0.55)",
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "82%",
    backgroundColor: NM_BASE,
    borderRadius: 28,
    padding: 20,
    paddingTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.28,
        shadowRadius: 36,
      },
      android: { elevation: 24 },
    }),
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: NM_DARK,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text || "#2D3A4A",
    letterSpacing: 0.2,
  },
  modalSubtitle: { fontSize: 13, color: "#7A8A9A", marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: NM_BASE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 14, color: "#7A8A9A", fontWeight: "600" },
  macroCard: {
    backgroundColor: NM_BASE,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  macroBarWrap: { gap: 4 },
  macroBarLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  macroBarLabel: { fontSize: 12, color: "#7A8A9A", fontWeight: "600" },
  macroBarValue: { fontSize: 12, fontWeight: "700" },
  macroBarTrack: {
    height: 8,
    backgroundColor: NM_BASE,
    borderRadius: 4,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  itemScroll: { maxHeight: 320 },
  nmRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NM_BASE,
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  nmRowImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: NM_DARK,
  },
  nmRowInfo: { flex: 1, gap: 2 },
  nmRowName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text || "#2D3A4A",
  },
  nmRowMacro: { fontSize: 11, color: "#7A8A9A" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: NM_BASE,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary || "#5A8DF5",
    lineHeight: 18,
  },
  stepperDisplay: {
    width: 40,
    height: 28,
    borderRadius: 8,
    backgroundColor: NM_BASE,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text || "#2D3A4A",
  },
  nmRemoveBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: NM_BASE,
    alignItems: "center",
    justifyContent: "center",
  },
  nmRemoveIcon: { fontSize: 12, color: "#E06060", fontWeight: "700" },
  saveBtn: {
    marginTop: 14,
    backgroundColor: Colors.primary || "#5A8DF5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary || "#5A8DF5",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
