import { Image, Text, View } from "react-native";
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import DaunImg from "../../../assets/daun1.png";
import KarakterImg from "../../../assets/karakter.png";

const GREEN_DRK = "#16A34A";
const TXT = "#081229";
const TXT_S = "#64748B";

const VB = "0 0 200 210";
const D_OUTER = [
  "M 56,29",
  "C 80,10 155,30 182,58",
  "C 200,80 168,155 158,174",
  "C 150,192 120,202 108,193",
  "C 78,182 10,160 26,148",
  "C 14,130 14,80 26,70",
  "C 34,52 38,44 56,29 Z",
].join(" ");
const D_INNER = [
  "M 59,34",
  "C 81,16 152,35 177,61",
  "C 194,82 163,151 154,169",
  "C 147,187 119,196 108,187",
  "C 80,176 15,157 31,145",
  "C 20,128 20,82 31,73",
  "C 39,56 42,48 59,34 Z",
].join(" ");

const SZ = 182;
const H = SZ * (210 / 200);

export default function BmiCard({ bmi, label }) {
  return (
    <View style={{ width: SZ, height: H, flexShrink: 0 }}>
      <Svg
        width={SZ}
        height={H}
        viewBox={VB}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          <SvgLinearGradient id="outerFill" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <Stop offset="100%" stopColor="#F2FCF5" stopOpacity="0.97" />
          </SvgLinearGradient>

          <RadialGradient
            id="innerGrad"
            cx="38"
            cy="142"
            fx="38"
            fy="142"
            r="185"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.82" />
            <Stop offset="4%" stopColor="#22C55E" stopOpacity="0.76" />
            <Stop offset="9%" stopColor="#22C55E" stopOpacity="0.68" />
            <Stop offset="14%" stopColor="#22C55E" stopOpacity="0.58" />
            <Stop offset="20%" stopColor="#22C55E" stopOpacity="0.47" />
            <Stop offset="26%" stopColor="#22C55E" stopOpacity="0.37" />
            <Stop offset="32%" stopColor="#22C55E" stopOpacity="0.28" />
            <Stop offset="40%" stopColor="#22C55E" stopOpacity="0.20" />
            <Stop offset="52%" stopColor="#22C55E" stopOpacity="0.20" />
            <Stop offset="65%" stopColor="#22C55E" stopOpacity="0.18" />
            <Stop offset="80%" stopColor="#22C55E" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#22C55E" stopOpacity="0.07" />
          </RadialGradient>
        </Defs>

        {}
        <Path
          d={D_OUTER}
          fill="rgba(34,197,94,0.10)"
          transform="translate(4,9)"
        />
        {}
        <Path d={D_OUTER} fill="url(#outerFill)" />
        <Path
          d={D_OUTER}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={2.5}
        />
        <Path
          d={D_OUTER}
          fill="none"
          stroke="rgba(187,247,208,0.60)"
          strokeWidth={1.2}
        />

        {}
        <Path d={D_INNER} fill="url(#innerGrad)" />
        <Path
          d={D_INNER}
          fill="none"
          stroke="rgba(34,197,94,0.18)"
          strokeWidth={0.8}
        />

        {}
        <Path
          d="M 30,105 L 55,105 L 65,82 L 80,128 L 90,100 L 105,105 L 175,105"
          fill="none"
          stroke="#16A34A"
          strokeWidth={1.5}
          opacity={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {}
      <Image
        source={DaunImg}
        style={{
          position: "absolute",
          top: 30,
          right: -8,
          width: 75,
          height: 75,
          resizeMode: "contain",
          zIndex: 20,
        }}
      />

      {}
      <View
        style={{
          position: "absolute",
          inset: 0,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          paddingBottom: SZ * 0.06,
          paddingLeft: SZ * 0.02,
          paddingRight: SZ * 0.04,
          gap: 0,
          zIndex: 10,
        }}
      >
        {}
        <Image
          source={KarakterImg}
          style={{
            width: SZ * 0.58,
            height: SZ * 0.84,
            resizeMode: "contain",
            flexShrink: 0,
          }}
        />

        {}
        <View
          style={{
            alignItems: "flex-start",
            flexShrink: 1,
            paddingBottom: SZ * 0.16,
            marginLeft: -18,
          }}
        >
          <Text
            style={{
              fontSize: SZ * 0.155,
              fontWeight: "900",
              color: GREEN_DRK,
              lineHeight: SZ * 0.17,
              letterSpacing: -1.5,
            }}
          >
            A
          </Text>
          <Text
            style={{
              fontSize: SZ * 0.092,
              fontWeight: "900",
              color: TXT,
              lineHeight: SZ * 0.106,
              letterSpacing: -0.5,
            }}
          >
            {bmi?.toFixed(1) ?? "–"}
          </Text>
          <Text
            style={{
              fontSize: SZ * 0.055,
              color: TXT_S,
              fontWeight: "600",
              marginTop: 2,
            }}
          >
            {label ?? "Normal"}
          </Text>
        </View>
      </View>
    </View>
  );
}
