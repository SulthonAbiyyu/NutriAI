import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
const GREEN = "#22C55E";
const GREEN_DRK = "#16A34A";
const GREEN_LT = "#DCFCE7";
const GREEN_MNT = "#F0FDF4";
const GREEN_BRD = "#BBF7D0";
const DANGER = "#EF4444";
const DANGER_LT = "#FEE2E2";
const PURPLE = "#818CF8";
const PURPLE_LT = "#EEF2FF";
const ORANGE = "#F97316";
const ORANGE_LT = "#FFF7ED";
const ORANGE_BRD = "#FED7AA";
const TXT = "#081229";
const TXT_S = "#64748B";
const TXT_XS = "#94A3B8";
const WHITE = "#FFFFFF";
const BORDER = "#E2E8F0";
const BAR_HEIGHTS = [10, 18, 26, 32, 26, 18, 10];

function WaveBars({ active, color }) {
  const anims = useRef(BAR_HEIGHTS.map(() => new Animated.Value(0.3))).current;
  const loopsRef = useRef([]);

  useEffect(() => {
    loopsRef.current.forEach((l) => l?.stop());
    loopsRef.current = [];
    if (active) {
      anims.forEach((anim, i) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 320 + i * 60,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.25,
              duration: 320 + i * 60,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ]),
        );
        loop.start();
        loopsRef.current.push(loop);
      });
    } else {
      anims.forEach((anim) =>
        Animated.spring(anim, {
          toValue: 0.3,
          useNativeDriver: false,
          speed: 14,
        }).start(),
      );
    }
    return () => loopsRef.current.forEach((l) => l?.stop());
  }, [active]);

  return (
    <View style={wv.container}>
      {BAR_HEIGHTS.map((maxH, i) => (
        <Animated.View
          key={i}
          style={[
            wv.bar,
            {
              height: anims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [4, maxH],
              }),
              backgroundColor: color,
              opacity: active ? 1 : 0.35,
            },
          ]}
        />
      ))}
    </View>
  );
}

