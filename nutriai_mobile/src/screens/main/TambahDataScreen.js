import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import Input from "../../components/common/Input";
import { useAuth } from "../../context/AuthContext";
import {
  addFood,
  deleteFood,
  getFoods,
  updateFood,
} from "../../services/FoodService";
import { Spacing } from "../../theme";
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
const AMBER = "#FFC24B";
const AMBER_SOFT = "rgba(255,194,75,0.85)";
const INPUT_BG_TOP = "#101A0F";
const INPUT_BG_BOTTOM = "#070C07";

const THUMB_PALETTES = [
  ["#C97B3D", "#5A3115"],
  ["#4E8F52", "#1D3B20"],
  ["#D99A3D", "#5C3D12"],
  ["#3E7D5E", "#123322"],
  ["#6B4A2E", "#2A1B10"],
  ["#2F5C42", "#102A1B"],
];

const EMPTY_FORM = {
  nama_makanan: "",
  protein: "",
  kalori: "",
  karbo: "",
  lemak: "",
  serat: "",
  gram_per_porsi: "100",
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

function InputBox3D({ children, radius = 12 }) {
  return (
    <View style={[styles.inputOuter, { borderRadius: radius }]}>
      <DepthStack radius={radius} />
      <LinearGradient
        colors={[INPUT_BG_TOP, INPUT_BG_BOTTOM]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.inputInner, { borderRadius: radius }]}
      >
        <ShadowOverlay opacity={0.16} />
        {children}
      </LinearGradient>
    </View>
  );
}
function FoodCard({
  item,
  index,
  currentUserId,
  onEdit,
  onDelete,
  onLockedTap,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const isOwner =
    item.user_id != null && String(item.user_id) === String(currentUserId);
  const isDefault = item.user_id == null;
  const palette = THUMB_PALETTES[index % THUMB_PALETTES.length];
  const pressAnim = useRef(new Animated.Value(0)).current;
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 140,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 5,
      tension: 80,
    }).start();
  };
  const handleCardPress = () => {
    if (isOwner) {
      onEdit(item);
    } else {
      onLockedTap(item);
    }
  };

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.965],
  });
  const pressTranslateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });
  const pressRotateX = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "3deg"],
  });

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });
  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const toggleMenu = () => {
    const toVal = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnim, {
      toValue: toVal,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  return (
    <View style={styles.cardWrap}>
      <Pressable
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.cardOuter,
            {
              transform: [
                { perspective: 800 },
                { scale: pressScale },
                { translateY: pressTranslateY },
                { rotateX: pressRotateX },
              ],
            },
          ]}
        >
          {}
          <DepthStack radius={20} />

          {}
          <LinearGradient
            colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.card}
          >
            {}
            <ShadowOverlay opacity={0.28} />
            <Texture opacity={0.8} />

            {}
            <View style={styles.thumbOuter}>
              <DepthStack radius={16} />
              <LinearGradient
                colors={palette}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.thumbInner}
              >
                <ShadowOverlay opacity={0.3} />
                <Texture opacity={0.7} />
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.thumbEmoji}>🍽️</Text>
                )}
              </LinearGradient>

              {!item.image && (
                <View style={styles.noImgDot}>
                  <Text style={styles.noImgDotText}>!</Text>
                </View>
              )}
            </View>

            {}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.nama_makanan}
              </Text>
              <Text style={styles.cardMacro} numberOfLines={1}>
                P: {item.protein}g • {item.kalori} kcal • {item.gram_per_porsi}
                g/porsi
              </Text>
              <View style={styles.tagRow}>
                {isDefault ? (
                  <Text style={styles.tagLocked}>🔒 Bawaan</Text>
                ) : (
                  isOwner && <Text style={styles.tagOwner}>👤 Milikmu</Text>
                )}
                {item.karbo > 0 && (
                  <Text style={styles.tagGreen}>K {item.karbo}g</Text>
                )}
                {item.lemak > 0 && (
                  <Text style={styles.tagGreen}>L {item.lemak}g</Text>
                )}
                {!item.image && <Text style={styles.tagAmber}>No foto</Text>}
              </View>
            </View>

            {}
            {isOwner && (
              <TouchableOpacity
                style={styles.moreBtnOuter}
                onPress={toggleMenu}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <DepthStack radius={12} />
                <LinearGradient
                  colors={
                    menuOpen ? ["#1D4A2C", "#0B2416"] : ["#1B241C", "#0A0F0B"]
                  }
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.moreBtnInner}
                >
                  <ShadowOverlay opacity={0.22} />
                  <Text
                    style={[
                      styles.moreBtnText,
                      menuOpen && { color: ACCENT_GREEN },
                    ]}
                  >
                    ⋯
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {}
      {isOwner && menuOpen && (
        <Animated.View
          style={[
            styles.popupMenu,
            { transform: [{ scale: menuScale }], opacity: menuOpacity },
          ]}
        >
          <TouchableOpacity
            style={styles.popupItem}
            onPress={() => {
              setMenuOpen(false);
              onEdit(item);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.popupItemIcon}>✏️</Text>
            <Text style={styles.popupItemText}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.popupDivider} />
          <TouchableOpacity
            style={styles.popupItem}
            onPress={() => {
              setMenuOpen(false);
              onDelete(item);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.popupItemIcon}>🗑️</Text>
            <Text style={[styles.popupItemText, { color: "#FF7A7A" }]}>
              Hapus
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
function FormModal({ visible, mode, initialData, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && initialData) {
        setForm({
          nama_makanan: initialData.nama_makanan || "",
          protein: String(initialData.protein ?? ""),
          kalori: String(initialData.kalori ?? ""),
          karbo: String(initialData.karbo ?? "0"),
          lemak: String(initialData.lemak ?? "0"),
          serat: String(initialData.serat ?? "0"),
          gram_per_porsi: String(initialData.gram_per_porsi ?? "100"),
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setImage(null);
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
          toValue: 0.92,
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
  }, [visible, mode, initialData]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const sanitizeDecimal = (text) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
    return cleaned;
  };
  const setNumericField = (k, v) => setField(k, sanitizeDecimal(v));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Ditolak",
        "Aplikasi perlu izin untuk mengakses galeri foto.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() || "jpg";
      setImage({
        uri: asset.uri,
        name: `food_${Date.now()}.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      });
    }
  };

  const handleSave = async () => {
    if (!form.nama_makanan.trim())
      return Alert.alert("Error", "Nama makanan wajib diisi");
    if (!form.kalori || parseFloat(form.kalori) <= 0)
      return Alert.alert("Error", "Kalori harus lebih dari 0");
    if (form.protein === "" || parseFloat(form.protein) < 0)
      return Alert.alert("Error", "Protein tidak boleh negatif");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("nama_makanan", form.nama_makanan.trim());
      fd.append("protein", form.protein || "0");
      fd.append("kalori", form.kalori || "0");
      fd.append("karbo", form.karbo || "0");
      fd.append("lemak", form.lemak || "0");
      fd.append("serat", form.serat || "0");
      fd.append("gram_per_porsi", form.gram_per_porsi || "100");
      if (image) {
        fd.append("food_image", {
          uri: image.uri,
          name: image.name,
          type: image.type,
        });
      }
      if (mode === "tambah") await addFood(fd);
      else await updateFood(initialData.id, fd);

      onSaved();
      onClose();
    } catch (e) {
      const errMsg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Gagal menyimpan";
      Alert.alert("Error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  const displayImage =
    image?.uri || (mode === "edit" ? initialData?.image : null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalCardOuter,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {}
          <DepthStack radius={28} />

          {}
          <LinearGradient
            colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.modalCardInner}
          >
            {}
            <ShadowOverlay opacity={0.22} />
            <Texture opacity={0.6} />

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.handle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {mode === "tambah" ? "➕ Tambah Makanan" : "✏️ Edit Makanan"}
                </Text>
                <TouchableOpacity
                  style={styles.closeBtnOuter}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <DepthStack radius={16} />
                  <LinearGradient
                    colors={["#1B241C", "#0A0F0B"]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.closeBtnInner}
                  >
                    <ShadowOverlay opacity={0.2} />
                    <Text style={styles.closeBtnText}>✕</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 460 }}
              >
                {}
                <Text style={styles.label}>Foto Makanan</Text>
                <View style={styles.imageRow}>
                  <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                    <View style={styles.imagePreviewOuter}>
                      <DepthStack radius={18} />
                      <LinearGradient
                        colors={
                          displayImage
                            ? ["#173C22", "#050B06"]
                            : [INPUT_BG_TOP, INPUT_BG_BOTTOM]
                        }
                        start={{ x: 0.15, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.imagePreviewInner}
                      >
                        <ShadowOverlay opacity={0.2} />
                        {displayImage ? (
                          <Image
                            source={{ uri: displayImage }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={{ fontSize: 26 }}>📷</Text>
                            <Text style={styles.imagePlaceholderText}>
                              Pilih Foto
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.imageInfo}>
                    <TouchableOpacity
                      style={styles.imagePickBtnOuter}
                      onPress={pickImage}
                      activeOpacity={0.75}
                    >
                      <DepthStack radius={10} />
                      <LinearGradient
                        colors={["#173C22", "#0A1A0E"]}
                        start={{ x: 0.15, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.imagePickBtnInner}
                      >
                        <ShadowOverlay opacity={0.18} />
                        <Text style={styles.imagePickBtnText}>
                          {displayImage
                            ? "🔄  Ganti Foto"
                            : "📷  Pilih dari Galeri"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    {image && (
                      <>
                        <TouchableOpacity
                          style={styles.imageCancelBtnOuter}
                          onPress={() => setImage(null)}
                          activeOpacity={0.75}
                        >
                          <DepthStack radius={10} />
                          <LinearGradient
                            colors={["#3A1414", "#180707"]}
                            start={{ x: 0.15, y: 0 }}
                            end={{ x: 0.9, y: 1 }}
                            style={styles.imageCancelBtnInner}
                          >
                            <ShadowOverlay opacity={0.18} />
                            <Text style={styles.imageCancelBtnText}>
                              ✕ Batalkan
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.imageNewBadge}>
                          ✦ Foto baru siap diupload
                        </Text>
                      </>
                    )}
                    {!displayImage && (
                      <Text style={styles.imageHint}>Opsional · JPG / PNG</Text>
                    )}
                  </View>
                </View>

                {}
                <Text style={styles.label}>Nama Makanan *</Text>
                <InputBox3D>
                  <Input
                    placeholder="Contoh: Nasi goreng (150g)"
                    value={form.nama_makanan}
                    onChangeText={(v) => setField("nama_makanan", v)}
                    style={styles.inputFlat}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </InputBox3D>

                {}
                <View style={styles.row2}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Protein (g) *</Text>
                    <InputBox3D>
                      <Input
                        placeholder="0"
                        value={form.protein}
                        onChangeText={(v) => setNumericField("protein", v)}
                        keyboardType="decimal-pad"
                        style={styles.inputFlat}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                      />
                    </InputBox3D>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Kalori (kcal) *</Text>
                    <InputBox3D>
                      <Input
                        placeholder="0"
                        value={form.kalori}
                        onChangeText={(v) => setNumericField("kalori", v)}
                        keyboardType="decimal-pad"
                        style={styles.inputFlat}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                      />
                    </InputBox3D>
                  </View>
                </View>

                {}
                <View style={styles.row2}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Karbo (g)</Text>
                    <InputBox3D>
                      <Input
                        placeholder="0"
                        value={form.karbo}
                        onChangeText={(v) => setNumericField("karbo", v)}
                        keyboardType="decimal-pad"
                        style={styles.inputFlat}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                      />
                    </InputBox3D>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Lemak (g)</Text>
                    <InputBox3D>
                      <Input
                        placeholder="0"
                        value={form.lemak}
                        onChangeText={(v) => setNumericField("lemak", v)}
                        keyboardType="decimal-pad"
                        style={styles.inputFlat}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                      />
                    </InputBox3D>
                  </View>
                </View>

                {}
                <Text style={styles.label}>Gram per Porsi</Text>
                <InputBox3D>
                  <Input
                    placeholder="100"
                    value={form.gram_per_porsi}
                    onChangeText={(v) => setNumericField("gram_per_porsi", v)}
                    keyboardType="decimal-pad"
                    style={styles.inputFlat}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </InputBox3D>

                {}
                <Text style={styles.label}>Serat (g)</Text>
                <InputBox3D>
                  <Input
                    placeholder="0"
                    value={form.serat}
                    onChangeText={(v) => setNumericField("serat", v)}
                    keyboardType="decimal-pad"
                    style={styles.inputFlat}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </InputBox3D>

                <View style={styles.formTipOuter}>
                  <DepthStack radius={12} />
                  <LinearGradient
                    colors={["#3A2A0C", "#1D1505"]}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.formTipInner}
                  >
                    <ShadowOverlay opacity={0.18} />
                    <Text style={styles.formTipText}>
                      💡 Isi nilai nutrisi per{" "}
                      <Text style={{ fontWeight: "900", color: AMBER }}>
                        100g
                      </Text>{" "}
                      makanan. Gram per porsi diisi seberapa berat 1 sajian
                      wajarnya.
                    </Text>
                  </LinearGradient>
                </View>
                <View style={{ height: 16 }} />
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtnOuter, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <DepthStack radius={16} />
                <LinearGradient
                  colors={["#0E7A3B", "#4CC584"]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.saveBtnInner}
                >
                  <ShadowOverlay opacity={0.22} />
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {mode === "tambah"
                        ? "Simpan ke Database"
                        : "Simpan Perubahan"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
function ThemedAlertModal({
  visible,
  icon = "🔒",
  title,
  message,
  buttons = [],
}) {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.alertOverlay}>
        <View style={styles.alertCardOuter}>
          <DepthStack radius={24} />
          <LinearGradient
            colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.alertCardInner}
          >
            <ShadowOverlay opacity={0.25} />
            <Texture opacity={0.6} />

            <View style={styles.alertIconOuter}>
              <DepthStack radius={16} />
              <LinearGradient
                colors={["#3A2A0C", "#1D1505"]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.alertIconInner}
              >
                <ShadowOverlay opacity={0.18} />
                <Text style={styles.alertIconText}>{icon}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>

            <View style={styles.alertBtnRow}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={btn.onPress}
                  style={{ flex: 1 }}
                >
                  <View
                    style={[
                      styles.alertBtnOuter,
                      btn.style === "ghost" && styles.alertBtnOuterGhost,
                    ]}
                  >
                    {btn.style !== "ghost" && <DepthStack radius={14} />}
                    <LinearGradient
                      colors={
                        btn.style === "destructive"
                          ? ["#7A2E2E", "#3A1414"]
                          : btn.style === "ghost"
                            ? ["transparent", "transparent"]
                            : ["#2F8F52", "#0E4A24"]
                      }
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={[
                        styles.alertBtnInner,
                        btn.style === "ghost" && styles.alertBtnInnerGhost,
                      ]}
                    >
                      {btn.style !== "ghost" && (
                        <ShadowOverlay opacity={0.16} />
                      )}
                      <Text
                        style={[
                          styles.alertBtnText,
                          btn.style === "ghost" && styles.alertBtnTextGhost,
                          btn.style === "destructive" &&
                            styles.alertBtnTextDestructive,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
export default function TambahDataScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Main", { screen: "Dashboard" });
    }
  };

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [noImgTotal, setNoImgTotal] = useState(0);
  const [formModal, setFormModal] = useState({
    visible: false,
    mode: "tambah",
    data: null,
  });
  const [lockedAlert, setLockedAlert] = useState({ visible: false, nama: "" });

  const searchTimer = useRef(null);
  const LIMIT = 20;

  const fetchFoods = useCallback(async (q = "", p = 1, append = false) => {
    if (p > 1) setLoadingMore(true);
    else if (!append) setLoading(true);
    try {
      const res = await getFoods(q, p, LIMIT);
      const newFoods = res.data || [];

      setFoods((prev) => (append ? [...prev, ...newFoods] : newFoods));
      setTotalPages(res.total_pages || 1);
      setPage(p);
      if (!append) {
        setTotalCount(res.total || 0);
        if (!q && p === 1)
          setNoImgTotal(newFoods.filter((f) => !f.image).length);
      }
    } catch {
      Alert.alert("Error", "Gagal memuat data makanan");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFoods("", 1);
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchFoods(text, 1), 400);
  };

  const handleEndReached = () => {
    if (!loadingMore && page < totalPages) fetchFoods(search, page + 1, true);
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Hapus Makanan",
      `Yakin hapus "${item.nama_makanan}"?\nData tidak bisa dikembalikan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFood(item.id);
              setFoods((prev) => prev.filter((f) => f.id !== item.id));
            } catch (e) {
              Alert.alert(
                "Error",
                e?.response?.data?.error || "Gagal menghapus",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {}
      <View style={styles.header}>
        <View style={styles.headerIconOuter}>
          <DepthStack radius={16} />
          <LinearGradient
            colors={["#173C22", "#050B06"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.headerIconInner}
          >
            <ShadowOverlay opacity={0.28} />
            <Texture opacity={0.6} />
            <Image
              source={require("../../../assets/database.png")}
              style={styles.headerIconImg}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Database Makanan
          </Text>
          {!loading && (
            <Text style={styles.headerSub}>{totalCount} item di database</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() =>
            setFormModal({ visible: true, mode: "tambah", data: null })
          }
          style={styles.addBtnOuter}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.85}
        >
          <DepthStack radius={17} />
          <LinearGradient
            colors={["#0E7A3B", "#4CC584"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.addBtnInner}
          >
            <ShadowOverlay opacity={0.25} />
            <Texture opacity={0.6} />
            <Text style={styles.addBtnText}>＋</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {}
      <View style={styles.searchAlertOuter}>
        <DepthStack radius={22} />
        <LinearGradient
          colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.searchAlertInner}
        >
          <ShadowOverlay opacity={0.22} />
          <Texture opacity={0.6} />

          {}
          <View style={styles.searchBoxOuter}>
            <DepthStack radius={14} />
            <LinearGradient
              colors={[INPUT_BG_TOP, INPUT_BG_BOTTOM]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.searchBoxInner}
            >
              <ShadowOverlay opacity={0.18} />
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama makanan..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={search}
                onChangeText={handleSearch}
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearch("");
                    fetchFoods("", 1);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {}
          {noImgTotal > 0 && (
            <View style={styles.warnBannerOuter}>
              <DepthStack radius={14} />
              <LinearGradient
                colors={["#3A2A0C", "#1D1505"]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.warnBannerInner}
              >
                <ShadowOverlay opacity={0.2} />
                <Text style={styles.warnIcon}>⚠️</Text>
                <Text style={styles.warnText}>
                  {noImgTotal} makanan belum punya foto — tap{" "}
                  <Text style={styles.warnStrong}>⋯</Text> lalu{" "}
                  <Text style={styles.warnStrong}>Edit</Text>
                </Text>
              </LinearGradient>
            </View>
          )}
        </LinearGradient>
      </View>

      {}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT_GREEN} />
          <Text style={styles.loadingText}>Memuat data makanan...</Text>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <FoodCard
              item={item}
              index={index}
              currentUserId={userId}
              onEdit={(food) =>
                setFormModal({ visible: true, mode: "edit", data: food })
              }
              onDelete={handleDelete}
              onLockedTap={(food) =>
                setLockedAlert({ visible: true, nama: food.nama_makanan })
              }
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>{search ? "🔍" : "🥗"}</Text>
              <Text style={styles.emptyTitle}>
                {search
                  ? `"${search}" tidak ditemukan`
                  : "Belum ada data makanan"}
              </Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? "Coba kata kunci lain"
                  : "Tap tombol + di kanan atas untuk menambahkan"}
              </Text>
            </View>
          )}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator
                color={ACCENT_GREEN}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFoods(search, 1);
              }}
              colors={[ACCENT_GREEN]}
              tintColor={ACCENT_GREEN}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {}
      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={handleBack}
      />

      {}
      <FormModal
        visible={formModal.visible}
        mode={formModal.mode}
        initialData={formModal.data}
        onClose={() => setFormModal((prev) => ({ ...prev, visible: false }))}
        onSaved={() => fetchFoods(search, 1)}
      />

      {}
      <ThemedAlertModal
        visible={lockedAlert.visible}
        icon="🔒"
        title="Data Bawaan Aplikasi"
        message={`"${lockedAlert.nama}" adalah data bawaan dan tidak bisa diedit atau dihapus. Kamu cuma bisa mengubah data yang kamu tambahkan sendiri.`}
        buttons={[
          {
            text: "Mengerti",
            style: "primary",
            onPress: () =>
              setLockedAlert((prev) => ({ ...prev, visible: false })),
          },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md || 16,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 12,
  },
  headerIconOuter: {
    width: 52,
    height: 52,
    borderRadius: 16,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIconInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerIconImg: { width: 30, height: 30 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: "800", color: TEXT_WHITE },
  headerSub: {
    fontSize: 12.5,
    fontWeight: "600",
    color: SUB_GREEN,
    marginTop: 3,
  },
  addBtnOuter: {
    width: 50,
    height: 50,
    borderRadius: 17,
    position: "relative",
    shadowColor: "rgba(14,122,59,0.5)",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnInner: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.45)",
    borderLeftColor: "rgba(255,255,255,0.45)",
    borderRightColor: "rgba(0,0,0,0.30)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addBtnText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 24,
  },
  searchAlertOuter: {
    marginHorizontal: Spacing.md || 16,
    marginBottom: 14,
    borderRadius: 22,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 4, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchAlertInner: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: "hidden",
    gap: 10,
  },
  searchBoxOuter: {
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
  searchBoxInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  searchIcon: { fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13.5, color: TEXT_WHITE, padding: 0 },
  clearIcon: { color: "rgba(255,255,255,0.45)", fontSize: 14 },

  warnBannerOuter: {
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
  warnBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: "rgba(255,194,75,0.35)",
    borderLeftColor: "rgba(255,194,75,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
  },
  warnIcon: { fontSize: 13 },
  warnText: {
    flex: 1,
    fontSize: 11.5,
    color: AMBER_SOFT,
    lineHeight: 16,
    fontWeight: "600",
  },
  warnStrong: { fontWeight: "900", color: AMBER },

  listContent: { paddingHorizontal: Spacing.md || 16, paddingTop: 2 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, color: TEXT_MUTED },
  cardWrap: { marginBottom: 12, position: "relative" },
  cardOuter: {
    borderRadius: 20,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 7,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    padding: 12,
    gap: 12,
    overflow: "hidden",
  },

  thumbOuter: {
    width: 74,
    height: 74,
    borderRadius: 17,
    position: "relative",
  },
  thumbInner: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    borderLeftColor: "rgba(255,255,255,0.18)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },
  thumbEmoji: { fontSize: 30 },
  noImgDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  noImgDotText: { fontSize: 11, color: "#3A2405", fontWeight: "900" },

  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "800", color: TEXT_WHITE },
  cardMacro: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tagGreen: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8FE3A8",
    backgroundColor: "rgba(79,143,82,0.18)",
    borderWidth: 1,
    borderColor: "rgba(79,143,82,0.4)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagAmber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3A2405",
    backgroundColor: AMBER,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagLocked: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagOwner: {
    fontSize: 10,
    fontWeight: "700",
    color: "#050A06",
    backgroundColor: ACCENT_GREEN,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  moreBtnOuter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  moreBtnInner: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "rgba(255,255,255,0.12)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  moreBtnText: { fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 20 },

  popupMenu: {
    position: "absolute",
    right: 12,
    top: 14,
    backgroundColor: CARD_BG_MID,
    borderRadius: 14,
    zIndex: 99,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 14,
  },
  popupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  popupItemIcon: { fontSize: 16 },
  popupItemText: { fontSize: 14, fontWeight: "700", color: TEXT_WHITE },
  popupDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 12,
  },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: TEXT_WHITE },
  emptyDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCardOuter: {
    width: "100%",
    maxHeight: "92%",
    borderRadius: 28,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.7)",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 24,
  },
  modalCardInner: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    padding: 20,
    paddingTop: 14,
    overflow: "hidden",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: TEXT_WHITE },
  closeBtnOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: "relative",
  },
  closeBtnInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "rgba(255,255,255,0.12)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  closeBtnText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
  },

  label: {
    fontSize: 11,
    fontWeight: "800",
    color: SUB_GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  inputOuter: {
    position: "relative",
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputInner: {
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  inputFlat: { backgroundColor: "transparent", color: TEXT_WHITE },
  row2: { flexDirection: "row" },

  imageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 4,
  },
  imagePreviewOuter: {
    width: 80,
    height: 80,
    borderRadius: 18,
    position: "relative",
  },
  imagePreviewInner: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "rgba(255,255,255,0.12)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", gap: 2 },
  imagePlaceholderText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "700",
  },
  imageInfo: { flex: 1, gap: 8 },

  imagePickBtnOuter: {
    borderRadius: 10,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  imagePickBtnInner: {
    borderRadius: 10,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    borderLeftColor: "rgba(255,255,255,0.15)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  imagePickBtnText: { fontSize: 12, fontWeight: "700", color: "#8FE3A8" },

  imageCancelBtnOuter: {
    borderRadius: 10,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageCancelBtnInner: {
    borderRadius: 10,
    borderWidth: 1,
    borderTopColor: "rgba(255,120,120,0.25)",
    borderLeftColor: "rgba(255,120,120,0.25)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  imageCancelBtnText: { fontSize: 12, fontWeight: "700", color: "#FF7A7A" },

  imageNewBadge: {
    fontSize: 10,
    color: ACCENT_GREEN,
    fontWeight: "700",
    textAlign: "center",
  },
  imageHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },

  formTipOuter: {
    borderRadius: 12,
    marginTop: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTipInner: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopColor: "rgba(255,194,75,0.3)",
    borderLeftColor: "rgba(255,194,75,0.3)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    padding: 10,
    overflow: "hidden",
  },
  formTipText: { fontSize: 11, color: AMBER_SOFT, lineHeight: 16 },

  saveBtnOuter: {
    borderRadius: 16,
    marginTop: 14,
    position: "relative",
    shadowColor: "rgba(14,122,59,0.5)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnInner: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.4)",
    borderLeftColor: "rgba(255,255,255,0.4)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    paddingVertical: 15,
    alignItems: "center",
    overflow: "hidden",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  alertCardOuter: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.7)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
  },
  alertCardInner: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderTopColor: CARD_BORDER_TL,
    borderLeftColor: CARD_BORDER_TL,
    borderRightColor: CARD_BORDER_BR,
    borderBottomColor: CARD_BORDER_BR,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  alertIconOuter: {
    width: 54,
    height: 54,
    borderRadius: 18,
    position: "relative",
    marginBottom: 14,
  },
  alertIconInner: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderTopColor: "rgba(255,194,75,0.3)",
    borderLeftColor: "rgba(255,194,75,0.3)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  alertIconText: { fontSize: 24 },
  alertTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_WHITE,
    textAlign: "center",
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  alertBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  alertBtnOuter: {
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
  alertBtnOuterGhost: { shadowOpacity: 0, elevation: 0 },
  alertBtnInner: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.3)",
    borderLeftColor: "rgba(255,255,255,0.3)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  alertBtnInnerGhost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "transparent",
  },
  alertBtnText: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
  alertBtnTextGhost: { color: "rgba(255,255,255,0.6)" },
  alertBtnTextDestructive: { color: "#FFD3D3" },
});
