import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import LineChart from "../../components/common/LineChart";
import ProgressBar from "../../components/common/ProgressBar";
import { ICONS } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import {
  buatLaporan,
  getLaporan,
  getWeeklyAnalysis,
  resetAndReport,
} from "../../services/LaporanService";
import { calcProgress, formatDate } from "../../utils";
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";
const C = {
  green: "#4ADE80",
  greenDeep: "#0E7A3B",
  greenDark: "#15803D",
  purple: "#8B5CF6",
  purpleDeep: "#4C3A78",
  red: "#F87171",
  amber: "#FBBF24",
  gold: "#FCD34D",
  blue: "#60A5FA",
  white: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
};
function dedupByDate(laporan = []) {
  const map = new Map();
  for (const l of laporan) {
    const key = (l.tanggal || "").split("T")[0];
    if (!map.has(key)) map.set(key, l);
  }
  return Array.from(map.values());
}

function toChartData(laporan, key) {
  return [...laporan]
    .slice(0, 14)
    .reverse()
    .map((l) => ({
      label: formatDate(l.tanggal, "short"),
      value: Math.round(l[key] || 0),
    }));
}
async function exportPDF(laporan, stats) {
  let Print, Sharing;
  try {
    Print = require("expo-print");
    Sharing = require("expo-sharing");
  } catch {
    Alert.alert(
      "Belum terinstall",
      "Jalankan:\nnpx expo install expo-print expo-sharing\nlalu restart Expo.",
    );
    return;
  }
  const rows = laporan
    .map(
      (l) => `
    <tr>
      <td>${formatDate(l.tanggal)}</td>
      <td>${Math.round(l.total_kalori)} kcal</td>
      <td>${Math.round(l.total_protein)}g</td>
      <td>${Math.round(l.total_karbo || 0)}g</td>
      <td>${Math.round(l.total_lemak || 0)}g</td>
    </tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;padding:28px;color:#111}
    h1{color:#059669;font-size:22px;margin-bottom:4px}
    .sub{color:#6B7280;font-size:12px;margin-bottom:20px}
    .stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
    .stat{background:#F0FDF4;border-radius:10px;padding:12px 16px;min-width:80px;text-align:center}
    .sv{font-size:20px;font-weight:800;color:#059669}
    .sl{font-size:10px;color:#6B7280;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#059669;color:#fff;padding:9px 12px;text-align:left}
    td{padding:8px 12px;border-bottom:1px solid #E5E7EB}
    tr:nth-child(even) td{background:#F9FAFB}
    .footer{margin-top:20px;font-size:10px;color:#9CA3AF;text-align:center}
  </style></head><body>
  <h1>Laporan NutriAI</h1>
  <div class="sub">Diekspor ${new Date().toLocaleString("id-ID")} · ${laporan.length} hari</div>
  <div class="stats">
    <div class="stat"><div class="sv">${stats.avg_kal}</div><div class="sl">Rata² Kalori</div></div>
    <div class="stat"><div class="sv">${stats.avg_prot}g</div><div class="sl">Rata² Protein</div></div>
    <div class="stat"><div class="sv">${stats.hitPct}%</div><div class="sl">Hit Target</div></div>
    <div class="stat"><div class="sv">${laporan.length}</div><div class="sl">Total Hari</div></div>
  </div>
  <table>
    <tr><th>Tanggal</th><th>Kalori</th><th>Protein</th><th>Karbo</th><th>Lemak</th></tr>
    ${rows}
  </table>
  <div class="footer">NutriAI © ${new Date().getFullYear()}</div>
  </body></html>`;
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Ekspor Laporan NutriAI",
      });
    } else {
      Alert.alert("PDF Tersimpan", uri);
    }
  } catch (e) {
    Alert.alert("Gagal export", e?.message || "Error");
  }
}

