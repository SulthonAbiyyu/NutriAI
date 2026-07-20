import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { ICONS } from "../../constants";
import { changePassword, updateProfile } from "../../services/ProfileService";
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";

const GREEN = "#4ADE80";
const GREEN_DARK = "#22C55E";
const GREEN_DEEP = "#15803D";
const GREEN_SOFT = "rgba(74,222,128,0.4)";
const TEXT_LABEL = "#8FF0AC";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
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
function TabActiveBorder({ children }) {
  return (
    <View style={styles.tabActiveOuter}>
      <LinearGradient
        colors={["#0E2417", "#1C4A2C", "#4ADE80"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.tabActiveBorderLayer}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(220,255,230,0)",
            "rgba(220,255,230,0.5)",
            "rgba(220,255,230,0)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.tabActiveInner}>{children}</View>
      </LinearGradient>
    </View>
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

const DEPTH_LAYERS = [
  { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
  { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
  { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
  { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = 16 }) {
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

const ICON_NOISE_DOTS = Array.from({ length: 26 }).map(() => ({
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
function IconBox3D({
  emoji,
  size = 52,
  radius = 16,
  colors = ["#173C22", "#050B06"],
  fontSize,
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        position: "relative",
      }}
    >
      <DepthStack radius={radius} />
      <LinearGradient
        colors={colors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.iconBoxInner, { borderRadius: radius }]}
      >
        <ShadowOverlay opacity={0.28} />
        <IconTexture opacity={0.6} />
        <Text style={{ fontSize: fontSize || size * 0.42 }}>{emoji}</Text>
      </LinearGradient>
    </View>
  );
}
function Card3D({ children, style }) {
  return (
    <View style={[styles.cardWrap, style]}>
      <DepthStack radius={22} />
      <LinearGradient
        colors={["#0B120D", "#060A07", "#020403"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.cardInner}
      >
        <ShadowOverlay opacity={0.22} />
        <IconTexture opacity={0.35} />
        <View style={{ position: "relative" }}>{children}</View>
      </LinearGradient>
    </View>
  );
}
function FieldRow3D({
  emoji,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  unit,
  secureTextEntry,
  toggleSecure,
  secureVisible,
}) {
  return (
    <View style={styles.fieldRow}>
      <IconBox3D emoji={emoji} size={52} radius={14} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.inputOuter}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry && !secureVisible}
          />

          {unit ? (
            <Text style={styles.inputUnit}>{unit}</Text>
          ) : toggleSecure ? (
            <TouchableOpacity
              onPress={toggleSecure}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{secureVisible ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
function SectionHeader({ label }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}
function SegmentedPicker({ options, value, onChange }) {
  return (
    <View style={styles.pickerWrap}>
      {options.map((o) => {
        const active = value === o.val;
        return (
          <TouchableOpacity
            key={o.val}
            style={[styles.pillOuter, active && styles.pillOuterActive]}
            onPress={() => onChange(o.val)}
            activeOpacity={0.85}
          >
            {active ? (
              <LinearGradient
                colors={["#1F5A34", "#0B2416"]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.pillInner}
              >
                {o.emoji ? (
                  <Text style={styles.pillEmoji}>{o.emoji}</Text>
                ) : null}
                <Text style={[styles.pillLabel, styles.pillLabelActive]}>
                  {o.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={[styles.pillInner, styles.pillInnerIdle]}>
                {o.emoji ? (
                  <Text style={styles.pillEmoji}>{o.emoji}</Text>
                ) : null}
                <Text style={styles.pillLabel}>{o.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
function PrimaryButton3D({ label, icon = "💾", onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled}
      style={styles.btnWrap}
    >
      <DepthStack radius={18} />
      <LinearGradient
        colors={disabled ? ["#3A4A3E", "#1C2620"] : [GREEN, GREEN_DEEP]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.btnInner}
      >
        <ShadowOverlay opacity={0.22} />
        <IconTexture opacity={0.4} />
        {disabled ? (
          <ActivityIndicator color="#04140A" />
        ) : (
          <>
            <Text style={styles.btnIcon}>{icon}</Text>
            <Text style={styles.btnLabel}>{label}</Text>
            <Text style={styles.btnSparkle}>✦</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const TABS = [
  { key: "profil", label: "Profil", emoji: "👤" },
  { key: "password", label: "Password", emoji: "🔒" },
];

const TUJUAN_OPTS = [
  { val: "bulking", label: "Bulking", emoji: "🏋️" },
  { val: "cutting", label: "Cutting", emoji: "✂️" },
  { val: "maintain", label: "Maintain", emoji: "⚖️" },
];

const AKTIVITAS_OPTS = [
  { val: "sangat_tidak_aktif", label: "Sangat Tidak Aktif", emoji: "🛋️" },
  { val: "aktivitas_ringan", label: "Aktif Ringan", emoji: "🚶" },
  { val: "aktivitas_sedang", label: "Aktif Sedang", emoji: "🏃" },
  { val: "aktivitas_berat", label: "Aktif Berat", emoji: "🏋️‍♂️" },
];

const TUBUH_OPTS = [
  { val: "ectomorph", label: "Ectomorph", emoji: "🏃" },
  { val: "mesomorph", label: "Mesomorph", emoji: "💪" },
  { val: "endomorph", label: "Endomorph", emoji: "🏋️" },
];

const GENDER_OPTS = [
  { val: "laki_laki", label: "Laki-laki", emoji: "♂️" },
  { val: "perempuan", label: "Perempuan", emoji: "♀️" },
];

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { user, tab: initTab } = route.params || {};

  const [activeTab, setActiveTab] = useState(initTab === "password" ? 1 : 0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    umur: String(user?.umur || ""),
    tb: String(user?.tb || ""),
    bb: String(user?.bb || ""),
    tujuan: user?.tujuan || "maintain",
    aktivitas: user?.aktivitas || "aktivitas_sedang",
    tipe_tubuh: user?.tipe_tubuh || "mesomorph",
    gender: user?.gender || "laki_laki",
  });

  const [pwForm, setPwForm] = useState({ lama: "", baru: "", konfirmasi: "" });
  const [pwVisible, setPwVisible] = useState({
    lama: false,
    baru: false,
    konfirmasi: false,
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPwField = (k, v) => setPwForm((f) => ({ ...f, [k]: v }));
  const toggleShow = (k) => setPwVisible((v) => ({ ...v, [k]: !v[k] }));

  const saveProfile = async () => {
    if (!form.umur || !form.tb || !form.bb) {
      return Alert.alert("Error", "Semua field wajib diisi");
    }
    setSaving(true);
    try {
      await updateProfile({
        umur: parseInt(form.umur),
        tb: parseInt(form.tb),
        bb: parseInt(form.bb),
        tujuan: form.tujuan,
        aktivitas: form.aktivitas,
        tipe_tubuh: form.tipe_tubuh,
        gender: form.gender,
      });
      Alert.alert("Berhasil", "Profil berhasil diperbarui", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Gagal menyimpan profil",
      );
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!pwForm.lama || !pwForm.baru)
      return Alert.alert("Error", "Semua field wajib diisi");
    if (pwForm.baru !== pwForm.konfirmasi)
      return Alert.alert("Error", "Konfirmasi password tidak cocok");
    if (pwForm.baru.length < 6)
      return Alert.alert("Error", "Password minimal 6 karakter");
    setSaving(true);
    try {
      await changePassword(pwForm.lama, pwForm.baru, pwForm.konfirmasi);
      Alert.alert("Berhasil", "Password berhasil diganti", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Gagal mengganti password",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <BgTexture />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
        >
          {}
          <View style={styles.headerBlock}>
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
                    source={ICONS.editProfileTitle}
                    style={styles.titleIconImg}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <View style={styles.titleStack}>
                <Text style={styles.titleShadow}>Edit Profil</Text>
                <Text style={styles.title}>Edit Profil</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {activeTab === 0
                ? "Perbarui informasi tubuh & tujuan dietmu"
                : "Kelola informasi akun Anda dengan aman"}
            </Text>
          </View>

          {}
          <View style={styles.tabsOuter}>
            <DepthStack radius={18} />
            <View style={styles.tabsInner}>
              {TABS.map((t, i) => {
                const active = activeTab === i;
                const content = (
                  <>
                    <Text
                      style={[styles.tabEmoji, active && styles.tabEmojiActive]}
                    >
                      {t.emoji}
                    </Text>
                    <Text
                      style={[styles.tabLabel, active && styles.tabLabelActive]}
                    >
                      {t.label}
                    </Text>
                  </>
                );

                return (
                  <TouchableOpacity
                    key={t.key}
                    style={styles.tabBtn}
                    onPress={() => setActiveTab(i)}
                    activeOpacity={0.85}
                  >
                    {active ? (
                      <TabActiveBorder>{content}</TabActiveBorder>
                    ) : (
                      <View style={styles.tabInactiveInner}>{content}</View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {}
          {activeTab === 0 ? (
            <Card3D>
              <FieldRow3D
                emoji="⚖️"
                label="Berat Badan (kg)"
                placeholder="65"
                value={form.bb}
                onChangeText={(v) => setField("bb", v)}
                keyboardType="numeric"
                unit="kg"
              />

              <FieldRow3D
                emoji="📏"
                label="Tinggi Badan (cm)"
                placeholder="170"
                value={form.tb}
                onChangeText={(v) => setField("tb", v)}
                keyboardType="numeric"
                unit="cm"
              />

              <FieldRow3D
                emoji="📅"
                label="Umur"
                placeholder="22"
                value={form.umur}
                onChangeText={(v) => setField("umur", v)}
                keyboardType="numeric"
                unit="tahun"
              />

              <SectionHeader label="Tujuan Diet" />
              <SegmentedPicker
                options={TUJUAN_OPTS}
                value={form.tujuan}
                onChange={(v) => setField("tujuan", v)}
              />

              <SectionHeader label="Tingkat Aktivitas" />
              <SegmentedPicker
                options={AKTIVITAS_OPTS}
                value={form.aktivitas}
                onChange={(v) => setField("aktivitas", v)}
              />

              <SectionHeader label="Tipe Tubuh" />
              <SegmentedPicker
                options={TUBUH_OPTS}
                value={form.tipe_tubuh}
                onChange={(v) => setField("tipe_tubuh", v)}
              />

              <SectionHeader label="Gender" />
              <SegmentedPicker
                options={GENDER_OPTS}
                value={form.gender}
                onChange={(v) => setField("gender", v)}
              />
            </Card3D>
          ) : (
            <Card3D>
              <FieldRow3D
                emoji="🔒"
                label="Password Lama"
                placeholder="••••••"
                value={pwForm.lama}
                onChangeText={(v) => setPwField("lama", v)}
                secureTextEntry
                secureVisible={pwVisible.lama}
                toggleSecure={() => toggleShow("lama")}
              />

              <FieldRow3D
                emoji="🛡️"
                label="Password Baru"
                placeholder="Min. 6 karakter"
                value={pwForm.baru}
                onChangeText={(v) => setPwField("baru", v)}
                secureTextEntry
                secureVisible={pwVisible.baru}
                toggleSecure={() => toggleShow("baru")}
              />

              <FieldRow3D
                emoji="✅"
                label="Konfirmasi Password Baru"
                placeholder="Ulangi password baru"
                value={pwForm.konfirmasi}
                onChangeText={(v) => setPwField("konfirmasi", v)}
                secureTextEntry
                secureVisible={pwVisible.konfirmasi}
                toggleSecure={() => toggleShow("konfirmasi")}
              />
            </Card3D>
          )}

          {}
          <PrimaryButton3D
            label={
              saving
                ? "Menyimpan..."
                : activeTab === 0
                  ? "Simpan Perubahan"
                  : "Ganti Password"
            }
            icon={activeTab === 0 ? "💾" : "🔒"}
            onPress={activeTab === 0 ? saveProfile : savePassword}
            disabled={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.goBack()}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14 },
  headerBlock: { marginTop: 6, marginBottom: 20 },
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
  subtitle: {
    marginTop: 10,
    fontSize: 13.5,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  tabsOuter: {
    borderRadius: 18,
    position: "relative",
    marginBottom: 18,
    height: 56,
  },
  tabsInner: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(6,10,7,0.75)",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.5)",
    borderBottomColor: "rgba(0,0,0,0.5)",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
  },
  tabEmoji: { fontSize: 16, opacity: 0.6 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 14.5, fontWeight: "700", color: TEXT_MUTED },
  tabLabelActive: { color: "#EAFFF1" },
  tabInactiveInner: {
    flex: 1,
    margin: 3,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tabActiveOuter: { flex: 1, margin: 3 },
  tabActiveBorderLayer: {
    flex: 1,
    borderRadius: 15,
    padding: 1.4,
    overflow: "hidden",
  },
  tabActiveInner: {
    flex: 1,
    borderRadius: 13.6,
    backgroundColor: "#07130C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardWrap: { borderRadius: 22, position: "relative", marginBottom: 20 },
  cardInner: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  iconBoxInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "rgba(255,255,255,0.12)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2,6,3,0.65)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  inputUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    marginLeft: 8,
  },
  eyeIcon: { fontSize: 18, marginLeft: 8, opacity: 0.7 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pickerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  pillOuter: { borderRadius: 14 },
  pillOuterActive: {
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  pillInnerIdle: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.4)",
  },
  pillEmoji: { fontSize: 14 },
  pillLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
  },
  pillLabelActive: { color: "#EAFFF1" },
  btnWrap: {
    height: 58,
    borderRadius: 18,
    position: "relative",
    marginTop: 4,
    marginBottom: 10,
  },
  btnInner: {
    flex: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.35)",
  },
  btnIcon: { fontSize: 18 },
  btnLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#04140A",
    letterSpacing: 0.3,
  },
  btnSparkle: { fontSize: 14, color: "rgba(4,20,10,0.6)" },
});
