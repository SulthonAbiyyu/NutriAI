import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ICONS } from "../../constants";
function ShadowOverlay({ opacity = 0.32 }) {
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
const NOISE_DOTS = Array.from({ length: 42 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.55,
  o: 0.035 + Math.random() * 0.055,
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
function Title3D({
  label,
  tint = "#FFF7E6",
  edge = "rgba(30,20,8,0.9)",
  pillColors = ["#3A2F22", "#1C140C"],
}) {
  const EXTRUDE = [
    { d: 2.5, c: "rgba(0,0,0,0.55)" },
    { d: 1.5, c: "rgba(0,0,0,0.65)" },
    { d: 0.75, c: edge },
  ];

  return (
    <View style={st.titleAnchor} pointerEvents="none">
      <LinearGradient
        colors={pillColors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={st.titlePill}
      >
        <View style={st.titleTextStack}>
          {EXTRUDE.map((l, i) => (
            <Text
              key={i}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[
                st.titleText,
                { position: "absolute", top: l.d, left: l.d, color: l.c },
              ]}
            >
              {label}
            </Text>
          ))}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[
              st.titleText,
              {
                color: tint,
                textShadowColor: "rgba(255,255,255,0.55)",
                textShadowOffset: { width: 0, height: -1 },
                textShadowRadius: 1,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
function TileIcon({ source, size = 44, style }) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

function Tile({
  colors,
  borderColor,
  shadowColor,
  icon,
  iconSize = 54,
  onPress,
  children,
  overlayOpacity = 0.32,
  accessibilityLabel,
  title,
  titleTint,
  titlePillColors,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 30,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  return (
    <Animated.View
      style={[st.tileWrap, { transform: [{ scale }], shadowColor }]}
    >
      <DepthStack />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            st.tileInner,
            {
              borderTopColor: borderColor,
              borderLeftColor: borderColor,
              borderRightColor: "rgba(0,0,0,0.22)",
              borderBottomColor: "rgba(0,0,0,0.30)",
            },
          ]}
        >
          <ShadowOverlay opacity={overlayOpacity} />
          <Texture />
          {icon && <TileIcon source={icon} size={iconSize} />}
          {children}
        </LinearGradient>
      </TouchableOpacity>
      {title && (
        <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />
      )}
    </Animated.View>
  );
}
function PhotoTile({
  source,
  onPress,
  accessibilityLabel,
  title,
  titleTint,
  titlePillColors,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 30,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  return (
    <Animated.View
      style={[
        st.tileWrap,
        { transform: [{ scale }], shadowColor: "rgba(20,20,20,0.45)" },
      ]}
    >
      <DepthStack />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={source}
          style={[
            st.tileInner,
            {
              borderTopColor: "rgba(255,255,255,0.30)",
              borderLeftColor: "rgba(255,255,255,0.30)",
              borderRightColor: "rgba(0,0,0,0.25)",
              borderBottomColor: "rgba(0,0,0,0.35)",
            },
          ]}
          imageStyle={{ borderRadius: 20 }}
        >
          {}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.38)"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Texture opacity={0.6} />
        </ImageBackground>
      </TouchableOpacity>
      {title && (
        <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />
      )}
    </Animated.View>
  );
}
function JarvisTile({
  onPress,
  onTypePress,
  micStatus,
  isSpeaking,
  title,
  titleTint,
  titlePillColors,
}) {
  const isRecording = micStatus === "recording";
  const isProcessing = micStatus === "processing";
  const isIdle = !isRecording && !isProcessing;
  const wrapRef = useRef(null);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop;
    if (isRecording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      pulse.setValue(1);
    }
    return () => loop?.stop();
  }, [isRecording]);

  const colors = isRecording
    ? ["#665C50", "#332C24"]
    : isProcessing
      ? ["#5C5245", "#302921"]
      : isSpeaking
        ? ["#665C50", "#332C24"]
        : ["#5A5147", "#26211C"];
  const iconSource = isSpeaking ? ICONS.speaker : ICONS.mic;

  const handlePress = () => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      onPress?.({ x, y, width, height });
    });
  };

  const handleTypePress = () => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      onTypePress?.({ x, y, width, height });
    });
  };

  return (
    <Animated.View
      ref={wrapRef}
      collapsable={false}
      style={[st.tileWrap, { shadowColor: "rgba(42,36,28,0.45)" }]}
    >
      <DepthStack />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={{ flex: 1 }}
        accessibilityLabel="Jarvis"
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            st.tileInner,
            {
              borderTopColor: "rgba(255,255,255,0.18)",
              borderLeftColor: "rgba(255,255,255,0.18)",
              borderRightColor: "rgba(0,0,0,0.32)",
              borderBottomColor: "rgba(0,0,0,0.42)",
            },
          ]}
        >
          <ShadowOverlay opacity={0.3} />
          <Texture />
          <Animated.Image
            source={iconSource}
            style={{ width: 54, height: 54, transform: [{ scale: pulse }] }}
            resizeMode="contain"
          />
        </LinearGradient>
      </TouchableOpacity>

      {isIdle && onTypePress && (
        <TouchableOpacity
          style={st.typeBadge}
          onPress={handleTypePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Ketik perintah untuk Jarvis"
        >
          <Text style={st.typeBadgeIcon}>⌨</Text>
        </TouchableOpacity>
      )}
      {title && (
        <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />
      )}
    </Animated.View>
  );
}

