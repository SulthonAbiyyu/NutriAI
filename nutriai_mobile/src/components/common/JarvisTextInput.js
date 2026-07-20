import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#818CF8";
const TXT = "#081229";
const TXT_S = "#64748B";
const WHITE = "#FFFFFF";
const SLATE_BG = "#F1F5F9";
const SLATE_BRD = "#E2E8F0";

const POP_WIDTH = 240;
const POP_HEIGHT = 112;
const GAP_TO_TILE = 24;
const EDGE_PAD = 12;

function computePosition(anchor, insetTop) {
  const { width: SW } = Dimensions.get("window");
  const minTop = insetTop + EDGE_PAD;

  if (!anchor) {
    return {
      left: SW - POP_WIDTH - EDGE_PAD,
      top: minTop,
      arrowLeft: POP_WIDTH - 28,
    };
  }
  const centerX = anchor.x + anchor.width / 2;
  let left = centerX - POP_WIDTH / 2;
  left = Math.max(EDGE_PAD, Math.min(left, SW - POP_WIDTH - EDGE_PAD));

  let top = anchor.y - POP_HEIGHT - GAP_TO_TILE;
  top = Math.max(minTop, top);

  const arrowLeft = Math.max(16, Math.min(centerX - left - 7, POP_WIDTH - 28));
  return { left, top, arrowLeft };
}

export default function JarvisTextInput({
  visible,
  anchor,
  sending,
  onSend,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const scaleIn = useRef(new Animated.Value(0.85)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const [, forceReposition] = useState(0);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", () =>
      forceReposition((n) => n + 1),
    );
    return () => {
      if (sub?.remove) sub.remove();
      else if (Dimensions.removeEventListener)
        Dimensions.removeEventListener("change", forceReposition);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setText("");
      scaleIn.setValue(0.85);
      fadeIn.setValue(0);
      Animated.parallel([
        Animated.spring(scaleIn, {
          toValue: 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 6,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  const { left, top, arrowLeft } = computePosition(anchor, insets.top);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    Keyboard.dismiss();
    onSend?.(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (!sending) onClose?.();
      }}
    >
      <View style={ov.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (!sending) onClose?.();
          }}
        />

        <Animated.View
          style={[
            ov.popWrap,
            { left, top, opacity: fadeIn, transform: [{ scale: scaleIn }] },
          ]}
        >
          <View style={ov.pop}>
            <LinearGradient
              colors={["#F5F3FF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={ov.popInner}
            >
              <Text style={ov.title}>Ketik perintah</Text>
              <View style={ov.inputRow}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder="mis. tambah nasi goreng 1 porsi"
                  placeholderTextColor={TXT_S}
                  style={ov.input}
                  editable={!sending}
                  multiline
                  maxLength={200}
                  onSubmitEditing={handleSend}
                  blurOnSubmit
                  returnKeyType="send"
                />
              </View>

              <View style={ov.btnRow}>
                <TouchableOpacity
                  style={ov.cancelBtn}
                  onPress={onClose}
                  disabled={sending}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Text style={ov.cancelIcon}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    ov.sendBtn,
                    (sending || !text.trim()) && ov.btnDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={sending || !text.trim()}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text style={ov.sendLabel}>Kirim</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <View pointerEvents="none" style={[ov.arrow, { left: arrowLeft }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,18,41,0.10)",
  },
  popWrap: {
    position: "absolute",
    width: POP_WIDTH,
  },
  pop: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "rgba(8,18,41,0.35)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  popInner: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  arrow: {
    position: "absolute",
    bottom: -6,
    width: 14,
    height: 14,
    backgroundColor: WHITE,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    transform: [{ rotate: "45deg" }],
  },
  title: { fontSize: 12, fontWeight: "800", color: PURPLE, marginBottom: 8 },
  inputRow: {
    backgroundColor: SLATE_BG,
    borderWidth: 1.5,
    borderColor: SLATE_BRD,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  input: {
    fontSize: 13,
    color: TXT,
    maxHeight: 64,
    minHeight: 32,
    padding: 0,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    width: "100%",
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SLATE_BG,
    borderWidth: 1.5,
    borderColor: SLATE_BRD,
  },
  cancelIcon: { fontSize: 13, fontWeight: "800", color: TXT_S },
  sendBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 12,
    backgroundColor: PURPLE,
    shadowColor: "rgba(129,140,248,0.40)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  sendLabel: { fontSize: 12, fontWeight: "800", color: WHITE },
  btnDisabled: { opacity: 0.5 },
});
