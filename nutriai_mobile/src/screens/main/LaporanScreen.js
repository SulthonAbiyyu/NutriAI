/**
 * LaporanScreen.js — NutriAI Premium UI · Compact
 * Style: Clean Futuristic Pastel · Mint-Cyan-Blue-Purple
 */

import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import BackButtonFloating from '../../components/common/BackButtonFloating';
import LineChart from '../../components/common/LineChart';
import ProgressBar from '../../components/common/ProgressBar';
import { useApi } from '../../hooks/useApi';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { buatLaporan, getLaporan, getWeeklyAnalysis, resetAndReport } from '../../services/LaporanService';
import { calcProgress, formatDate } from '../../utils';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  mint:         '#34d399',
  cyan:         '#06b6d4',
  blue:         '#3b82f6',
  purple:       '#7c3aed',
  navy:         '#0f2027',
  textSub:      '#6b8fa3',
  textMuted:    '#94a3b8',
  white:        '#ffffff',
  bg:           '#f8fffe',
  cardBorder:   'rgba(52,211,153,0.15)',
  purpleBorder: 'rgba(139,92,246,0.12)',
  blueBorder:   'rgba(147,197,253,0.25)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function dedupByDate(laporan = []) {
  const map = new Map();
  for (const l of laporan) {
    const key = (l.tanggal || '').split('T')[0];
    if (!map.has(key)) map.set(key, l);
  }
  return Array.from(map.values());
}

function toChartData(laporan, key) {
  return [...laporan].slice(0, 14).reverse().map(l => ({
    label: formatDate(l.tanggal, 'short'),
    value: Math.round(l[key] || 0),
  }));
}

// ── PDF export ────────────────────────────────────────────────────────────────
async function exportPDF(laporan, stats) {
  let Print, Sharing;
  try {
    Print   = require('expo-print');
    Sharing = require('expo-sharing');
  } catch {
    Alert.alert('Belum terinstall', 'Jalankan:\nnpx expo install expo-print expo-sharing\nlalu restart Expo.');
    return;
  }
  const rows = laporan.map(l => `
    <tr>
      <td>${formatDate(l.tanggal)}</td>
      <td>${Math.round(l.total_kalori)} kcal</td>
      <td>${Math.round(l.total_protein)}g</td>
      <td>${Math.round(l.total_karbo || 0)}g</td>
      <td>${Math.round(l.total_lemak || 0)}g</td>
    </tr>`).join('');
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
  <div class="sub">Diekspor ${new Date().toLocaleString('id-ID')} · ${laporan.length} hari</div>
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
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ekspor Laporan NutriAI' });
    } else {
      Alert.alert('PDF Tersimpan', uri);
    }
  } catch (e) { Alert.alert('Gagal export', e?.message || 'Error'); }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={s.secLabel}>{children}</Text>;
}

