import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Stop,
  LinearGradient as SvgLG,
} from "react-native-svg";

const CARD_BG_TOP = "#0B120D";
const CARD_BG_MID = "#060A07";
const CARD_BG_BOTTOM = "#020403";
const CARD_BORDER_TL = "rgba(255,255,255,0.10)";
const CARD_BORDER_BR = "rgba(0,0,0,0.55)";
const TRACK_COLOR = "rgba(255,255,255,0.10)";
const LABEL_WHITE = "#FFFFFF";
const SUB_GRAY = "rgba(255,255,255,0.40)";
const DIVIDER_COLOR = "rgba(255,255,255,0.14)";

const STATS_CONFIG = {
  kalori: { grad: ["#7CD4FF", "#2D9CFF"], unit: "kkal" },
  karbo: { grad: ["#7CF5A0", "#22E070"], unit: "g" },
  protein: { grad: ["#FF9494", "#FF3B3B"], unit: "g" },
  lemak: { grad: ["#D9A8FF", "#A855F7"], unit: "g" },
};

const CIRCLE_SIZE = 72;
const STROKE_WIDTH = 7;
const RADIUS = 26;
function ShadowOverlay({ opacity = 0.3 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.1, y: 0.05 }}
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

function DepthStack({ radius = RADIUS }) {
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
const NOISE_DOTS = Array.from({ length: 55 }).map(() => ({
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
function NeonTitle({ label }) {
  return (
    <Text style={[st.title, { marginBottom: 18, color: "#3DFF8F" }]}>
      {label}
    </Text>
  );
}
function Pct3D({ value }) {
  return <Text style={st.pctText}>{value}%</Text>;
}
function CircleStat({ id, label, current, target, showDivider }) {
  const cfg = STATS_CONFIG[id];
  const pct = Math.min(current / Math.max(target, 1), 1);

  const r = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const CIR = 2 * Math.PI * r;

  const anim = useRef(new Animated.Value(0)).current;
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const listener = anim.addListener(({ value }) => setAnimPct(value));
    Animated.timing(anim, {
      toValue: pct,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(listener);
  }, [pct]);

  const gradId = `nutriGrad-${id}`;

  return (
    <View style={st.col}>
      <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Defs>
            <SvgLG id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={cfg.grad[0]} />
              <Stop offset="100%" stopColor={cfg.grad[1]} />
            </SvgLG>
          </Defs>

          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={r}
            stroke={TRACK_COLOR}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={r}
            stroke={`url(#${gradId})`}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIR} ${CIR}`}
            strokeDashoffset={CIR - CIR * animPct}
            strokeLinecap="round"
            rotation={-90}
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>

        <View style={st.pctWrap} pointerEvents="none">
          <Pct3D value={Math.round(pct * 100)} />
        </View>
      </View>

      <Text style={st.itemLabel}>{label}</Text>
      <Text style={st.itemSub}>
        {current} / {target} {cfg.unit}
      </Text>

      {showDivider && <View style={st.divider} />}
    </View>
  );
}

export default function NutrisiBox({
  kaloriCurrent = 0,
  kaloriTarget = 2000,
  karboCurrent = 0,
  karboTarget = 300,
  proteinCurrent = 0,
  proteinTarget = 150,
  lemakCurrent = 0,
  lemakTarget = 65,
  style,
}) {
  const items = [
    {
      id: "kalori",
      label: "Kalori",
      current: kaloriCurrent,
      target: kaloriTarget,
    },
    { id: "karbo", label: "Karbo", current: karboCurrent, target: karboTarget },
    {
      id: "protein",
      label: "Protein",
      current: proteinCurrent,
      target: proteinTarget,
    },
    { id: "lemak", label: "Lemak", current: lemakCurrent, target: lemakTarget },
  ];

  return (
    <View style={[st.cardWrap, style]}>
      {}
      <DepthStack />

      {}
      <LinearGradient
        colors={[CARD_BG_TOP, CARD_BG_MID, CARD_BG_BOTTOM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[
          st.cardInner,
          {
            borderTopColor: CARD_BORDER_TL,
            borderLeftColor: CARD_BORDER_TL,
            borderRightColor: CARD_BORDER_BR,
            borderBottomColor: CARD_BORDER_BR,
          },
        ]}
      >
        {}
        <ShadowOverlay />
        <Texture />

        {}
        <NeonTitle label="RINGKASAN NUTRISI HARI INI" />

        <View style={st.row}>
          {items.map((it, i) => (
            <CircleStat
              key={it.id}
              id={it.id}
              label={it.label}
              current={it.current}
              target={it.target}
              showDivider={i < items.length - 1}
            />
          ))}
        </View>

        <View style={st.infoBoxWrap}>
          <View style={st.infoDepth} pointerEvents="none" />
          <LinearGradient
            colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.02)"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={st.infoBox}
          >
            <View style={st.infoIconWrap}>
              <Text style={st.infoIconTxt}>i</Text>
            </View>
            <Text
              style={st.infoText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              <Text style={st.infoTextStrong}>Terus konsisten!</Text>
              <Text style={st.infoTextNormal}>
                {" "}
                Setiap usaha kecil membawa hasil besar.
              </Text>
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  cardWrap: {
    width: "100%",
    borderRadius: RADIUS,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.65)",
    shadowOffset: { width: 5, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  cardInner: {
    borderRadius: RADIUS,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: "hidden",
  },
  title: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  divider: {
    position: "absolute",
    right: 0,
    top: CIRCLE_SIZE / 2 - 22,
    width: 1,
    height: 44,
    backgroundColor: DIVIDER_COLOR,
  },
  pctWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pctText: {
    color: LABEL_WHITE,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  itemLabel: {
    color: LABEL_WHITE,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  itemSub: {
    color: SUB_GRAY,
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  infoBoxWrap: {
    marginTop: 18,
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  infoDepth: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    bottom: -2,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: "rgba(255,255,255,0.22)",
    borderLeftColor: "rgba(255,255,255,0.22)",
    borderRightColor: "rgba(0,0,0,0.35)",
    borderBottomColor: "rgba(0,0,0,0.40)",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  infoIconWrap: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  infoIconTxt: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  infoText: {
    flex: 1,
    fontSize: 10.8,
    lineHeight: 15,
  },
  infoTextStrong: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  infoTextNormal: {
    color: "rgba(255,255,255,0.62)",
    fontWeight: "500",
  },
});