function BgTexture() {
  const DOTS = React.useMemo(
    () =>
      Array.from({ length: 70 }).map(() => ({
        cx: Math.random() * 100,
        cy: Math.random() * 100,
        r: 0.3 + Math.random() * 0.6,
        o: 0.02 + Math.random() * 0.04,
        dark: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 220"
      preserveAspectRatio="none"
    >
      {DOTS.map((d, i) => (
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

const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.50)" },
  { dx: 3, dy: 5, color: "rgba(0,0,0,0.36)" },
  { dx: 5, dy: 7.5, color: "rgba(0,0,0,0.24)" },
  { dx: 7, dy: 10.5, color: "rgba(0,0,0,0.14)" },
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

function Texture({ opacity = 1, count = 40 }) {
  const DOTS = React.useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        cx: Math.random() * 100,
        cy: Math.random() * 100,
        r: 0.3 + Math.random() * 0.55,
        o: 0.035 + Math.random() * 0.05,
        dark: Math.random() > 0.55,
      })),
    [count],
  );
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
    >
      {DOTS.map((d, i) => (
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
function Card3D({
  children,
  colors,
  borderTint = "rgba(255,255,255,0.10)",
  shadowColor = "rgba(0,0,0,0.5)",
  radius = 20,
  style,
  overlayOpacity = 0.3,
  textureCount = 34,
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          shadowColor,
          shadowOffset: { width: 4, height: 9 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 7,
        },
        style,
      ]}
    >
      <DepthStack radius={radius} />
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          borderRadius: radius,
          borderWidth: 1.5,
          borderTopColor: borderTint,
          borderLeftColor: borderTint,
          borderRightColor: "rgba(0,0,0,0.35)",
          borderBottomColor: "rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <ShadowOverlay opacity={overlayOpacity} />
        <Texture count={textureCount} />
        {children}
      </LinearGradient>
    </View>
  );
}
function SectionLabel({ icon, children }) {
  return (
    <View style={s.secLabelRow}>
      {icon ? <Text style={s.secLabelIcon}>{icon}</Text> : null}
      <Text style={s.secLabel}>{children}</Text>
    </View>
  );
}
function RingIcon({ icon, pct = 60, color = C.green, size = 46 }) {
  const stroke = 3.4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (circumference * Math.max(0, Math.min(100, pct))) / 100;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Image
        source={icon}
        style={{ width: size * 0.46, height: size * 0.46 }}
        resizeMode="contain"
      />
    </View>
  );
}

function MacroItem({ icon, pct, ringColor, value, unit, label }) {
  return (
    <View style={s.macroItem}>
      <RingIcon icon={icon} pct={pct} color={ringColor} />
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={s.macroVal}>{value}</Text>
        <Text style={s.macroUnit}>{unit}</Text>
      </View>
      <Text style={s.macroLabel}>{label}</Text>
    </View>
  );
}

function LaporanItem({ item, target_kalori, target_protein }) {
  const [expanded, setExpanded] = useState(false);
  const pctKal = calcProgress(item.total_kalori, target_kalori);
  const pctProt = calcProgress(item.total_protein, target_protein);
  const hasExtra = item.total_karbo > 0 || item.total_lemak > 0;

  return (
    <TouchableOpacity
      style={s.laporanItem}
      onPress={() => hasExtra && setExpanded((e) => !e)}
      activeOpacity={hasExtra ? 0.7 : 1}
    >
      <View style={s.laporanHeader}>
        <View>
          <Text style={s.laporanDate}>{formatDate(item.tanggal)}</Text>
          {hasExtra && (
            <Text style={s.laporanExpand}>
              {expanded ? "Sembunyikan" : "Detail macro"}
            </Text>
          )}
        </View>
        <View style={s.laporanBadges}>
          <View
            style={[s.badge, { backgroundColor: "rgba(248,113,113,0.16)" }]}
          >
            <Text style={[s.badgeText, { color: C.red }]}>
              {Math.round(item.total_kalori)} kcal
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: "rgba(74,222,128,0.16)" }]}>
            <Text style={[s.badgeText, { color: C.green }]}>
              {Math.round(item.total_protein)}g P
            </Text>
          </View>
        </View>
      </View>
      <View style={s.laporanBars}>
        <View style={s.barRow}>
          <Text style={s.barLabel}>Kalori</Text>
          <ProgressBar
            value={pctKal}
            color={C.red}
            style={{ flex: 1, marginHorizontal: 8 }}
          />
          <Text
            style={[
              s.barPct,
              pctKal >= 100 && { color: C.red, fontWeight: "700" },
            ]}
          >
            {Math.round(pctKal)}%
          </Text>
        </View>
        <View style={s.barRow}>
          <Text style={s.barLabel}>Protein</Text>
          <ProgressBar
            value={pctProt}
            color={C.green}
            style={{ flex: 1, marginHorizontal: 8 }}
          />
          <Text
            style={[
              s.barPct,
              pctProt >= 100 && { color: C.green, fontWeight: "700" },
            ]}
          >
            {Math.round(pctProt)}%
          </Text>
        </View>
      </View>
      {expanded && hasExtra && (
        <View style={s.extraMacros}>
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>Karbohidrat</Text>
            <Text style={[s.extraVal, { color: C.amber }]}>
              {Math.round(item.total_karbo)}g
            </Text>
          </View>
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>Lemak</Text>
            <Text style={[s.extraVal, { color: C.blue }]}>
              {Math.round(item.total_lemak)}g
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
export default function LaporanScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chartTab, setChartTab] = useState("kalori");
  const [exporting, setExporting] = useState(false);

  const { data, loading, execute } = useApi(() => getLaporan(1, 15));

  useRefreshOnFocus(
    useCallback(async () => {
      setPage(1);
      setAllItems([]);
      await execute();
    }, [execute]),
  );

  React.useEffect(() => {
    if (data?.laporan) {
      const deduped = dedupByDate(data.laporan);
      if (page === 1) setAllItems(deduped);
      else setAllItems((prev) => dedupByDate([...prev, ...deduped]));
      setHasMore(data.has_more ?? deduped.length >= 15);
    }
  }, [data]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getLaporan(page + 1, 15);
      if (res?.laporan) {
        setAllItems((prev) =>
          dedupByDate([...prev, ...dedupByDate(res.laporan)]),
        );
        setHasMore(res.has_more ?? res.laporan.length >= 15);
        setPage((p) => p + 1);
      }
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllItems([]);
    setAnalysis(null);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleBuat = async () => {
    try {
      await buatLaporan();
      await execute();
      Alert.alert("Berhasil", "Laporan hari ini berhasil dibuat");
    } catch (e) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.error || "Tidak ada data hari ini",
      );
    }
  };

  const handleReset = () =>
    Alert.alert(
      "Reset & Laporan",
      "Data makanan hari ini akan disimpan ke laporan lalu dihapus. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await resetAndReport();
              await execute();
              Alert.alert(
                res.status === "no_data" ? "Info" : "Berhasil",
                res.status === "no_data"
                  ? "Tidak ada data hari ini"
                  : "Data direset dan laporan tersimpan",
              );
            } catch (e) {
              Alert.alert("Error", e?.response?.data?.error || "Gagal reset");
            }
          },
        },
      ],
    );

  const handleWeeklyAnalysis = async () => {
    setAiLoading(true);
    try {
      setAnalysis(await getWeeklyAnalysis());
    } catch (e) {
      Alert.alert(
        "Info",
        e?.response?.data?.error || "Belum ada data atau AI tidak tersedia",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleExport = async () => {
    if (!allItems.length) {
      Alert.alert("Tidak ada data", "Belum ada laporan untuk diekspor");
      return;
    }
    setExporting(true);
    await exportPDF(allItems, { avg_kal, avg_prot, hitPct });
    setExporting(false);
  };

  const laporan = allItems;
  const target_kalori = data?.target_kalori || 0;
  const target_prot = data?.target_protein || 0;
  const avg_kal = laporan.length
    ? Math.round(
        laporan.reduce((s, l) => s + l.total_kalori, 0) / laporan.length,
      )
    : 0;
  const avg_prot = laporan.length
    ? Math.round(
        laporan.reduce((s, l) => s + l.total_protein, 0) / laporan.length,
      )
    : 0;
  const avg_karbo = laporan.length
    ? Math.round(
        laporan.reduce((s, l) => s + (l.total_karbo || 0), 0) / laporan.length,
      )
    : 0;
  const avg_lemak = laporan.length
    ? Math.round(
        laporan.reduce((s, l) => s + (l.total_lemak || 0), 0) / laporan.length,
      )
    : 0;
  const hitDays = laporan.filter(
    (l) => l.total_kalori >= target_kalori * 0.9,
  ).length;
  const hitPct = laporan.length
    ? Math.round((hitDays / laporan.length) * 100)
    : 0;

  const CHARTS = {
    kalori: {
      data: toChartData(laporan, "total_kalori"),
      color: C.red,
      label: "Kalori",
      unit: "",
      target: target_kalori,
    },
    protein: {
      data: toChartData(laporan, "total_protein"),
      color: C.green,
      label: "Protein",
      unit: "g",
      target: target_prot,
    },
    karbo: {
      data: toChartData(laporan, "total_karbo"),
      color: C.amber,
      label: "Karbo",
      unit: "g",
      target: 0,
    },
  };
  const activeChart = CHARTS[chartTab];

  const kalPct =
    laporan.length && target_kalori
      ? Math.round((avg_kal / target_kalori) * 100)
      : 0;
  const protPct =
    laporan.length && target_prot
      ? Math.round((avg_prot / target_prot) * 100)
      : 0;
  const karboPct = laporan.length ? 55 : 0;
  const lemakPct = laporan.length ? 60 : 0;

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[s.root, { paddingTop: insets.top }]}
    >
      <BgTexture />

      {}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIconOuter}>
            <DepthStack radius={16} />
            <LinearGradient
              colors={["#173C22", "#050B06"]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={s.headerIconInner}
            >
              <ShadowOverlay opacity={0.28} />
              <Texture opacity={0.6} count={24} />
              <Image
                source={ICONS.laporan}
                style={s.headerIconImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <View style={s.titleStack}>
            <Text style={s.titleShadow}>Laporan</Text>
            <Text style={s.title}>Laporan</Text>
            <Text style={s.headerSub}>
              Pantau &amp; tingkatkan pola makanmu
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting || !laporan.length}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[C.green, C.greenDark]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={s.pdfBtn}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={s.pdfBtnTxt}>PDF</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.green}
          />
        }
      >
        {}
        <SectionLabel icon="⚡">Aksi Cepat</SectionLabel>
        <View style={s.aksiRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={handleBuat}
            activeOpacity={0.88}
          >
            <Card3D
              colors={["#1FA35C", "#0E5C33"]}
              shadowColor="rgba(14,92,51,0.55)"
              borderTint="rgba(255,255,255,0.30)"
              overlayOpacity={0.28}
              style={s.cardAksi}
            >
              <View style={s.cardAksiInner}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardBuatTitle}>Buat Laporan</Text>
                  <Text style={s.cardBuatSub}>
                    Simpan snapshot nutrisi hari ini
                  </Text>
                </View>
                <View style={s.arrW}>
                  <Text style={s.arrWTxt}>→</Text>
                </View>
              </View>
            </Card3D>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={handleReset}
            activeOpacity={0.88}
          >
            <Card3D
              colors={["#1C1712", "#0A0805"]}
              shadowColor="rgba(0,0,0,0.55)"
              borderTint="rgba(255,255,255,0.10)"
              overlayOpacity={0.24}
              style={s.cardAksi}
            >
              <View style={s.cardAksiInner}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardResetTitle}>Reset &amp; Lapor</Text>
                  <Text style={s.cardResetSub}>
                    Simpan lalu reset data hari ini
                  </Text>
                </View>
                <View style={s.arrP}>
                  <Text style={s.arrPTxt}>→</Text>
                </View>
              </View>
            </Card3D>
          </TouchableOpacity>
        </View>

        {}
        <SectionLabel>Analisis AI</SectionLabel>
        <Card3D
          colors={["#241A3D", "#0F0A1E"]}
          shadowColor="rgba(76,58,120,0.5)"
          borderTint="rgba(196,166,255,0.20)"
          overlayOpacity={0.26}
          style={s.cardAi}
        >
          <View style={s.cardAiInner}>
            <Image
              source={ICONS.statistik}
              style={s.robotImg}
              resizeMode="contain"
            />
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeTxt}>AI Powered</Text>
            </View>
            <Text style={s.cardAiTitle}>Analisis Mingguan AI</Text>
            <Text style={s.cardAiSub}>
              Insight pola makan 7 hari{"\n"}oleh NutriAI
            </Text>
            <TouchableOpacity
              onPress={handleWeeklyAnalysis}
              disabled={aiLoading}
              activeOpacity={0.85}
              style={{ alignSelf: "flex-start" }}
            >
              <LinearGradient
                colors={[C.purple, "#6D28D9"]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={s.aiGenBtn}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.aiGenTxt}>Generate</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {analysis && (
              <View style={s.analysisBox}>
                <Text style={s.analysisTxt}>{analysis.analysis}</Text>
                {analysis.stats && (
                  <View style={s.analysisStats}>
                    <Text style={s.analysisItem}>
                      Rata² kalori: {analysis.stats.avg_kalori} kcal
                    </Text>
                    <Text style={s.analysisItem}>
                      Rata² protein: {analysis.stats.avg_protein}g
                    </Text>
                    <Text style={s.analysisItem}>
                      Hari input: {analysis.stats.hari_input} hari
                    </Text>
                  </View>
                )}
              </View>
            )}
            {!analysis && (
              <Text style={s.aiHint}>
                Tap "Generate" untuk analisis pola makan 7 hari oleh AI
              </Text>
            )}
          </View>
        </Card3D>

        {}
        <SectionLabel>Ringkasan Minggu Ini</SectionLabel>
        <View style={s.macroRow}>
          <Card3D
            colors={["#241512", "#120A08"]}
            shadowColor="rgba(248,113,113,0.35)"
            borderTint="rgba(255,255,255,0.10)"
            style={s.macroCard}
          >
            <View style={s.macroCardInner}>
              <MacroItem
                icon={ICONS.kalori}
                pct={kalPct}
                ringColor={C.red}
                value={avg_kal || "—"}
                unit="kcal"
                label="Kalori"
              />
            </View>
          </Card3D>
          <Card3D
            colors={["#0F241A", "#08140D"]}
            shadowColor="rgba(74,222,128,0.35)"
            borderTint="rgba(255,255,255,0.10)"
            style={s.macroCard}
          >
            <View style={s.macroCardInner}>
              <MacroItem
                icon={ICONS.protein}
                pct={protPct}
                ringColor={C.green}
                value={avg_prot || "—"}
                unit="g"
                label="Protein"
              />
            </View>
          </Card3D>
          <Card3D
            colors={["#241D0F", "#141008"]}
            shadowColor="rgba(251,191,36,0.35)"
            borderTint="rgba(255,255,255,0.10)"
            style={s.macroCard}
          >
            <View style={s.macroCardInner}>
              <MacroItem
                icon={ICONS.karbo}
                pct={karboPct}
                ringColor={C.amber}
                value={avg_karbo || "—"}
                unit="g"
                label="Karbo"
              />
            </View>
          </Card3D>
          <Card3D
            colors={["#241D0F", "#141008"]}
            shadowColor="rgba(252,211,77,0.35)"
            borderTint="rgba(255,255,255,0.10)"
            style={s.macroCard}
          >
            <View style={s.macroCardInner}>
              <MacroItem
                icon={ICONS.lemak}
                pct={lemakPct}
                ringColor={C.gold}
                value={avg_lemak || "—"}
                unit="g"
                label="Lemak"
              />
            </View>
          </Card3D>
        </View>

        {}
        {laporan.length >= 2 && (
          <>
            <SectionLabel icon="📈">Grafik Tren</SectionLabel>
            <Card3D
              colors={["#0E1A12", "#060D08"]}
              shadowColor="rgba(0,0,0,0.5)"
              borderTint="rgba(255,255,255,0.10)"
              style={s.cardChart}
            >
              <View style={s.cardChartInner}>
                <View style={s.tabRow}>
                  {Object.entries(CHARTS).map(([key, cfg]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        s.tabBtn,
                        chartTab === key && { backgroundColor: cfg.color },
                      ]}
                      onPress={() => setChartTab(key)}
                    >
                      <Text
                        style={[
                          s.tabBtnTxt,
                          chartTab === key && { color: "#0A140D" },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <LineChart
                  data={activeChart.data}
                  color={activeChart.color}
                  height={120}
                  target={activeChart.target}
                  unit={activeChart.unit}
                  style={{ marginTop: 4 }}
                />

                <Text style={s.chartHint}>
                  {Math.min(activeChart.data.length, 14)} hari terakhir
                </Text>
              </View>
            </Card3D>
          </>
        )}

        {}
        <SectionLabel>Riwayat ({laporan.length} hari)</SectionLabel>
        <Card3D
          colors={["#0E1A12", "#060D08"]}
          shadowColor="rgba(0,0,0,0.5)"
          borderTint="rgba(255,255,255,0.10)"
          style={s.cardRiwayat}
        >
          <View style={s.cardRiwayatInner}>
            {loading && !data ? (
              <ActivityIndicator
                size="small"
                color={C.green}
                style={{ marginVertical: 20 }}
              />
            ) : laporan.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>Belum ada laporan</Text>
                <Text style={s.emptySub}>
                  Input makanan lalu tap "Buat Laporan"{"\n"}untuk menyimpan
                  data nutrisimu
                </Text>
                <TouchableOpacity onPress={handleBuat}>
                  <LinearGradient
                    colors={[C.green, C.greenDark]}
                    style={s.emptyArr}
                  >
                    <Text
                      style={{
                        color: C.white,
                        fontSize: 15,
                        fontWeight: "800",
                      }}
                    >
                      →
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              laporan.map((item, i) => (
                <LaporanItem
                  key={item.id || i}
                  item={item}
                  target_kalori={target_kalori}
                  target_protein={target_prot}
                />
              ))
            )}

            {laporan.length > 0 && (
              <View style={s.loadMore}>
                {hasMore ? (
                  <TouchableOpacity
                    style={s.loadMoreBtn}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={C.green} />
                    ) : (
                      <Text style={s.loadMoreTxt}>Muat lebih banyak</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={s.loadMoreEnd}>
                    Semua {laporan.length} laporan ditampilkan
                  </Text>
                )}
              </View>
            )}
          </View>
        </Card3D>
      </ScrollView>

      {}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(2,6,2,0)",
          "rgba(2,6,2,0.22)",
          "rgba(2,6,2,0.55)",
          "rgba(2,6,2,0.82)",
          BG_BOTTOM,
        ]}
        locations={[0, 0.28, 0.55, 0.8, 1]}
        style={[s.footerBox, { height: insets.bottom + 108 }]}
      />

      {}
      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.navigate("Dashboard")}
      />
    </LinearGradient>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingTop: 4 },

  footerBox: { position: "absolute", left: 0, right: 0, bottom: 0 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },

  headerIconOuter: {
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
  headerIconInner: {
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
  headerIconImg: { width: 26, height: 26 },

  titleStack: { justifyContent: "center" },
  titleShadow: {
    position: "absolute",
    top: 1.5,
    left: 1,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textShadowColor: "rgba(74,222,128,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSub: {
    fontSize: 10.5,
    color: C.textSub,
    marginTop: 3,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.3)",
    borderBottomColor: "rgba(0,0,0,0.35)",
    shadowColor: "rgba(21,128,61,0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  pdfBtnTxt: { fontSize: 12, fontWeight: "800", color: "#052E16" },
  secLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 9,
  },
  secLabelIcon: { fontSize: 11 },
  secLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(220,255,230,0.65)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  aksiRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  cardAksi: { flex: 1 },
  cardAksiInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 13,
    minHeight: 78,
  },
  cardBuatTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    marginBottom: 2,
  },
  cardBuatSub: {
    fontSize: 9.5,
    color: "rgba(255,255,255,.82)",
    lineHeight: 13,
  },
  arrW: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  arrWTxt: { color: "#0E5C33", fontSize: 12, fontWeight: "800" },

  cardResetTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    marginBottom: 2,
  },
  cardResetSub: {
    fontSize: 9.5,
    color: "rgba(255,255,255,.55)",
    lineHeight: 13,
  },
  arrP: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowColor: C.purple,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  arrPTxt: { color: C.white, fontSize: 12, fontWeight: "800" },
  cardAi: { marginBottom: 14 },
  cardAiInner: { padding: 15, position: "relative" },
  robotImg: {
    position: "absolute",
    right: 2,
    top: 26,
    width: 132,
    height: 132,
    opacity: 0.95,
  },
  aiBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(139,92,246,.22)",
    borderRadius: 50,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(196,166,255,0.35)",
  },
  aiBadgeTxt: { fontSize: 9, fontWeight: "800", color: "#D6BBFB" },
  cardAiTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.white,
    marginBottom: 3,
    maxWidth: 170,
  },
  cardAiSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 12,
    lineHeight: 14,
    maxWidth: 170,
  },
  aiGenBtn: {
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  aiGenTxt: { fontSize: 11.5, fontWeight: "800", color: C.white },
  aiHint: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 15,
    marginTop: 12,
  },
  analysisBox: {
    backgroundColor: "rgba(139,92,246,.12)",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  analysisTxt: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
  analysisStats: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(139,92,246,.2)",
  },
  analysisItem: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 3,
  },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  macroCard: { flex: 1 },
  macroCardInner: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  macroItem: { alignItems: "center" },
  macroVal: { fontSize: 15, fontWeight: "800", color: C.white },
  macroUnit: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    marginLeft: 1.5,
  },
  macroLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
  cardChart: { marginBottom: 14 },
  cardChartInner: { padding: 15 },
  tabRow: { flexDirection: "row", gap: 7, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabBtnTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
  },
  chartHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    textAlign: "right",
    marginTop: 6,
  },
  cardRiwayat: { marginBottom: 14 },
  cardRiwayatInner: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  emptyState: { alignItems: "center", paddingVertical: 16 },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 14,
  },
  emptyArr: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  laporanItem: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  laporanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  laporanDate: { fontSize: 13, fontWeight: "800", color: C.white },
  laporanExpand: {
    fontSize: 10,
    color: C.green,
    marginTop: 3,
    fontWeight: "600",
  },
  laporanBadges: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 50 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  laporanBars: { gap: 6 },
  barRow: { flexDirection: "row", alignItems: "center" },
  barLabel: {
    width: 44,
    fontSize: 9.5,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  barPct: {
    width: 32,
    fontSize: 9.5,
    color: "rgba(255,255,255,0.4)",
    textAlign: "right",
  },
  extraMacros: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  extraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  extraLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)" },
  extraVal: { fontSize: 11, fontWeight: "800" },
  loadMore: { paddingTop: 14, alignItems: "center" },
  loadMoreBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "rgba(74,222,128,0.10)",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  loadMoreTxt: { fontSize: 12, color: C.green, fontWeight: "700" },
  loadMoreEnd: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    paddingVertical: 10,
  },
});
