import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const GREEN = "#22C55E";
const GREEN_DRK = "#16A34A";
const GREEN_LT = "#DCFCE7";
const GREEN_50 = "#ECFDF3";
const TXT = "#081229";
const TXT_S = "#64748B";
const SHD_W = "rgba(15,23,42,0.08)";

export default function AksiCepat({
  onScan,
  onInput,
  onLaporan,
  onLainnya,
  width,
}) {
  const btns = [
    {
      icon: (
        <Svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={GREEN_DRK}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle cx="12" cy="13" r="4" />
        </Svg>
      ),
      top: "Scan",
      bot: "Makanan",
      bg: [GREEN_50, GREEN_LT],
      fn: onScan,
    },
    {
      icon: (
        <Svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Svg>
      ),
      top: "Input",
      bot: "Makanan",
      bg: ["#EEF2FF", "#C7D2FE"],
      fn: onInput,
    },
    {
      icon: (
        <Svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <Path d="M18 20V10M12 20V4M6 20v-6" />
        </Svg>
      ),
      top: "Laporan",
      bot: "Progress",
      bg: ["#EEF2FF", "#C7D2FE"],
      fn: onLaporan,
    },
    {
      icon: (
        <Svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <Circle cx="8" cy="8" r="3" />
          <Circle cx="16" cy="8" r="3" />
          <Circle cx="8" cy="16" r="3" />
          <Circle cx="16" cy="16" r="3" />
        </Svg>
      ),
      top: "Lainnya",
      bot: "Fitur Lain",
      bg: ["#FEE2E2", "#FECACA"],
      fn: onLainnya,
    },
  ];

  return (
    <View style={[st.aksiCard, { width }]}>
      <View style={st.aksiHeader}>
        <Text style={st.aksiTitle}>Aksi Cepat</Text>
        <Text style={{ fontSize: 14, color: GREEN }}>✦</Text>
      </View>

      <View style={st.aksiRow}>
        {btns.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={st.aksiItem}
            onPress={b.fn}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={b.bg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.aksiBubble}
            >
              {b.icon}
            </LinearGradient>
            <Text style={st.aksiTop}>{b.top}</Text>
            <Text style={st.aksiBot}>{b.bot}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  aksiCard: {
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: SHD_W,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.70)",
  },
  aksiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  aksiTitle: { fontSize: 11, fontWeight: "700", color: TXT_S },

  aksiRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  aksiItem: {
    flex: 1,
    flexShrink: 1,
    alignItems: "center",
  },

  aksiBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: SHD_W,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },

  aksiTop: { fontSize: 11, fontWeight: "700", color: TXT, textAlign: "center" },
  aksiBot: {
    fontSize: 9,
    fontWeight: "500",
    color: TXT_S,
    textAlign: "center",
  },
});