export default function QuickAccessGrid({
  onInputMakanan,
  onTambahData,
  onLaporan,
  onProfile,
  onJarvis,
  onJarvisType,
  onChatAI,
  micStatus = "idle",
  isSpeaking = false,
  onExpand,
  onSearch,
  profileImageSource,
}) {
  return (
    <View style={st.grid}>
      {}
      <View style={st.row}>
        <Tile
          icon={ICONS.makanan}
          iconSize={68}
          accessibilityLabel="Input Makanan"
          onPress={onInputMakanan}
          colors={["#0E7A3B", "#4CC584"]}
          borderColor="rgba(255,255,255,0.32)"
          shadowColor="rgba(14,122,59,0.40)"
          title="Makanan"
          titleTint="#EAFBF0"
          titlePillColors={["#2F6B44", "#0F3320"]}
        />

        <Tile
          icon={ICONS.tambahdata}
          accessibilityLabel="Tambah Data"
          onPress={onTambahData}
          colors={["#5C534B", "#1C1815"]}
          borderColor="rgba(255,255,255,0.08)"
          shadowColor="rgba(28,21,16,0.5)"
          title="Tambah Data"
          titleTint="#FDF3E7"
          titlePillColors={["#4A4038", "#1C1815"]}
        />

        <Tile
          icon={ICONS.laporan}
          accessibilityLabel="Laporan"
          onPress={onLaporan}
          colors={["#5A4632", "#241B10"]}
          borderColor="rgba(255,255,255,0.10)"
          shadowColor="rgba(36,27,16,0.5)"
          title="Laporan"
          titleTint="#FFE9C2"
          titlePillColors={["#6B4E22", "#2B1D0C"]}
        />
      </View>

      {}
      <View style={st.row}>
        {profileImageSource ? (
          <PhotoTile
            source={profileImageSource}
            onPress={onProfile}
            accessibilityLabel="Profile"
            title="Profile"
            titleTint="#FFE7C4"
            titlePillColors={["#6B4E2E", "#2E1F10"]}
          />
        ) : (
          <Tile
            icon={ICONS.profile}
            accessibilityLabel="Profile"
            onPress={onProfile}
            colors={["#6E5636", "#3A2A18"]}
            borderColor="rgba(255,255,255,0.16)"
            shadowColor="rgba(58,42,24,0.45)"
            title="Profile"
            titleTint="#FFE7C4"
            titlePillColors={["#6B4E2E", "#2E1F10"]}
          />
        )}
        <JarvisTile
          onPress={onJarvis}
          onTypePress={onJarvisType}
          micStatus={micStatus}
          isSpeaking={isSpeaking}
          title="Asisten NutriAI"
          titleTint="#FDEDE0"
          titlePillColors={["#4A4038", "#1C1613"]}
        />

        <Tile
          icon={ICONS.chatai}
          accessibilityLabel="Chat NutriAI"
          onPress={onChatAI}
          colors={["#5C4A28", "#241C0E"]}
          borderColor="rgba(255,255,255,0.10)"
          shadowColor="rgba(36,28,14,0.5)"
          title="Chat AI"
          titleTint="#FFEFB8"
          titlePillColors={["#6B551F", "#2A210B"]}
        >
          <View style={st.fabRow}>
            {onExpand && (
              <TouchableOpacity
                style={st.fabBtn}
                onPress={onExpand}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={st.fabIcon}>⤢</Text>
              </TouchableOpacity>
            )}
            {onSearch && (
              <TouchableOpacity
                style={[st.fabBtn, { marginLeft: 6 }]}
                onPress={onSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={st.fabIcon}>✦</Text>
              </TouchableOpacity>
            )}
          </View>
        </Tile>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },

  tileWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    position: "relative",
    shadowOffset: { width: 5, height: 11 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  tileInner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 26,
    overflow: "hidden",
  },
  titleAnchor: {
    position: "absolute",
    bottom: 6,
    left: 4,
    right: 4,
    alignItems: "center",
    zIndex: 20,
  },
  titlePill: {
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.40)",
    borderLeftColor: "rgba(255,255,255,0.40)",
    borderRightColor: "rgba(0,0,0,0.45)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 10,
  },
  titleTextStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.1,
    textAlign: "center",
    textTransform: "uppercase",
  },

  fabRow: { position: "absolute", right: 6, bottom: 6, flexDirection: "row" },
  fabBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  fabIcon: { fontSize: 12, fontWeight: "900", color: "#4E3A22" },
  typeBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeIcon: { fontSize: 11, fontWeight: "900", color: "#292524" },
});