const wv = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 36,
    marginBottom: 4,
  },
  bar: { width: 4, borderRadius: 3 },
});
function PulseRing({ active, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (active) {
      scale.setValue(1);
      opacity.setValue(0.7);
      loopRef.current = Animated.loop(
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current.start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => loopRef.current?.stop();
  }, [active]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 62,
        height: 62,
        borderRadius: 31,
        borderWidth: 2,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}
function NutriBadge({ label, value, unit = "g", color = TXT_S }) {
  return (
    <View style={nb.wrap}>
      <Text style={[nb.val, { color }]}>{value}</Text>
      <Text style={nb.unit}>{unit}</Text>
      <Text style={nb.lbl}>{label}</Text>
    </View>
  );
}
const nb = StyleSheet.create({
  wrap: { alignItems: "center", minWidth: 48 },
  val: { fontSize: 13, fontWeight: "800" },
  unit: { fontSize: 8, fontWeight: "600", color: TXT_XS, marginTop: -1 },
  lbl: { fontSize: 8, color: TXT_XS, marginTop: 1 },
});
function ConfirmFoodForm({ food, onConfirm, onCancel }) {
  const [gramPerPorsi, setGramPerPorsi] = useState(
    String(food.gram_per_porsi || 100),
  );
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const slideY = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Diperlukan",
        "Izinkan akses galeri untuk memilih gambar makanan.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      setImageUri({
        uri: asset.uri,
        name: `food_${Date.now()}.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Diperlukan",
        "Izinkan akses kamera untuk mengambil foto.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      setImageUri({
        uri: asset.uri,
        name: `food_${Date.now()}.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      });
    }
  };

  const handleSubmit = async () => {
    const gpp = parseInt(gramPerPorsi, 10);
    if (!gpp || gpp <= 0) {
      Alert.alert("Input Tidak Valid", "Gram per porsi harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("nama_makanan", food.nama);
      formData.append("kalori", String(food.kalori));
      formData.append("protein", String(food.protein));
      formData.append("karbo", String(food.karbo));
      formData.append("lemak", String(food.lemak));
      formData.append("serat", String(food.serat || 0));
      formData.append("gram_per_porsi", String(gpp));

      if (imageUri) {
        formData.append("food_image", {
          uri: imageUri.uri,
          name: imageUri.name,
          type: imageUri.type,
        });
      }

      await onConfirm(formData);
    } catch (err) {
      Alert.alert("Gagal Menyimpan", err?.message || "Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Animated.View
      style={[
        cf.container,
        { opacity: fadeIn, transform: [{ translateY: slideY }] },
      ]}
    >
      {}
      <LinearGradient colors={[ORANGE_LT, "#FFFBEB"]} style={cf.header}>
        <View style={cf.headerRow}>
          <Text style={cf.headerEmoji}>🍽️</Text>
          <View style={{ flex: 1 }}>
            <Text style={cf.headerTitle} numberOfLines={1}>
              {food.nama}
            </Text>
            <Text style={cf.headerSub}>Lengkapi data sebelum disimpan</Text>
          </View>
          <TouchableOpacity
            onPress={onCancel}
            style={cf.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={cf.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {}
        <View style={cf.nutriRow}>
          <NutriBadge
            label="Kalori"
            value={food.kalori}
            unit="kcal"
            color={ORANGE}
          />
          <View style={cf.nutriDivider} />
          <NutriBadge
            label="Protein"
            value={food.protein}
            unit="g"
            color={GREEN}
          />
          <View style={cf.nutriDivider} />
          <NutriBadge
            label="Karbo"
            value={food.karbo}
            unit="g"
            color={PURPLE}
          />
          <View style={cf.nutriDivider} />
          <NutriBadge
            label="Lemak"
            value={food.lemak}
            unit="g"
            color={DANGER}
          />
        </View>
        <Text style={cf.nutriNote}>
          * Data nutrisi per 100g — estimasi dari AI
        </Text>
      </LinearGradient>

      <View style={cf.body}>
        {}
        <View style={cf.fieldRow}>
          <Text style={cf.fieldLabel}>⚖️ Gram per porsi</Text>
          <View style={cf.inputWrap}>
            <TextInput
              style={cf.input}
              value={gramPerPorsi}
              onChangeText={setGramPerPorsi}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={TXT_XS}
              maxLength={5}
            />

            <Text style={cf.inputSuffix}>g</Text>
          </View>
        </View>
        <Text style={cf.fieldHint}>Berapa gram 1 porsi wajar makanan ini?</Text>

        {}
        <Text style={cf.fieldLabel}>📸 Foto makanan (opsional)</Text>
        <View style={cf.imgRow}>
          {imageUri ? (
            <TouchableOpacity onPress={pickImage} style={cf.imgPreviewWrap}>
              <View style={cf.imgPreview}>
                <Image
                  source={{ uri: imageUri.uri }}
                  style={cf.imgPreviewImg}
                  resizeMode="cover"
                />
              </View>
              <Text style={cf.imgChangeHint}>Tap untuk ganti</Text>
            </TouchableOpacity>
          ) : (
            <View style={cf.imgBtnRow}>
              <TouchableOpacity style={cf.imgBtn} onPress={pickImage}>
                <Text style={cf.imgBtnIcon}>🖼️</Text>
                <Text style={cf.imgBtnTxt}>Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cf.imgBtn} onPress={takePhoto}>
                <Text style={cf.imgBtnIcon}>📷</Text>
                <Text style={cf.imgBtnTxt}>Kamera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {}
        <View style={cf.actionRow}>
          <TouchableOpacity
            style={cf.cancelBtn}
            onPress={onCancel}
            disabled={submitting}
          >
            <Text style={cf.cancelTxt}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cf.saveBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Text style={cf.saveTxt}>✓ Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const cf = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: ORANGE_BRD,
    backgroundColor: WHITE,
    shadowColor: "rgba(249,115,22,0.18)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 13, fontWeight: "800", color: TXT },
  headerSub: { fontSize: 9, color: ORANGE, fontWeight: "600", marginTop: 1 },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  closeTxt: { fontSize: 11, color: TXT_S, fontWeight: "700" },
  nutriRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 10,
    paddingVertical: 8,
  },
  nutriDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },
  nutriNote: {
    fontSize: 8,
    color: TXT_XS,
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },
  body: { padding: 14, gap: 6 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TXT,
    marginBottom: 4,
    marginTop: 6,
  },
  fieldHint: { fontSize: 9, color: TXT_XS, marginBottom: 6, marginTop: -2 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    height: 34,
  },
  input: {
    fontSize: 14,
    fontWeight: "700",
    color: TXT,
    minWidth: 48,
    textAlign: "center",
  },
  inputSuffix: { fontSize: 11, color: TXT_S, fontWeight: "600", marginLeft: 4 },
  imgRow: { marginBottom: 6 },
  imgBtnRow: { flexDirection: "row", gap: 8 },
  imgBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
  },
  imgBtnIcon: { fontSize: 16 },
  imgBtnTxt: { fontSize: 11, fontWeight: "600", color: TXT_S },
  imgPreviewWrap: { alignItems: "center", gap: 4 },
  imgPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: GREEN_BRD,
  },
  imgPreviewImg: { width: "100%", height: "100%" },
  imgChangeHint: { fontSize: 9, color: TXT_XS },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 12, fontWeight: "600", color: TXT_S },
  saveBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveTxt: { fontSize: 12, fontWeight: "800", color: WHITE },
});
export default function JarvisCard({
  onTalk,
  micStatus = "idle",
  pendingFood = null,
  onConfirmFood = null,
  onCancelFood = null,
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const isRecording = micStatus === "recording";
  const isProcessing = micStatus === "processing";
  const isDisabled = isProcessing || !!pendingFood;
  const dotAnims = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  const dotLoops = useRef([]);
  useEffect(() => {
    dotLoops.current.forEach((l) => l?.stop());
    dotLoops.current = [];
    if (isProcessing) {
      dotAnims.forEach((anim, i) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(i * 160),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
        loop.start();
        dotLoops.current.push(loop);
      });
    } else {
      dotAnims.forEach((a) => a.setValue(0.3));
    }
    return () => dotLoops.current.forEach((l) => l?.stop());
  }, [isProcessing]);
  const cfg = pendingFood
    ? {
        gradColors: [ORANGE_LT, "#FFFBEB"],
        borderColor: ORANGE_BRD,
        accentColor: ORANGE,
        btnGrad: ["#FB923C", ORANGE],
        icon: "📋",
        labelTop: "Lengkapi data",
        labelBot: "sebelum disimpan",
      }
    : isRecording
      ? {
          gradColors: [DANGER_LT, "#FEF2F2"],
          borderColor: "#FCA5A5",
          accentColor: DANGER,
          btnGrad: ["#F87171", DANGER],
          icon: "⏹",
          labelTop: "Jarvis mendengarkan",
          labelBot: "tap untuk kirim",
        }
      : isProcessing
        ? {
            gradColors: [PURPLE_LT, "#F5F3FF"],
            borderColor: "#A5B4FC",
            accentColor: PURPLE,
            btnGrad: ["#A78BFA", PURPLE],
            icon: "✦",
            labelTop: "Memproses...",
            labelBot: "sebentar ya",
          }
        : {
            gradColors: [GREEN_MNT, "#F6FEF9"],
            borderColor: GREEN_BRD,
            accentColor: GREEN,
            btnGrad: [GREEN, GREEN_DRK],
            icon: "🎙",
            labelTop: "Halo, ada yang bisa",
            labelBot: "saya bantu?",
          };

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 30,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  if (pendingFood) {
    return (
      <ConfirmFoodForm
        food={pendingFood}
        onConfirm={onConfirmFood}
        onCancel={onCancelFood}
      />
    );
  }

  return (
    <View style={st.card}>
      <LinearGradient
        colors={cfg.gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.inner, { borderColor: cfg.borderColor }]}
      >
        <Text
          style={[
            st.labelTop,
            { color: isRecording ? DANGER : isProcessing ? PURPLE : TXT_S },
          ]}
        >
          {cfg.labelTop}
        </Text>
        <Text
          style={[
            st.labelTopBold,
            { color: isRecording ? DANGER : isProcessing ? PURPLE : TXT },
          ]}
        >
          {cfg.labelBot}
        </Text>

        {isProcessing ? (
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              height: 36,
              alignItems: "center",
              marginVertical: 4,
            }}
          >
            {dotAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: PURPLE,
                  opacity: anim,
                }}
              />
            ))}
          </View>
        ) : (
          <WaveBars active={isRecording} color={isRecording ? DANGER : GREEN} />
        )}

        <View
          style={{
            width: 62,
            height: 62,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PulseRing active={isRecording} color={DANGER} />
          <Animated.View style={{ transform: [{ scale: pressScale }] }}>
            <TouchableOpacity
              onPress={onTalk}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={cfg.btnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={st.micBtn}
              >
                <Text style={[st.micIcon, isProcessing && { opacity: 0.7 }]}>
                  {cfg.icon}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={[st.hint, { color: cfg.accentColor }]}>
          {isRecording
            ? "● recording"
            : isProcessing
              ? "· · ·"
              : "tap untuk mulai"}
        </Text>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "rgba(34,197,94,0.20)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 7,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 2,
  },
  labelTop: {
    fontSize: 9.5,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  labelTopBold: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 1,
    marginBottom: 2,
  },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(34,197,94,0.45)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  micIcon: { fontSize: 22 },
  hint: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
});