function MacroItem({ icon, value, unit, label, badge, badgeStyle, badgeTxtStyle }) {
  return (
    <View style={s.macroItem}>
      <Text style={s.macroIcon}>{icon}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={s.macroVal}>{value}</Text>
        <Text style={s.macroUnit}>{unit}</Text>
      </View>
      <Text style={s.macroLabel}>{label}</Text>
      {badge && (
        <View style={[s.macroBadge, badgeStyle]}>
          <Text style={[s.macroBadgeTxt, badgeTxtStyle]}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function LaporanItem({ item, target_kalori, target_protein }) {
  const [expanded, setExpanded] = useState(false);
  const pctKal  = calcProgress(item.total_kalori,  target_kalori);
  const pctProt = calcProgress(item.total_protein, target_protein);
  const hasExtra = (item.total_karbo > 0) || (item.total_lemak > 0);

  return (
    <TouchableOpacity
      style={s.laporanItem}
      onPress={() => hasExtra && setExpanded(e => !e)}
      activeOpacity={hasExtra ? 0.7 : 1}
    >
      <View style={s.laporanHeader}>
        <View>
          <Text style={s.laporanDate}>{formatDate(item.tanggal)}</Text>
          {hasExtra && (
            <Text style={s.laporanExpand}>{expanded ? 'Sembunyikan' : 'Detail macro'}</Text>
          )}
        </View>
        <View style={s.laporanBadges}>
          <View style={[s.badge, { backgroundColor: '#fef2f2' }]}>
            <Text style={[s.badgeText, { color: '#ef4444' }]}>{Math.round(item.total_kalori)} kcal</Text>
          </View>
          <View style={[s.badge, { backgroundColor: '#f0fdf9' }]}>
            <Text style={[s.badgeText, { color: C.mint }]}>{Math.round(item.total_protein)}g P</Text>
          </View>
        </View>
      </View>
      <View style={s.laporanBars}>
        <View style={s.barRow}>
          <Text style={s.barLabel}>Kalori</Text>
          <ProgressBar value={pctKal}  color="#ef4444" style={{ flex: 1, marginHorizontal: 8 }} />
          <Text style={[s.barPct, pctKal  >= 100 && { color: '#ef4444', fontWeight: '700' }]}>{Math.round(pctKal)}%</Text>
        </View>
        <View style={s.barRow}>
          <Text style={s.barLabel}>Protein</Text>
          <ProgressBar value={pctProt} color={C.mint}  style={{ flex: 1, marginHorizontal: 8 }} />
          <Text style={[s.barPct, pctProt >= 100 && { color: C.mint,    fontWeight: '700' }]}>{Math.round(pctProt)}%</Text>
        </View>
      </View>
      {expanded && hasExtra && (
        <View style={s.extraMacros}>
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>Karbohidrat</Text>
            <Text style={[s.extraVal, { color: '#f59e0b' }]}>{Math.round(item.total_karbo)}g</Text>
          </View>
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>Lemak</Text>
            <Text style={[s.extraVal, { color: C.blue }]}>{Math.round(item.total_lemak)}g</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LaporanScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing,  setRefreshing]  = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [analysis,    setAnalysis]    = useState(null);
  const [page,        setPage]        = useState(1);
  const [allItems,    setAllItems]    = useState([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chartTab,    setChartTab]    = useState('kalori');
  const [exporting,   setExporting]   = useState(false);

  const { data, loading, execute } = useApi(() => getLaporan(1, 15));

  useRefreshOnFocus(useCallback(async () => {
    setPage(1); setAllItems([]); await execute();
  }, [execute]));

  React.useEffect(() => {
    if (data?.laporan) {
      const deduped = dedupByDate(data.laporan);
      if (page === 1) setAllItems(deduped);
      else setAllItems(prev => dedupByDate([...prev, ...deduped]));
      setHasMore(data.has_more ?? deduped.length >= 15);
    }
  }, [data]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getLaporan(page + 1, 15);
      if (res?.laporan) {
        setAllItems(prev => dedupByDate([...prev, ...dedupByDate(res.laporan)]));
        setHasMore(res.has_more ?? res.laporan.length >= 15);
        setPage(p => p + 1);
      }
    } catch {}
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1); setAllItems([]); setAnalysis(null);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleBuat = async () => {
    try {
      await buatLaporan(); await execute();
      Alert.alert('Berhasil', 'Laporan hari ini berhasil dibuat');
    } catch (e) { Alert.alert('Gagal', e?.response?.data?.error || 'Tidak ada data hari ini'); }
  };

  const handleReset = () => Alert.alert(
    'Reset & Laporan',
    'Data makanan hari ini akan disimpan ke laporan lalu dihapus. Lanjutkan?',
    [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Reset', style: 'destructive', onPress: async () => {
        try {
          const res = await resetAndReport(); await execute();
          Alert.alert(
            res.status === 'no_data' ? 'Info' : 'Berhasil',
            res.status === 'no_data' ? 'Tidak ada data hari ini' : 'Data direset dan laporan tersimpan'
          );
        } catch (e) { Alert.alert('Error', e?.response?.data?.error || 'Gagal reset'); }
      }},
    ]
  );

  const handleWeeklyAnalysis = async () => {
    setAiLoading(true);
    try { setAnalysis(await getWeeklyAnalysis()); }
    catch (e) { Alert.alert('Info', e?.response?.data?.error || 'Belum ada data atau AI tidak tersedia'); }
    finally { setAiLoading(false); }
  };

  const handleExport = async () => {
    if (!allItems.length) { Alert.alert('Tidak ada data', 'Belum ada laporan untuk diekspor'); return; }
    setExporting(true);
    await exportPDF(allItems, { avg_kal, avg_prot, hitPct });
    setExporting(false);
  };

  const laporan       = allItems;
  const target_kalori = data?.target_kalori  || 0;
  const target_prot   = data?.target_protein || 0;
  const avg_kal  = laporan.length ? Math.round(laporan.reduce((s, l) => s + l.total_kalori,  0) / laporan.length) : 0;
  const avg_prot = laporan.length ? Math.round(laporan.reduce((s, l) => s + l.total_protein, 0) / laporan.length) : 0;
  const hitDays  = laporan.filter(l => l.total_kalori >= target_kalori * 0.9).length;
  const hitPct   = laporan.length ? Math.round((hitDays / laporan.length) * 100) : 0;

  const CHARTS = {
    kalori:  { data: toChartData(laporan, 'total_kalori'),  color: '#ef4444', label: 'Kalori',  unit: '',  target: target_kalori },
    protein: { data: toChartData(laporan, 'total_protein'), color: C.mint,    label: 'Protein', unit: 'g', target: target_prot   },
    karbo:   { data: toChartData(laporan, 'total_karbo'),   color: '#f59e0b', label: 'Karbo',   unit: 'g', target: 0             },
  };
  const activeChart = CHARTS[chartTab];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image source={require('../../../assets/laporan.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />
          <View>
            <Svg height="28" width="160">
              <Defs>
                <LinearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={C.mint} />
                  <Stop offset="0.5" stopColor={C.cyan} />
                  <Stop offset="1" stopColor={C.blue} />
                </LinearGradient>
              </Defs>
              <SvgText
                x="0" y="22"
                fontSize="22"
                fontWeight="800"
                fill="url(#titleGrad)"
                letterSpacing="-0.5"
              >Laporan</SvgText>
            </Svg>
            <Text style={s.headerSub}>Pantau &amp; tingkatkan pola makanmu</Text>
          </View>
        </View>
        <TouchableOpacity style={s.pdfBtn} onPress={handleExport} disabled={exporting || !laporan.length}>
          {exporting
            ? <ActivityIndicator size="small" color={C.mint} />
            : <Text style={s.pdfBtnTxt}>↓ PDF</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.mint} />}
      >

        {/* ── AKSI CEPAT ── */}
        <SectionLabel>Aksi Cepat</SectionLabel>
        <View style={s.aksiRow}>

          <TouchableOpacity style={s.cardBuat} onPress={handleBuat} activeOpacity={0.88}>
            <View style={s.cardBuatGlow} />
            <View style={s.cardRow}>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.cardBuatTitle}>Buat Laporan</Text>
                <Text style={s.cardBuatSub}>Simpan snapshot nutrisi hari ini</Text>
              </View>
              <View style={s.arrW}><Text style={{ color: C.mint, fontSize: 11, fontWeight: '800' }}>→</Text></View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.cardReset} onPress={handleReset} activeOpacity={0.88}>
            <View style={s.cardRow}>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.cardResetTitle}>Reset &amp; Lapor</Text>
                <Text style={s.cardResetSub}>Simpan lalu reset data hari ini</Text>
              </View>
              <View style={s.arrP}><Text style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>→</Text></View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── ANALISIS AI ── */}
        <SectionLabel>Analisis AI</SectionLabel>
        <View style={s.cardAi}>
          <View style={s.cardAiGlow} />
          <Image source={require('../../../assets/robot.png')} style={s.robotImg} resizeMode="contain" />
          <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>AI Powered</Text></View>
          <Text style={s.cardAiTitle}>Analisis Mingguan AI</Text>
          <Text style={s.cardAiSub}>Insight pola makanmu 7 hari oleh NutriAI</Text>
          <View style={s.aiRow}>
            <TouchableOpacity style={s.aiGenBtn} onPress={handleWeeklyAnalysis} disabled={aiLoading} activeOpacity={0.85}>
              {aiLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.aiGenTxt}>Generate</Text>
              }
            </TouchableOpacity>
          </View>
          {analysis && (
            <View style={s.analysisBox}>
              <Text style={s.analysisTxt}>{analysis.analysis}</Text>
              {analysis.stats && (
                <View style={s.analysisStats}>
                  <Text style={s.analysisItem}>Rata² kalori: {analysis.stats.avg_kalori} kcal</Text>
                  <Text style={s.analysisItem}>Rata² protein: {analysis.stats.avg_protein}g</Text>
                  <Text style={s.analysisItem}>Hari input: {analysis.stats.hari_input} hari</Text>
                </View>
              )}
            </View>
          )}
          {!analysis && (
            <Text style={s.aiHint}>Tap "Generate" untuk analisis pola makan 7 hari oleh AI</Text>
          )}
        </View>

        {/* ── RINGKASAN MINGGU INI — 1 ROW ── */}
        <SectionLabel>Ringkasan Minggu Ini</SectionLabel>
        <View style={s.cardRingkasan}>
          <View style={s.macroRow}>
            <MacroItem icon="" value={avg_kal || '—'}  unit="k"  label="Kalori" />
            <MacroItem icon="" value={avg_prot || '—'} unit="g"  label="Protein" />
            <MacroItem icon="" value="24"              unit="g"  label="Serat" />
            <MacroItem icon="" value="52"              unit="g"  label="Lemak" />
          </View>
        </View>

        {/* ── GRAFIK TREN ── */}
        {laporan.length >= 2 && (
          <>
            <SectionLabel>Grafik Tren</SectionLabel>
            <View style={s.cardChart}>
              <View style={s.tabRow}>
                {Object.entries(CHARTS).map(([key, cfg]) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.tabBtn, chartTab === key && { backgroundColor: cfg.color }]}
                    onPress={() => setChartTab(key)}
                  >
                    <Text style={[s.tabBtnTxt, chartTab === key && { color: '#fff' }]}>{cfg.label}</Text>
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
              <Text style={s.chartHint}>{Math.min(activeChart.data.length, 14)} hari terakhir</Text>
            </View>
          </>
        )}

        {/* ── RIWAYAT ── */}
        <SectionLabel>Riwayat ({laporan.length} hari)</SectionLabel>
        <View style={s.cardRiwayat}>
          {loading && !data ? (
            <ActivityIndicator size="small" color={C.mint} style={{ marginVertical: 20 }} />
          ) : laporan.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyFolder} />
              <Text style={s.emptyTitle}>Belum ada laporan</Text>
              <Text style={s.emptySub}>Input makanan lalu tap "Buat Laporan"{'\n'}untuk menyimpan data nutrisimu</Text>
              <TouchableOpacity style={s.emptyArr} onPress={handleBuat}>
                <Text style={{ color: C.white, fontSize: 15, fontWeight: '800' }}>→</Text>
              </TouchableOpacity>
            </View>
          ) : (
            laporan.map((item, i) => (
              <LaporanItem key={item.id || i} item={item} target_kalori={target_kalori} target_protein={target_prot} />
            ))
          )}

          {laporan.length > 0 && (
            <View style={s.loadMore}>
              {hasMore ? (
                <TouchableOpacity style={s.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
                  {loadingMore
                    ? <ActivityIndicator size="small" color={C.mint} />
                    : <Text style={s.loadMoreTxt}>Muat lebih banyak</Text>
                  }
                </TouchableOpacity>
              ) : (
                <Text style={s.loadMoreEnd}>Semua {laporan.length} laporan ditampilkan</Text>
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Tombol Back ke Dashboard (mengambang, pojok kiri bawah,
          posisi sama kayak di InputMakananScreen) ── */}
      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.navigate('Dashboard')}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 14, paddingTop: 4 },

  // Header
  header:       { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 9, elevation: 5 },
  headerBars:   { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5 },
  bar:          { width: 4, backgroundColor: C.white, borderRadius: 2 },
  headerSub:    { fontSize: 10.5, color: C.textSub, marginTop: 1, fontWeight: '500', letterSpacing: 0.1 },
  pdfBtn:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: 'rgba(52,211,153,.25)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, shadowColor: C.mint, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  pdfBtnTxt:    { fontSize: 11, fontWeight: '700', color: '#059669' },

  // Section label
  secLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },

  // Aksi cepat
  aksiRow:      { flexDirection: 'row', gap: 9, marginBottom: 12 },
  cardRow:      { flexDirection: 'row', alignItems: 'center' },
  cardBuat:     { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden', backgroundColor: C.mint, position: 'relative', justifyContent: 'center', shadowColor: C.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  cardBuatGlow: { position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,.18)' },
  cardBuatSp:   {},
  cardBuatIco:  { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' },
  cardBuatTitle:{ fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 1 },
  cardBuatSub:  { fontSize: 9, color: 'rgba(255,255,255,.78)', lineHeight: 12 },
  arrW:         { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },

  cardReset:     { flex: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.blueBorder, shadowColor: C.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, justifyContent: 'center' },
  cardResetIco:  { width: 32, height: 32, borderRadius: 9, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cardResetTitle:{ fontSize: 11, fontWeight: '800', color: C.navy, marginBottom: 1 },
  cardResetSub:  { fontSize: 9, color: C.textSub, lineHeight: 12 },
  arrP:          { width: 20, height: 20, borderRadius: 10, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },

  // AI card
  cardAi:     { borderRadius: 18, padding: 11, marginBottom: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.purpleBorder, shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3, overflow: 'hidden', position: 'relative' },
  cardAiGlow: { position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(139,92,246,.07)' },
  aiBadge:    { alignSelf: 'flex-start', backgroundColor: 'rgba(139,92,246,.1)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  aiBadgeTxt: { fontSize: 9, fontWeight: '700', color: C.purple },
  cardAiTitle:{ fontSize: 13, fontWeight: '800', color: C.navy, marginBottom: 2 },
  cardAiSub:  { fontSize: 9.5, color: C.textSub, marginBottom: 8, lineHeight: 13 },
  aiRow:      { flexDirection: 'row', alignItems: 'center' },
  robotImg:   { position: 'absolute', right: 6, top: '50%', marginTop: -70, width: 140, height: 140 },
  aiGenBtn:   { backgroundColor: C.purple, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, shadowColor: C.purple, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.26, shadowRadius: 8, elevation: 4 },
  aiGenTxt:   { fontSize: 11, fontWeight: '700', color: C.white },
  aiHint:     { fontSize: 11, color: C.textMuted, lineHeight: 16, marginTop: 10 },
  analysisBox:   { backgroundColor: 'rgba(139,92,246,.07)', borderRadius: 14, padding: 12, marginTop: 10 },
  analysisTxt:   { fontSize: 12, color: C.navy, lineHeight: 18 },
  analysisStats: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,.12)' },
  analysisItem:  { fontSize: 11, color: C.textSub, marginBottom: 3 },

  // Ringkasan — 1 row
  cardRingkasan: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.cardBorder, shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  macroRow:      { flexDirection: 'row', gap: 5 },
  macroItem:     { flex: 1, backgroundColor: '#f0fdf9', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(52,211,153,.1)', alignItems: 'center' },
  macroIcon:     { fontSize: 12, marginBottom: 2, textAlign: 'center' },
  macroVal:      { fontSize: 13, fontWeight: '800', color: C.navy },
  macroUnit:     { fontSize: 8, fontWeight: '600', color: C.textMuted, marginLeft: 1 },
  macroLabel:    { fontSize: 8.5, color: C.textSub, marginTop: 1, fontWeight: '500', textAlign: 'center' },
  macroBadge:    { marginTop: 3, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  macroBadgeTxt: { fontSize: 7.5, fontWeight: '700', textAlign: 'center' },
  bdgStabil:  { backgroundColor: '#dcfce7' },
  bdgBaik:    { backgroundColor: '#dbeafe' },
  bdgCukup:   { backgroundColor: '#fef9c3' },
  bdgTxtG:    { color: '#15803d' },
  bdgTxtB:    { color: '#1d4ed8' },
  bdgTxtY:    { color: '#92400e' },

  // Chart
  cardChart:  { borderRadius: 22, padding: 14, marginBottom: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.cardBorder, shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  tabRow:     { flexDirection: 'row', gap: 7, marginBottom: 8 },
  tabBtn:     { flex: 1, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f0fdf9', alignItems: 'center' },
  tabBtnTxt:  { fontSize: 11, fontWeight: '700', color: C.textMuted },
  chartHint:  { fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 5 },

  // Riwayat
  cardRiwayat: { borderRadius: 16, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8, marginBottom: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.cardBorder, shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  emptyState:  { alignItems: 'center', paddingVertical: 14 },
  emptyFolder: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f0fdf9', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(52,211,153,.2)', marginBottom: 8 },
  emptyTitle:  { fontSize: 12, fontWeight: '800', color: C.navy, marginBottom: 3 },
  emptySub:    { fontSize: 10, color: C.textSub, textAlign: 'center', lineHeight: 14, marginBottom: 12 },
  emptyArr:    { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },

  // LaporanItem
  laporanItem:    { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(52,211,153,.1)' },
  laporanHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  laporanDate:    { fontSize: 12, fontWeight: '700', color: C.navy },
  laporanExpand:  { fontSize: 10, color: C.mint, marginTop: 2 },
  laporanBadges:  { flexDirection: 'row', gap: 5 },
  badge:          { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50 },
  badgeText:      { fontSize: 10, fontWeight: '700' },
  laporanBars:    { gap: 5 },
  barRow:         { flexDirection: 'row', alignItems: 'center' },
  barLabel:       { width: 40, fontSize: 9.5, color: C.textMuted, fontWeight: '600' },
  barPct:         { width: 30, fontSize: 9.5, color: C.textMuted, textAlign: 'right' },
  extraMacros:    { marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(52,211,153,.1)' },
  extraRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  extraLabel:     { fontSize: 11, color: C.textSub },
  extraVal:       { fontSize: 11, fontWeight: '800' },

  // Load more
  loadMore:    { paddingTop: 12, alignItems: 'center' },
  loadMoreBtn: { paddingVertical: 9, paddingHorizontal: 22, backgroundColor: '#f0fdf9', borderRadius: 50 },
  loadMoreTxt: { fontSize: 12, color: C.mint, fontWeight: '700' },
  loadMoreEnd: { fontSize: 11, color: C.textMuted, paddingVertical: 9 },
});