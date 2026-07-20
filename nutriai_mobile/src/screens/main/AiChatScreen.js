import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
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
import { chatWithAI, getMealSuggestion } from "../../services/AiService";
import { Radius, Spacing } from "../../theme";

const CHATAI_ICON = require("../../../assets/chatai.png");
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";

const GREEN_BRIGHT = "#4ADE80";
const GREEN_MID = "#22C55E";
const GREEN_DEEP = "#15803D";
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

const ICON_NOISE_DOTS = Array.from({ length: 24 }).map(() => ({
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
const BTN_DEPTH_LAYERS = [
  { dx: 1, dy: 1.5, color: "rgba(0,0,0,0.55)" },
  { dx: 2, dy: 3, color: "rgba(0,0,0,0.42)" },
  { dx: 3.2, dy: 4.5, color: "rgba(0,0,0,0.30)" },
  { dx: 4.5, dy: 6, color: "rgba(0,0,0,0.18)" },
  { dx: 6, dy: 8, color: "rgba(0,0,0,0.10)" },
];

function BtnDepthStack({ radius }) {
  return (
    <>
      {BTN_DEPTH_LAYERS.map((l, i) => (
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

const BTN_NOISE_DOTS = Array.from({ length: 26 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.4 + Math.random() * 0.6,
  o: 0.04 + Math.random() * 0.06,
  dark: Math.random() > 0.55,
}));
const BTN_NOISE_DOTS_2 = Array.from({ length: 16 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.8 + Math.random() * 1.1,
  o: 0.02 + Math.random() * 0.03,
  dark: Math.random() > 0.5,
}));

function BtnTexture() {
  return (
    <>
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
      >
        {BTN_NOISE_DOTS.map((d, i) => (
          <Circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
          />
        ))}
      </Svg>
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
      >
        {BTN_NOISE_DOTS_2.map((d, i) => (
          <Circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
          />
        ))}
      </Svg>
    </>
  );
}

function BtnShadowOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.30)"]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
function SendButton3D({ size = 44, onPress, disabled, colors, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.86,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    }).start();

  return (
    <Animated.View
      style={[
        styles.sendBtnWrap,
        { width: size, height: size, transform: [{ scale }] },
      ]}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2 }}>
        <BtnDepthStack radius={size / 2} />
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled}
          accessibilityLabel="Kirim pesan"
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.sendBtnInner, { borderRadius: size / 2 }]}
          >
            <BtnShadowOverlay />
            <BtnTexture />
            {children}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const INPUT_RADIUS = 24;
function InputPill3D({ children }) {
  return (
    <View style={styles.inputPillOuter}>
      <BtnDepthStack radius={INPUT_RADIUS} />
      <LinearGradient
        colors={["#173C22", "#050B06"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.inputPillInner}
      >
        <BtnShadowOverlay />
        <BtnTexture />
        {children}
      </LinearGradient>
    </View>
  );
}

const QUICK_PROMPTS = [
  {
    icon: "🍽",
    label: "Saran Menu",
    msg: "Berikan saran menu makan untuk sisa hari ini berdasarkan targetku",
    action: "meal_suggestion",
  },
  {
    icon: "💡",
    label: "Tips Diet",
    msg: "Berikan tips diet yang efektif sesuai tujuan dietku",
  },
  {
    icon: "🥦",
    label: "Tinggi Protein",
    msg: "Rekomendasikan 5 makanan Indonesia tinggi protein yang mudah didapat",
  },
  {
    icon: "📊",
    label: "Jelaskan TDEE",
    msg: "Jelaskan apa itu TDEE dan bagaimana cara kerjanya dalam dietku",
  },
];

function QuickPromptChip({ icon, label, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    }).start();

  return (
    <Animated.View
      style={[
        styles.quickChipWrap,
        { transform: [{ scale }], opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={0.85}
        style={styles.quickChipInner}
      >
        <Text style={styles.quickIcon}>{icon}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
function cleanMarkdown(str) {
  return String(str)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}
const LIST_LINE_RE = /^(\d+\.)\s+(.*)$/;

function renderMessageText(text, textStyle) {
  return cleanMarkdown(text)
    .split("\n")
    .map((line, i) => {
      const match = line.match(LIST_LINE_RE);
      if (match) {
        return (
          <View key={i} style={styles.listLineRow}>
            <Text style={[textStyle, styles.listLineNumber]}>{match[1]}</Text>
            <Text style={[textStyle, styles.listLineContent]}>{match[2]}</Text>
          </View>
        );
      }
      if (line.trim() === "") {
        return <View key={i} style={styles.blankLine} />;
      }
      return (
        <Text key={i} style={textStyle}>
          {line}
        </Text>
      );
    });
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  const textStyle = [styles.bubbleText, isUser && styles.bubbleTextUser];
  return (
    <View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleRight : styles.bubbleLeft,
      ]}
    >
      {!isUser && (
        <View style={styles.botAvatarWrap}>
          <Image
            source={CHATAI_ICON}
            style={styles.botAvatar}
            resizeMode="contain"
          />
        </View>
      )}
      {isUser ? (
        <LinearGradient
          colors={[GREEN_MID, GREEN_DEEP]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.bubble, styles.bubbleUser, { maxWidth: "78%" }]}
        >
          <View style={styles.bubbleTextBlock}>
            {renderMessageText(msg.text, textStyle)}
          </View>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, styles.bubbleTimeUser]}>
              {msg.timestamp}
            </Text>
            <Text style={styles.readTicks}>✓✓</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleBot, { maxWidth: "78%" }]}>
          {msg.loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={GREEN_BRIGHT} />
              <Text style={styles.loadingText}>NutriAI mengetik...</Text>
            </View>
          ) : (
            <>
              <View style={styles.bubbleTextBlock}>
                {renderMessageText(msg.text, textStyle)}
              </View>
              <View style={styles.bubbleFooter}>
                <Text style={styles.bubbleTime}>{msg.timestamp}</Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
function makeInitialMsg() {
  return {
    id: "0",
    role: "bot",
    text: "Halo! Saya NutriAI\n\nTanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan.",
    tts_text:
      "Halo! Saya NutriAI. Tanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan.",
    timestamp: new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
const chatStore = {
  messages: null,
  history: [],
};

export default function AiChatScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);
  const historyRef = useRef(chatStore.history);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(
    () => chatStore.messages || [makeInitialMsg()],
  );
  const [sending, setSending] = useState(false);
  const kbPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => {
      Animated.timing(kbPadding, {
        toValue: e.endCoordinates?.height || 0,
        duration: e.duration || 220,
        useNativeDriver: false,
      }).start();
    };
    const onHide = (e) => {
      Animated.timing(kbPadding, {
        toValue: 0,
        duration: e.duration || 220,
        useNativeDriver: false,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [kbPadding]);
  useEffect(() => {
    chatStore.messages = messages;
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const msgText = (text || input).trim();
      if (!msgText || sending) return;

      setInput("");

      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const uid = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        { id: uid, role: "user", text: msgText, timestamp: now },
        { id: "loading", role: "bot", loading: true },
      ]);
      setSending(true);
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text: msgText },
      ].slice(-10);
      chatStore.history = historyRef.current;

      try {
        const res = await chatWithAI(msgText, historyRef.current);
        const botText = res.reply || "Maaf, saya tidak bisa menjawab sekarang.";
        const ttsText = res.tts_text || botText;
        const botId = `bot_${Date.now()}`;

        historyRef.current = [
          ...historyRef.current,
          { role: "model", text: botText },
        ].slice(-10);
        chatStore.history = historyRef.current;

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== "loading")
            .concat({
              id: botId,
              role: "bot",
              text: botText,
              tts_text: ttsText,
              timestamp: new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }),
        );
      } catch {
        historyRef.current = historyRef.current.slice(0, -1);
        chatStore.history = historyRef.current;

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== "loading")
            .concat({
              id: `err_${Date.now()}`,
              role: "bot",
              text: "⚠️ NutriAI tidak tersedia. Pastikan koneksi internet dan GEMINI_API_KEY sudah dikonfigurasi di server.",
              tts_text: "NutriAI tidak tersedia saat ini.",
              timestamp: new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }),
        );
      } finally {
        setSending(false);
      }
    },
    [input, sending],
  );
  const handleMealSuggestion = useCallback(async () => {
    if (sending) return;
    const promptLabel =
      "Berikan saran menu makan untuk sisa hari ini berdasarkan targetku";

    const now = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const uid = Date.now().toString();

    setMessages((prev) => [
      ...prev,
      { id: uid, role: "user", text: promptLabel, timestamp: now },
      { id: "loading", role: "bot", loading: true },
    ]);
    setSending(true);

    historyRef.current = [
      ...historyRef.current,
      { role: "user", text: promptLabel },
    ].slice(-10);
    chatStore.history = historyRef.current;

    try {
      const res = await getMealSuggestion();
      const botText =
        res.suggestion || "Maaf, saran menu tidak tersedia saat ini.";
      const ttsText = res.tts_text || botText;
      const botId = `bot_${Date.now()}`;

      historyRef.current = [
        ...historyRef.current,
        { role: "model", text: botText },
      ].slice(-10);
      chatStore.history = historyRef.current;

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "loading")
          .concat({
            id: botId,
            role: "bot",
            text: botText,
            tts_text: ttsText,
            timestamp: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
      );
    } catch {
      historyRef.current = historyRef.current.slice(0, -1);
      chatStore.history = historyRef.current;

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "loading")
          .concat({
            id: `err_${Date.now()}`,
            role: "bot",
            text: "⚠️ Saran menu tidak tersedia. Pastikan koneksi internet dan GEMINI_API_KEY sudah dikonfigurasi di server.",
            tts_text: "Saran menu tidak tersedia saat ini.",
            timestamp: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
      );
    } finally {
      setSending(false);
    }
  }, [sending]);

  const doReset = useCallback(() => {
    historyRef.current = [];
    chatStore.history = [];
    const fresh = [makeInitialMsg()];
    chatStore.messages = fresh;
    setMessages(fresh);
  }, []);
  const resetChat = useCallback(() => {
    Alert.alert(
      "Reset Percakapan?",
      "Semua riwayat chat dengan NutriAI akan dihapus dan tidak bisa dikembalikan.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: doReset },
      ],
    );
  }, [doReset]);

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconOuter}>
            <DepthStack radius={16} />
            <LinearGradient
              colors={["#173C22", "#050B06"]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.headerIconInner}
            >
              <ShadowOverlay opacity={0.28} />
              <IconTexture opacity={0.6} />
              <Image
                source={CHATAI_ICON}
                style={styles.headerIconImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <View style={styles.headerTextCol}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>NutriAI</Text>
            </View>
            <Text style={styles.headerSubtitle}>Asisten Nutrisi Pribadimu</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resetBtn}
          activeOpacity={0.85}
          onPress={resetChat}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, paddingBottom: kbPadding }}>
        {}
        <FlatList
          ref={flatRef}
          style={styles.msgListFlex}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        />

        {}
        <View style={styles.quickWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {QUICK_PROMPTS.map((q) => (
              <QuickPromptChip
                key={q.label}
                icon={q.icon}
                label={q.label}
                onPress={() =>
                  q.action === "meal_suggestion"
                    ? handleMealSuggestion()
                    : sendMessage(q.msg)
                }
                disabled={sending}
              />
            ))}
          </ScrollView>
        </View>

        <View
          style={[
            styles.bottomRow,
            { paddingBottom: Math.max(insets.bottom + 8, 20) },
          ]}
        >
          <View style={styles.backBtnSlot}>
            <BackButtonFloating
              size={44}
              bottom={0}
              left={0}
              onPress={() => navigation.goBack()}
            />
          </View>

          <InputPill3D>
            <TextInput
              style={styles.textInput}
              placeholder="Tanya soal nutrisi..."
              placeholderTextColor="rgba(220,255,230,0.4)"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
          </InputPill3D>

          <SendButton3D
            size={44}
            onPress={() => sendMessage()}
            disabled={!input.trim() || sending}
            colors={
              !input.trim() || sending
                ? ["#2E6B47", "#123821"]
                : [GREEN_BRIGHT, GREEN_DEEP]
            }
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </SendButton3D>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },

  headerIconOuter: {
    width: 46,
    height: 46,
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
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerIconImg: { width: 30, height: 30 },

  headerTextCol: { flexShrink: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textShadowColor: "rgba(61,255,143,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(215,255,225,0.55)",
    fontWeight: "600",
    marginTop: 1,
  },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(21,128,61,0.22)",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.3,
    borderTopColor: "rgba(255,255,255,0.22)",
    borderLeftColor: "rgba(255,255,255,0.22)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.45)",
  },
  resetText: { fontSize: 12.5, color: "#FFFFFF", fontWeight: "800" },
  quickWrap: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  quickScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  quickChipWrap: {
    borderRadius: Radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  quickChipInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 6,
    backgroundColor: "rgba(21,128,61,0.26)",
    borderWidth: 1.3,
    borderTopColor: "rgba(255,255,255,0.24)",
    borderLeftColor: "rgba(255,255,255,0.24)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.45)",
  },
  quickIcon: { fontSize: 13 },
  quickLabel: { fontSize: 12, fontWeight: "800", color: "#EAFBF0" },

  msgListFlex: { flex: 1 },
  msgList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 14,
  },

  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bubbleLeft: { justifyContent: "flex-start" },
  bubbleRight: { justifyContent: "flex-end" },

  botAvatarWrap: {
    marginBottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(21,128,61,0.28)",
    borderWidth: 1.2,
    borderColor: "rgba(74,222,128,0.4)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  botAvatar: { width: 22, height: 22 },

  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderBottomLeftRadius: 4,
    borderWidth: 1.2,
    borderTopColor: "rgba(255,255,255,0.14)",
    borderLeftColor: "rgba(255,255,255,0.14)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    shadowColor: "rgba(21,128,61,0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },

  bubbleTextBlock: { gap: 2 },
  bubbleText: {
    fontSize: 14,
    color: "#F1FFF5",
    lineHeight: 21,
    textAlign: "justify",
  },
  bubbleTextUser: { color: "#FFFFFF" },
  listLineRow: { flexDirection: "row", alignItems: "flex-start" },
  listLineNumber: { minWidth: 20 },
  listLineContent: { flex: 1 },
  blankLine: { height: 8 },

  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
    gap: 5,
  },
  bubbleTime: { fontSize: 9, color: "rgba(215,255,225,0.4)" },
  bubbleTimeUser: { color: "rgba(255,255,255,0.65)" },
  readTicks: { fontSize: 10, color: "rgba(255,255,255,0.75)" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: { fontSize: 12, color: "rgba(215,255,225,0.55)" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    gap: 10,
  },
  backBtnSlot: {
    width: 44,
    height: 44,
    position: "relative",
  },
  inputPillOuter: {
    flex: 1,
    minHeight: 44,
    position: "relative",
  },
  inputPillInner: {
    flex: 1,
    borderRadius: INPUT_RADIUS,
    borderWidth: 2,
    borderTopColor: "rgba(255,255,255,0.40)",
    borderLeftColor: "rgba(255,255,255,0.40)",
    borderRightColor: "rgba(0,0,0,0.45)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    overflow: "hidden",
  },
  textInput: {
    fontSize: 14,
    color: "#F1FFF5",
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: "center",
  },
  sendBtnWrap: {
    shadowColor: "rgba(5,46,22,0.65)",
    shadowOffset: { width: 4, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 20,
  },
  sendBtnInner: {
    flex: 1,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderTopColor: "rgba(255,255,255,0.40)",
    borderLeftColor: "rgba(255,255,255,0.40)",
    borderRightColor: "rgba(0,0,0,0.45)",
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  sendIcon: { fontSize: 17, color: "#FFFFFF" },
});
