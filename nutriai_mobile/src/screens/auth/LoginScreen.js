import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import Svg, { Circle, Path } from "react-native-svg";

import { KATAK, LOGO, LOGOTEKS } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { login } from "../../services/AuthService";
import { Spacing } from "../../theme";

const BG_TOP = "#0A150E";
const BG_MID = "#050C07";
const BG_BOTTOM = "#020602";

const GREEN_BRIGHT = "#4ADE80";
const GREEN_GLOW = "rgba(61,255,143,0.45)";

const CURRENT_YEAR = new Date().getFullYear();
const NOISE_DOTS = Array.from({ length: 70 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.6,
  o: 0.02 + Math.random() * 0.05,
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

const TWINKLES = Array.from({ length: 14 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.4 + Math.random() * 0.5,
  o: 0.25 + Math.random() * 0.35,
}));

function Twinkles() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 220"
      preserveAspectRatio="none"
    >
      {TWINKLES.map((t, i) => (
        <Circle
          key={i}
          cx={t.cx}
          cy={t.cy * 2.2}
          r={t.r}
          fill={`rgba(180,255,200,${t.o})`}
        />
      ))}
    </Svg>
  );
}
const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.55)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.40)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.26)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.15)" },
];

function DepthStack({ radius = 20 }) {
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
      start={{ x: 0.12, y: 0.05 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
function PersonIcon({ size = 22, color = GREEN_BRIGHT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" fill={color} />
      <Path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill={color} />
    </Svg>
  );
}

function LockIcon({ size = 22, color = GREEN_BRIGHT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M5.5 10.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V12a1.5 1.5 0 0 1 1.5-1.5Z"
        fill={color}
      />
      <Circle cx="12" cy="15.2" r="1.6" fill="#04140A" />
    </Svg>
  );
}

function EyeIcon({ size = 20, color = "rgba(180,220,190,0.65)", open = true }) {
  if (!open) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 3l18 18M9.9 5.3A10.4 10.4 0 0 1 12 5c5.5 0 9.5 4 10.5 7-.4 1.1-1.1 2.4-2.2 3.6M6.6 6.6C4.4 8 2.9 10 1.5 12c1.4 3.3 5.6 7 10.5 7 1.4 0 2.7-.3 3.9-.8"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1.5 12C3.5 8 7 5 12 5s8.5 3 10.5 7c-2 4-5.5 7-10.5 7S3.5 16 1.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
      />
      <Circle cx="12" cy="12" r="3.2" fill={color} />
    </Svg>
  );
}

function ArrowIcon({ size = 18, color = "#0A4F27" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12h15M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
function InputIconBox({ children }) {
  return (
    <View style={styles.iconBoxWrap}>
      <DepthStack radius={14} />
      <LinearGradient
        colors={["#123B22", "#081B10"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.iconBoxInner}
      >
        <ShadowOverlay opacity={0.3} />
        {children}
      </LinearGradient>
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
    }).start();
  const pressOut = () =>
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Oops!", "Username dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      await signIn(res?.data?.user || res?.user || null);
    } catch (err) {
      Alert.alert(
        "Login Gagal",
        err.response?.data?.error || "Periksa username dan password kamu",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.55, 1]}
      style={styles.root}
    >
      <BgTexture />
      <Twinkles />

      <Image
        source={KATAK}
        style={[styles.katakImg, { bottom: insets.bottom - 50 }]}
        resizeMode="contain"
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + 140,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {}
          <View style={styles.hero}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            <Image
              source={LOGOTEKS}
              style={styles.logoTeksImg}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Pantau nutrisi harianmu dengan{" "}
              <Text style={styles.taglineGreen}>cerdas</Text>
            </Text>
          </View>

          {}
          <View style={styles.cardWrap}>
            <DepthStack radius={26} />
            <LinearGradient
              colors={["rgba(15,40,24,0.92)", "rgba(4,14,8,0.92)"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.card}
            >
              <ShadowOverlay opacity={0.22} />

              <Text style={styles.cardTitle}>Selamat Datang 👋</Text>

              {}
              <Text style={styles.fieldLabel}>Username</Text>
              <View style={styles.fieldRow}>
                <InputIconBox>
                  <PersonIcon />
                </InputIconBox>
                <View style={styles.fieldInputWrap}>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Masukkan username"
                    placeholderTextColor="rgba(180,220,190,0.4)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {}
              <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
                Password
              </Text>
              <View style={styles.fieldRow}>
                <InputIconBox>
                  <LockIcon />
                </InputIconBox>
                <View style={styles.fieldInputWrap}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="Masukkan password"
                    placeholderTextColor="rgba(180,220,190,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <EyeIcon open={showPassword} />
                  </TouchableOpacity>
                </View>
              </View>

              {}
              <Animated.View
                style={[styles.btnWrap, { transform: [{ scale: btnScale }] }]}
              >
                <DepthStack radius={18} />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleLogin}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#0E7A3B", "#0A4F27"]}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.btnInner}
                  >
                    <ShadowOverlay opacity={0.25} />
                    {loading ? (
                      <ActivityIndicator color="#EAFBF0" />
                    ) : (
                      <>
                        <Text style={styles.btnLabel}>Masuk</Text>
                        <View style={styles.btnArrowCircle}>
                          <ArrowIcon color="#0A4F27" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.registerText}>
                  Belum punya akun?{" "}
                  <Text style={styles.registerBold}>Daftar Sekarang ›</Text>
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {}
          <Text style={styles.footerText}>© {CURRENT_YEAR} Matchaby</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  logoImg: {
    width: 110,
    height: 110,
    marginBottom: -14,
    shadowColor: GREEN_GLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  logoTeksImg: { width: 260, height: 74, marginBottom: -10 },
  tagline: {
    marginTop: -6,
    fontSize: 13.5,
    color: "rgba(210,235,220,0.75)",
    textAlign: "center",
  },
  taglineGreen: { color: GREEN_BRIGHT, fontWeight: "700" },
  cardWrap: { borderRadius: 26, position: "relative" },
  card: {
    borderRadius: 26,
    borderWidth: 1.5,
    borderTopColor: "rgba(120,255,170,0.22)",
    borderLeftColor: "rgba(120,255,170,0.22)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    padding: Spacing.lg,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: GREEN_BRIGHT,
    marginBottom: 6,
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  iconBoxWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    position: "relative",
  },
  iconBoxInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.2,
    borderTopColor: "rgba(120,255,170,0.35)",
    borderLeftColor: "rgba(120,255,170,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  fieldInputWrap: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "rgba(4,14,8,0.55)",
    borderWidth: 1.2,
    borderTopColor: "rgba(120,255,170,0.14)",
    borderLeftColor: "rgba(120,255,170,0.14)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.35)",
  },
  fieldInput: { flex: 1, fontSize: 14, color: "#FFFFFF", paddingVertical: 0 },
  btnWrap: {
    marginTop: Spacing.lg,
    borderRadius: 18,
    position: "relative",
    shadowColor: "rgba(14,122,59,0.5)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  btnInner: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.22)",
    borderLeftColor: "rgba(255,255,255,0.22)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EAFBF0",
    letterSpacing: 0.3,
  },
  btnArrowCircle: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(234,251,240,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  registerLink: { marginTop: Spacing.md, alignItems: "center" },
  registerText: { fontSize: 13, color: "rgba(210,235,220,0.75)" },
  registerBold: { color: GREEN_BRIGHT, fontWeight: "800" },
  footerText: {
    marginTop: Spacing.lg,
    textAlign: "center",
    fontSize: 11.5,
    color: "rgba(200,230,210,0.35)",
    letterSpacing: 0.3,
  },
  katakImg: {
    position: "absolute",
    right: -40,
    width: 320,
    height: 320,
  },
});
