/**
 * DashboardScreen.jsx
 * Rebuild pixel-perfect dari gambar referensi NutriAI
 * Design System: Premium Neumorphism + Glassmorphism — iOS Inspired
 * Screen ref: 430px wide | Samsung A10 = 360dp
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoalCard from '../../components/common/GoalCard';
import GreetCard from '../../components/common/GreetCard';
import JarvisCard from '../../components/common/JarvisCard';
import JarvisTextInput from '../../components/common/JarvisTextInput';
import JarvisVoiceOverlay from '../../components/common/JarvisVoiceOverlay';
import NutrisiBox from '../../components/common/NutrisiBox';
import QuickAccessGrid from '../../components/common/QuickAccessGrid';
import api from '../../config/api';
import { BG_IMAGE, ROUTES } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useSyncManager } from '../../hooks/useSyncManager';
import { useTTS } from '../../hooks/useTTS';
import { getDashboard } from '../../services/DashboardService';

// ─── Layout ───────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const PAD   = 14;
const GAP   = 8;
const AVAIL = SW - PAD * 2 - GAP;
const L     = Math.floor(AVAIL * 0.535);
const R     = Math.floor(AVAIL * 0.465);

// ─── Design Tokens ────────────────────────────────────────
const BG         = '#F0F7F2';
const GREEN      = '#22C55E';
const GREEN_DRK  = '#16A34A';
const GREEN_LT   = '#DCFCE7';
const GREEN_MNT  = '#F0FDF4';
const GREEN_BRD  = '#BBF7D0';
const AMBER      = '#F59E0B';
const PURPLE     = '#818CF8';
const WHITE      = '#FFFFFF';
const TXT        = '#081229';
const TXT_S      = '#64748B';
const TXT_M      = '#94A3B8';
const DANGER     = '#EF4444';
const SHD_W      = 'rgba(15,23,42,0.08)';
const SHD_G      = 'rgba(34,197,94,0.25)';

// ─── Gradient presets (sudah tidak dipakai — background sekarang pakai BG_IMAGE) ─

// ─── Recording config: paksa M4A/AAC — .3gp tidak didukung Gemini ────────────
// isMeteringEnabled: true → expo-av ngirim level suara (dBFS) tiap update
// lewat setOnRecordingStatusUpdate, dipakai buat spectrum di JarvisVoiceOverlay.
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension:        '.m4a',
    outputFormat:     2,      // AndroidOutputFormat.MPEG_4
    audioEncoder:     3,      // AndroidAudioEncoder.AAC
    sampleRate:       44100,
    numberOfChannels: 1,
    bitRate:          128000,
  },
  ios: {
    extension:            '.m4a',
    audioQuality:         127,  // IOSAudioQuality.MAX
    sampleRate:           44100,
    numberOfChannels:     1,
    bitRate:              128000,
    linearPCMBitDepth:    16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat:     false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
};
const AUDIO_MIME = 'audio/mp4';

// ─── Batas rekaman & timeout proses ──────────────────────────────────
// MAX_RECORD_MS: auto-stop rekaman kalau user lupa/kelamaan diam — cegah
// file audio membengkak (upload lama, makin gampang gagal) dan cegah user
// nyangkut selamanya di mode "recording".
// PROCESS_TIMEOUT_MS: batas tunggu balasan backend. Kalau kelewat, overlay
// dikeluarin dari state "processing" dengan pesan error yang jelas, bukan
// nyangkut selamanya di "Memproses..." tanpa jalan keluar.
const MAX_RECORD_MS     = 60000; // 60 detik
const PROCESS_TIMEOUT_MS = 25000; // 25 detik
// Key AsyncStorage buat nyimpen histori percakapan Jarvis — sebelumnya
// historyRef cuma hidup di memori, ilang tiap app di-restart/di-kill,
// padahal Jarvis dijual sebagai asisten yang "inget konteks".
const JARVIS_HISTORY_KEY = 'jarvis_chat_history_v1';

// ─── Nutrition Card ───────────────────────────────────────
function NutritionCard({ emoji, label, current, target, unit, barColors, bgColors, pctColor, style }) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct, duration: 900,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[st.nutriCard, style]}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={st.nutriCardInner}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={st.nutriIconWrap}>
            <Text style={st.nutriIcon}>{emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.nutriLabel}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={st.nutriCur}>{current}{unit}</Text>
              <Text style={st.nutriTgt}> / {target}{unit}</Text>
            </View>
          </View>
          <Text style={[st.nutriPct, { color: pctColor }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
        <View style={st.nutriBarBg}>
          <Animated.View style={{ overflow: 'hidden', borderRadius: 999, flex: 1 }}>
            <Animated.View
              style={[
                st.nutriBarFill,
                { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            >
              <LinearGradient
                colors={barColors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 999 }}
              />
            </Animated.View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Result Modal — Center Glassmorphism Dialog ──────────
function ResultModal({ visible, intent, reply, result, onClose, onRefresh, onRevise, onAddMissing }) {
  const ICONS = {
    add_food:'🍽', tambah_data:'➕', use_template:'📋', delete_food:'🗑',
    check_today:'📋', check_nutrition:'📊', check_laporan:'📈',
    add_water:'💧', check_water:'💧', add_weight:'⚖️', check_weight:'⚖️',
    meal_suggestion:'🥗', analyze_nutrition:'🔬', general:'🤖', unclear:'🎤',
  };
  const INTENT_COLORS = {
    add_food: GREEN, tambah_data: '#10B981', delete_food: DANGER,
    add_water: '#38BDF8', check_water: '#38BDF8', use_template: '#8B5CF6',
    add_weight: AMBER, check_weight: AMBER, meal_suggestion: GREEN,
    analyze_nutrition: '#8B5CF6', check_nutrition: GREEN,
    check_today: GREEN, check_laporan: '#6366F1',
    general: TXT_S, unclear: AMBER,
  };

  const needsRefresh = ['add_food','use_template','delete_food','add_water','add_weight'].includes(intent);
  // Ada makanan yang gak ketemu di database (belum ke-catat sama sekali)
  // → tawarin jalan pintas buat langsung daftarin, daripada nyuruh user
  // ngomong ulang lewat "Revisi".
  const hasNotFound = intent === 'add_food' && (result?.not_found?.length || 0) > 0;
  const intentColor  = INTENT_COLORS[intent] || TXT_S;

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 130, friction: 9 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[st.resDialogWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={st.resDialog}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.96)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={st.resGlass}
          >
            {/* ── Header ── */}
            <View style={st.resHeader}>
              <View style={[st.resBadge, { backgroundColor: intentColor + '18', borderColor: intentColor + '40' }]}>
                <Text style={st.resBadgeIcon}>{ICONS[intent] || '🎙'}</Text>
              </View>
              <TouchableOpacity style={st.resCloseBtn} onPress={handleClose} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                <Text style={st.resCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── Reply bubble ── */}
            <View style={[st.resBubble, { borderLeftColor: intentColor }]}>
              <Text style={st.resReply}>{reply}</Text>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {intent === 'add_food' && (
            <View style={st.resBox}>
              {result?.added?.length > 0
                ? result.added.map((a, i) => (
                    <View key={i} style={st.resRow}>
                      <Text style={st.resRowTxt}>✅ {a.nama} ×{a.porsi} ({a.waktu})</Text>
                      <Text style={[st.resRowMeta,{color:GREEN,fontWeight:'700'}]}>+{a.kalori} kcal</Text>
                    </View>
                  ))
                : <Text style={[st.resRowTxt,{color:TXT_S}]}>Tidak ada makanan yang berhasil dicatat.</Text>
              }
              {result?.not_found?.map((n, i) => (
                <View key={i} style={[st.resRow,{backgroundColor:'#FEF2F2',borderRadius:8,padding:6,marginTop:4}]}>
                  <Text style={[st.resRowTxt,{color:DANGER}]}>⚠️ "{n}" tidak ada di database</Text>
                </View>
              ))}
            </View>
          )}

          {intent === 'tambah_data' && result?.status === 'added' && (
            <View style={st.resBox}>
              <Text style={[st.resRowTxt,{fontWeight:'800',marginBottom:8,color:GREEN}]}>✅ {result.nama} ({result.gram_per_porsi}g/porsi)</Text>
              {[['Kalori',result.kalori,'kcal'],['Protein',result.protein,'g'],['Karbo',result.karbo,'g'],['Lemak',result.lemak,'g']].map(([k,v,u])=>(
                <View key={k} style={st.resRow}><Text style={st.resRowMeta}>{k}</Text><Text style={[st.resRowMeta,{fontWeight:'700'}]}>{v}{u}</Text></View>
              ))}
            </View>
          )}
          {intent === 'tambah_data' && result?.status === 'duplicate' && (
            <View style={[st.resBox,{backgroundColor:'#FEF3C7',borderColor:'#FDE68A',borderWidth:1}]}>
              <Text style={{color:'#92400E',fontSize:13}}>⚠️ {result.nama} sudah ada — {result.kalori} kcal | {result.protein}g protein</Text>
            </View>
          )}
          {intent === 'tambah_data' && result?.status === 'error' && (
            <View style={[st.resBox,{backgroundColor:'#FEE2E2'}]}>
              <Text style={{color:'#991B1B',fontSize:13}}>{result.error}</Text>
            </View>
          )}

          {intent === 'use_template' && result?.status === 'ok' && (
            <View style={st.resBox}>
              <Text style={[st.resRowTxt,{color:GREEN,fontWeight:'700'}]}>✅ Template "{result.template_nama}" diterapkan</Text>
              <Text style={st.resRowMeta}>{result.added} makanan ditambahkan untuk {result.waktu}</Text>
            </View>
          )}
          {intent === 'use_template' && result?.status === 'not_found' && (
            <View style={[st.resBox,{backgroundColor:'#FEF3C7'}]}>
              <Text style={{color:'#92400E',fontSize:13}}>⚠️ Template tidak ditemukan</Text>
            </View>
          )}

          {intent === 'delete_food' && result?.status === 'deleted' && (
            <View style={st.resBox}>
              <Text style={[st.resRowTxt,{color:DANGER}]}>🗑 {result.nama} dihapus dari log hari ini</Text>
            </View>
          )}
          {intent === 'delete_food' && result?.status === 'not_found' && (
            <View style={[st.resBox,{backgroundColor:'#FEF3C7'}]}>
              <Text style={{color:'#92400E',fontSize:13}}>⚠️ Makanan tidak ditemukan di log hari ini</Text>
            </View>
          )}

          {intent === 'add_water' && result && (
            <View style={st.resBox}>
              <View style={st.resRow}>
                <Text style={st.resRowTxt}>💧 Ditambahkan</Text>
                <Text style={[st.resRowMeta,{color:'#38BDF8',fontWeight:'700'}]}>+{result.added_ml} ml</Text>
              </View>
              <View style={st.resRow}>
                <Text style={st.resRowMeta}>Total hari ini</Text>
                <Text style={st.resRowMeta}>{result.total_ml} / {result.target_ml} ml</Text>
              </View>
              <View style={{height:6,backgroundColor:'rgba(0,0,0,0.06)',borderRadius:999,marginTop:6}}>
                <View style={{height:6,backgroundColor:'#38BDF8',borderRadius:999,width:`${Math.min((result.total_ml/result.target_ml)*100,100)}%`}}/>
              </View>
              {result.sisa_ml === 0 && <Text style={{color:GREEN,fontSize:12,fontWeight:'700',marginTop:6,textAlign:'center'}}>🎉 Target air tercapai!</Text>}
            </View>
          )}

          {intent === 'check_water' && result && (
            <View style={st.resBox}>
              <View style={st.resRow}><Text style={st.resRowTxt}>💧 Total air hari ini</Text><Text style={[st.resRowMeta,{fontWeight:'700'}]}>{result.total_ml} / {result.target_ml} ml</Text></View>
              <View style={{height:6,backgroundColor:'rgba(0,0,0,0.06)',borderRadius:999,marginTop:6}}>
                <View style={{height:6,backgroundColor:'#38BDF8',borderRadius:999,width:`${result.progress}%`}}/>
              </View>
              <Text style={{fontSize:11,color:TXT_M,marginTop:4,textAlign:'right'}}>{result.progress}%</Text>
            </View>
          )}

          {intent === 'add_weight' && result?.status === 'saved' && (
            <View style={st.resBox}><Text style={[st.resRowTxt,{color:GREEN,fontWeight:'700'}]}>⚖️ Berat badan {result.berat} kg berhasil dicatat</Text></View>
          )}
          {intent === 'add_weight' && result?.status === 'error' && (
            <View style={[st.resBox,{backgroundColor:'#FEE2E2'}]}><Text style={{color:'#991B1B',fontSize:13}}>{result.error}</Text></View>
          )}

          {intent === 'check_weight' && result?.berat && (
            <View style={st.resBox}>
              <View style={st.resRow}><Text style={st.resRowTxt}>⚖️ Berat terakhir</Text><Text style={[st.resRowMeta,{fontWeight:'700'}]}>{result.berat} kg</Text></View>
              <Text style={[st.resRowMeta,{marginBottom:4}]}>{result.tanggal}</Text>
              {result.perubahan !== 0 && (
                <View style={st.resRow}>
                  <Text style={st.resRowMeta}>Perubahan</Text>
                  <Text style={[st.resRowMeta,{color:result.perubahan<0?GREEN:DANGER,fontWeight:'700'}]}>{result.perubahan>0?'+':''}{result.perubahan} kg</Text>
                </View>
              )}
            </View>
          )}

          {intent === 'check_today' && (
            <View style={st.resBox}>
              {result?.entries?.length > 0
                ? result.entries.map((e,i) => (
                    <View key={i} style={st.resRow}>
                      <Text style={st.resRowTxt}>• {e.nama} <Text style={{color:TXT_M,fontSize:11}}>({e.waktu})</Text></Text>
                      <Text style={[st.resRowMeta,{fontWeight:'600'}]}>{e.kalori} kcal</Text>
                    </View>
                  ))
                : <Text style={[st.resRowTxt,{color:TXT_S,textAlign:'center'}]}>Belum ada makanan hari ini 🥄</Text>
              }
              {result?.entries?.length > 0 && (
                <View style={[st.resRow,{marginTop:8,borderTopWidth:1,borderTopColor:'#E2E8F0',paddingTop:8}]}>
                  <Text style={[st.resRowTxt,{fontWeight:'800'}]}>Total</Text>
                  <Text style={[st.resRowMeta,{fontWeight:'800',color:GREEN}]}>{result.total_kalori} kcal · {result.total_protein}g P</Text>
                </View>
              )}
            </View>
          )}

          {intent === 'check_nutrition' && result && (
            <View style={st.resBox}>
              {[['Kalori',result.total_kalori,result.target_kalori,'kcal',GREEN],['Protein',result.total_protein,result.target_protein,'g','#3B82F6']].map(([k,cur,tgt,u,c])=>(
                <View key={k} style={{marginBottom:10}}>
                  <View style={st.resRow}>
                    <Text style={st.resRowTxt}>{k}</Text>
                    <Text style={[st.resRowMeta,{fontWeight:'700',color:c}]}>{cur}{u} <Text style={{color:TXT_M,fontWeight:'400'}}>/ {tgt}{u}</Text></Text>
                  </View>
                  <View style={{height:7,backgroundColor:'rgba(0,0,0,0.06)',borderRadius:999,marginTop:4}}>
                    <View style={{height:7,backgroundColor:c,borderRadius:999,width:`${Math.min((cur/Math.max(tgt,1))*100,100)}%`}}/>
                  </View>
                </View>
              ))}
              {result.streak?.current > 0 && <Text style={[st.resRowMeta,{marginTop:2,textAlign:'center',fontWeight:'600'}]}>🔥 Streak {result.streak.current} hari berturut-turut</Text>}
            </View>
          )}

          {intent === 'check_laporan' && result?.per_hari?.length > 0 && (
            <View style={st.resBox}>
              <Text style={[st.resRowMeta,{marginBottom:8,textAlign:'center'}]}>{result.since} – {result.until} ({result.total_hari} hari)</Text>
              {result.per_hari.map((h,i) => (
                <View key={i} style={st.resRow}>
                  <Text style={st.resRowTxt}>{h.tanggal}</Text>
                  <Text style={st.resRowMeta}>{h.kalori} kcal · {h.protein}g P</Text>
                </View>
              ))}
              <View style={[st.resRow,{marginTop:8,borderTopWidth:1,borderTopColor:'#E2E8F0',paddingTop:8}]}>
                <Text style={[st.resRowTxt,{fontWeight:'800'}]}>Rata-rata</Text>
                <Text style={[st.resRowMeta,{fontWeight:'800',color:GREEN}]}>{result.avg_kalori} kcal · {result.avg_protein}g P</Text>
              </View>
            </View>
          )}
          {intent === 'check_laporan' && (!result?.per_hari || result.per_hari.length === 0) && (
            <View style={[st.resBox,{backgroundColor:'#FEF3C7'}]}>
              <Text style={{color:'#92400E',fontSize:13,textAlign:'center'}}>Belum ada data makanan untuk periode ini.</Text>
            </View>
          )}

          {['meal_suggestion','analyze_nutrition','general'].includes(intent) && result?.answer && (
            <View style={st.resBox}>
              <Text style={{fontSize:13,color:TXT,lineHeight:21}}>{result.answer}</Text>
            </View>
          )}

          {intent === 'unclear' && (
            <View style={[st.resBox,{backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FDE68A'}]}>
              <Text style={{color:'#92400E',fontSize:13,lineHeight:20,textAlign:'center'}}>🎤 Coba ulangi — bicara lebih dekat, jelas, dan tidak terlalu cepat.</Text>
            </View>
          )}

            </ScrollView>

            {/* ── Action buttons ── */}
            <View style={st.resBtnRow}>
              {hasNotFound ? (
                <TouchableOpacity style={[st.btnPri, { flex: 1.2 }]} onPress={() => { handleClose(); onAddMissing(result.not_found); }}>
                  <Text style={st.btnPriTxt}>➕ Tambahkan Datanya</Text>
                </TouchableOpacity>
              ) : needsRefresh && (
                <TouchableOpacity style={[st.btnPri, { flex: 1.2 }]} onPress={() => { onRefresh(); handleClose(); }}>
                  <Text style={st.btnPriTxt}>Lihat Dashboard</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={st.btnSec} onPress={() => { handleClose(); onRevise(); }}>
                <Text style={st.btnSecTxt}>🎙 Revisi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btnSec, { flex: 0, paddingHorizontal: 16 }]} onPress={handleClose}>
                <Text style={st.btnSecTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// dBFS (kira-kira -60..0) → 0..1 linear, dipakai buat tinggi bar spectrum.
// -60dB dianggap "diam", 0dB dianggap paling kenceng.
function meteringToLevel(db) {
  if (typeof db !== 'number' || !isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

// ─── Custom hook: mic recording logic ────────────────────
function useMicRecorder({ onResult, onRefresh, speak }) {
  const [micStatus, setMicStatus] = useState('idle');
  const [micLevel,  setMicLevel]  = useState(0);
  const recRef     = useRef(null);
  const busyRef    = useRef(false);
  const recTimerRef = useRef(null); // id timeout auto-stop (MAX_RECORD_MS)
  const stopRef     = useRef(null); // selalu nunjuk ke stopAndProcess versi terbaru
                                     // (dipakai timer di atas, biar gak stale-closure)
  const abortRef    = useRef(null); // AbortController request yang lagi jalan
                                     // (dipakai cancelRecording buat batalin
                                     // request pas fase "processing")
  // Conversation history: array of {role:'user'|'assistant', text:string}
  const historyRef = useRef([]);

  // Simpen histori ke disk tiap kali berubah — best-effort, gak nge-block
  // apapun kalau gagal (misal storage penuh), cuma di-log.
  const persistHistory = useCallback(() => {
    AsyncStorage.setItem(JARVIS_HISTORY_KEY, JSON.stringify(historyRef.current)).catch((e) => {
      console.warn('[Mic] Gagal simpan history:', e);
    });
  }, []);

  // Hidupin lagi histori dari sesi sebelumnya pas hook pertama kali mount
  // (misal app baru dibuka lagi) — supaya Jarvis beneran "inget" percakapan
  // sebelumnya, bukan cuma sepanjang 1 sesi app kebuka.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(JARVIS_HISTORY_KEY);
        if (raw) historyRef.current = JSON.parse(raw);
      } catch (e) {
        console.warn('[Mic] Gagal load history:', e);
      }
    })();
  }, []);

  const clearRecordTimer = useCallback(() => {
    if (recTimerRef.current) {
      clearTimeout(recTimerRef.current);
      recTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecordTimer();
      if (recRef.current) {
        recRef.current.stopAndUnloadAsync().catch(() => {});
        recRef.current = null;
      }
    };
  }, [clearRecordTimer]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Izin Mikrofon', 'Izin mikrofon diperlukan untuk fitur ini.');
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:   true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      // Update level tiap 100ms — cukup responsif buat spectrum tanpa bikin
      // terlalu banyak re-render.
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) setMicLevel(meteringToLevel(status.metering));
      });
      recRef.current = recording;
      setMicLevel(0);
      setMicStatus('recording');

      // Auto-stop kalau kelamaan (lupa nge-tap Stop, atau lingkungan
      // hening jadi durasi ngambang terus) — cegah file audio membengkak
      // & cegah user nyangkut selamanya di mode "recording".
      clearRecordTimer();
      recTimerRef.current = setTimeout(() => {
        if (recRef.current) stopRef.current?.();
      }, MAX_RECORD_MS);

      return true;
    } catch (e) {
      console.warn('[Mic] startRecording error:', e);
      Alert.alert('Gagal memulai rekaman', e?.message ?? 'Terjadi kesalahan.');
      recRef.current = null;
      setMicStatus('idle');
      return false;
    }
  }, []);

  // Kirim payload (audio ATAU text) ke backend, proses hasilnya, urus history.
  // Dipisah dari stopAndProcess supaya bisa dipakai ulang oleh sendText()
  // (misal dari tombol "➕ Tambahkan Datanya"), gak cuma dari rekaman suara.
  //
  // Dibungkus Promise.race dengan timeout (PROCESS_TIMEOUT_MS): kalau koneksi
  // jelek/backend lambat, UI TIDAK BOLEH nyangkut di "Memproses..." tanpa
  // batas — user harus selalu punya jalan keluar.
  //
  // abortRef nyimpen AbortController request yang lagi jalan, dipakai
  // cancelRecording() supaya tombol "✕ Batal" TETAP hidup walau audio sudah
  // terkirim (fase processing) — sebelumnya begitu Stop dipencet, user
  // kejebak nunggu tanpa jalan keluar sampai backend selesai/gagal sendiri.
  // CATATAN: butuh `api` (config/api.js) berupa instance axios yang nerusin
  // config.signal ke request asli — kalau instance-nya custom/bukan axios,
  // signal ini mungkin diabaikan begitu aja (aman, gak nge-crash, cuma
  // abort-nya jadi gak beneran motong request-nya).
  const processCommand = useCallback(async (payload) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), PROCESS_TIMEOUT_MS);
      });
      const res = await Promise.race([
        api.post('/api/ai/voice-command', {
          ...payload,
          history: historyRef.current.slice(-8), // kirim max 8 pesan terakhir
        }, { signal: controller.signal }),
        timeout,
      ]);

      const { intent, reply, tts_text, action_result } = res.data;

      // Simpan ke history lokal.
      // FIX: sebelumnya cuma balasan assistant yang disimpan — giliran user
      // gak pernah tercatat sama sekali (termasuk pas ngomong via suara,
      // transkripnya emang gak balik ke client). Kalau payload berupa teks
      // (dari sendText), sekarang ikut dicatat juga, supaya Gemini beneran
      // "inget" apa yang diminta user, bukan cuma nebak dari balasannya sendiri.
      if (payload.text) historyRef.current.push({ role: 'user', text: payload.text });
      historyRef.current.push({ role: 'assistant', text: reply });
      // Batasi max 16 item agar tidak membengkak
      if (historyRef.current.length > 16) historyRef.current = historyRef.current.slice(-16);
      persistHistory();

      if (tts_text || reply) speak(tts_text || reply);
      onResult({ intent, reply, result: action_result });

      if (['add_food','use_template','delete_food','add_water','add_weight'].includes(intent)) {
        await onRefresh();
      }
    } catch (e) {
      // Dibatalkan user sendiri (tombol ✕ Batal pas processing) — bukan
      // error, jangan tampilkan pesan apapun. cancelRecording() yang sudah
      // ngurus balikin UI ke idle.
      const isAborted = controller.signal.aborted
        || e?.name === 'CanceledError'
        || e?.code === 'ERR_CANCELED'
        || e?.message === 'canceled';
      if (isAborted) {
        console.log('[Mic] Permintaan dibatalkan user.');
        return;
      }
      console.warn('[Mic] processCommand error:', e);
      const isTimeout = e?.message === 'TIMEOUT';
      const errMsg = isTimeout
        ? 'Waktu tunggu habis. Cek koneksi internet kamu, lalu coba lagi.'
        : (e?.response?.data?.error ?? 'Gagal memproses, coba lagi.');
      onResult({ intent: 'general', reply: errMsg, result: null });
    } finally {
      abortRef.current = null;
    }
  }, [onResult, onRefresh, speak, persistHistory]);

  const stopAndProcess = useCallback(async () => {
    clearRecordTimer();
    const recording = recRef.current;
    if (!recording) { busyRef.current = false; return; }

    setMicStatus('processing');
    setMicLevel(0);
    recRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) throw new Error('URI rekaman tidak ditemukan.');

      const b64 = await readAsStringAsync(uri, { encoding: 'base64' });
      await processCommand({ audio_base64: b64, mime_type: AUDIO_MIME });
    } catch (e) {
      console.warn('[Mic] stopAndProcess error:', e);
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      const errMsg = e?.response?.data?.error ?? 'Gagal memproses, coba lagi.';
      onResult({ intent: 'general', reply: errMsg, result: null });
    } finally {
      setMicStatus('idle');
      busyRef.current = false;
    }
  }, [processCommand, onResult]);

  // stopRef selalu nunjuk ke versi stopAndProcess yang paling baru — dipakai
  // sama timer auto-stop di startRecording, supaya gak ada resiko manggil
  // closure yang basi (stale) walau processCommand/onResult berubah referensi.
  useEffect(() => { stopRef.current = stopAndProcess; }, [stopAndProcess]);

  // Batalkan: kalau masih "recording" → stop & buang audio (gak dikirim).
  // Kalau sudah "processing" (audio udah terkirim) → abort request yang lagi
  // jalan via AbortController, biar user gak kejebak nunggu tanpa jalan
  // keluar. Dipakai tombol "✕ Batal" di JarvisVoiceOverlay, aktif di KEDUA
  // fase itu sekarang (sebelumnya cuma aktif pas recording).
  const cancelRecording = useCallback(async () => {
    clearRecordTimer();

    // Fase processing: batalin request-nya, bukan urusin objek recording
    // (recRef.current sudah null di fase ini, lihat stopAndProcess).
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setMicStatus('idle');
      busyRef.current = false;
      return;
    }

    const recording = recRef.current;
    recRef.current = null;
    setMicLevel(0);

    if (!recording) {
      busyRef.current = false;
      setMicStatus('idle');
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (e) {
      console.warn('[Mic] cancelRecording error:', e);
    } finally {
      setMicStatus('idle');
      busyRef.current = false;
    }
  }, []);

  const handleTalk = useCallback(async () => {
    if (busyRef.current || micStatus === 'processing') return;
    busyRef.current = true;

    if (micStatus === 'idle') {
      const ok = await startRecording();
      if (!ok) {
        busyRef.current = false;
      } else {
        busyRef.current = false; // bisa tap lagi untuk stop
      }
    } else if (micStatus === 'recording') {
      await stopAndProcess(); // busyRef di-reset di finally
    }
  }, [micStatus, startRecording, stopAndProcess]);

  // Kirim perintah TEKS langsung (tanpa rekam suara) — dipakai tombol
  // "➕ Tambahkan Datanya" di ResultModal. Lebih presisi & deterministik
  // daripada nyuruh user ngomong ulang lewat "🎙 Revisi", karena teksnya
  // udah pasti (dibangun dari action_result.not_found), gak bergantung
  // sama Gemini "nebak" konteks dari history yang cuma sepihak.
  const sendText = useCallback(async (text) => {
    if (busyRef.current || micStatus === 'processing') return;
    busyRef.current = true;
    setMicStatus('processing');
    try {
      await processCommand({ text });
    } finally {
      setMicStatus('idle');
      busyRef.current = false;
    }
  }, [processCommand, micStatus]);

  // Expose clearHistory untuk reset konteks jika diperlukan — sekarang ikut
  // hapus salinan yang tersimpan di disk (AsyncStorage), bukan cuma di memori.
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    AsyncStorage.removeItem(JARVIS_HISTORY_KEY).catch(() => {});
  }, []);

  return { micStatus, micLevel, handleTalk, cancelRecording, clearHistory, sendText };
}

// ─── Main Screen ──────────────────────────────────────────
export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, execute }  = useApi(getDashboard);
  const { userId }  = useAuth();
  const { isOnline, syncing, pendingCount } = useSyncManager(userId);
  // isSpeaking: dipakai buat misahin ikon "lagi ngomong balik" (speaker) dari
  // "lagi rekam" (mic) di tile Jarvis — sebelumnya keduanya sama-sama pakai
  // ikon speaker, padahal secara konvensi UI speaker = output bukan input,
  // jadi membingungkan pas dipakai buat nandain rekaman.
  // Default false kalau useTTS() versi kamu belum expose properti ini —
  // JarvisTile otomatis fallback ke ikon mic terus, jadi tetap aman jalan.
  const { speak, isSpeaking = false } = useTTS();

  const [resVis,  setResVis]  = useState(false);
  const [resData, setResData] = useState({ intent: 'general', reply: '', result: null });

  // ── Tambah Data flow: simpan data nutrisi dari AI, tampilkan form konfirmasi ──
  const [pendingFood, setPendingFood] = useState(null);

  // Posisi tile Jarvis di layar (measureInWindow), di-update tiap kali
  // tile di-tap — dipakai buat naruh JarvisVoiceOverlay mengambang tepat
  // di atas box-nya, bukan sebagai bottom-sheet lagi.
  const [jarvisAnchor, setJarvisAnchor] = useState(null);

  // Fallback "ketik perintah" — dibuka dari badge ⌨ di pojok tile Jarvis.
  // Reuse anchor yang sama kayak JarvisVoiceOverlay biar posisinya konsisten.
  const [textInputVisible, setTextInputVisible] = useState(false);

  // ── Fit-1-halaman: semua konten scroll (kecuali GreetCard yang floating)
  // dikecilkan proporsional pakai transform scale, lalu tinggi aslinya
  // diukur via onLayout supaya sisa ruang kosong di bawah (akibat scale)
  // dipangkas pakai marginBottom negatif — jadi tidak ada celah putih
  // dan tidak ada layout internal komponen yang berantakan.
  const [scaledContentH, setScaledContentH] = useState(0);
  // Satu nilai scale yang sama buat X & Y — biar proporsi tetap pas,
  // tidak lonjong/gepeng. transformOrigin 'top' bikin penyusutan terjadi
  // dari atas, jadi konten ikut naik, bukan cuma menyusut di tengah.
  const CONTENT_SCALE = 0.90;

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 580, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 580, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const handleResult = useCallback(({ intent, reply, result }) => {
    // intent tambah_data + needs_confirmation → jangan tampil modal, langsung buka form
    if (intent === 'tambah_data' && result?.status === 'needs_confirmation') {
      setPendingFood({
        nama:          result.nama,
        kalori:        result.kalori,
        protein:       result.protein,
        karbo:         result.karbo,
        lemak:         result.lemak,
        serat:         result.serat,
        gram_per_porsi:result.gram_per_porsi,
      });
      // Ucapkan reply Jarvis (sudah berisi instruksi upload foto)
      if (reply) speak(reply);
      return; // jangan buka ResultModal
    }
    setResData({ intent, reply, result });
    setResVis(true);
  }, [speak]);

  // Ref untuk handleTalk — diisi setelah useMicRecorder, dipakai di handleRevise
  const handleTalkRef = useRef(null);

  const handleRevise = useCallback(() => {
    setResVis(false);
    setTimeout(() => { if (handleTalkRef.current) handleTalkRef.current(); }, 300);
  }, []);

  // ── Handler konfirmasi tambah data: kirim FormData ke backend ───────────────
  const handleConfirmFood = useCallback(async (formData) => {
    try {
      const res = await api.post('/api/ai/confirm-tambah-data', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const data = res.data;

      // Handle duplicate dari server (409)
      if (data?.status === 'duplicate') {
        return { status: 'duplicate', message: data.message || data.error, food: data.food || null };
      }

      // Wajib ada status 'added' dan food.id — bukti masuk DB
      if (data?.status !== 'added' || !data?.food?.id) {
        throw new Error(data?.message || data?.error || 'Server tidak mengkonfirmasi penyimpanan.');
      }

      // Refresh dashboard supaya data terbaru
      await onRefresh();
      return data;
    } catch (err) {
      // Axios: HTTP 409 masuk ke err.response
      if (err?.response?.status === 409) {
        const d = err.response.data;
        return { status: 'duplicate', message: d?.error || d?.message || 'Makanan sudah ada di database.', food: d?.food || null };
      }
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Gagal menyimpan, coba lagi.';
      throw new Error(msg);
    }
  }, [onRefresh]);

  const handleCancelFood = useCallback(() => setPendingFood(null), []);

  const { micStatus, micLevel, handleTalk, cancelRecording, sendText } = useMicRecorder({
    onResult:  handleResult,
    onRefresh,
    speak,
  });

  // Tombol "➕ Tambahkan Datanya" di ResultModal — bangun command teks
  // pasti dari daftar not_found (misal ["cireng"] → "tambah data cireng
  // ke database"), kirim langsung tanpa perlu user ngomong ulang.
  const handleAddMissing = useCallback((notFoundList = []) => {
    if (!notFoundList.length) return;
    const nama = notFoundList[0]; // ambil satu dulu; kalau ada beberapa, sisanya bisa diulang manual
    sendText(`tambah data ${nama} ke database`);
  }, [sendText]);

  // Isi ref setelah handleTalk tersedia
  handleTalkRef.current = handleTalk;

  if (loading && !data) {
    return (
      <ImageBackground source={BG_IMAGE} resizeMode="cover"
        style={[st.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GREEN} />
      </ImageBackground>
    );
  }
  if (!data) {
    return (
      <ImageBackground source={BG_IMAGE} resizeMode="cover"
        style={[st.center, { paddingTop: insets.top }]}>
        <Text style={{ color: TXT_S }}>Tarik ke bawah untuk refresh</Text>
      </ImageBackground>
    );
  }

  const {
    user,
    target_kalori, total_kalori,
    target_protein, total_protein,
  } = data;
  const target_karbo = data.target_karbo ?? Math.round(target_kalori * 0.5 / 4);
  const total_karbo  = data.total_karbo  ?? 0;
  const total_lemak  = data.total_lemak  ?? Math.round(total_kalori * 0.3 / 9);
  const target_lemak = data.target_lemak ?? Math.round(target_kalori * 0.3 / 9);

  // Hitung minggu program dari streak / awal registrasi (fallback ke 1)
  const mingguKe = data.streak?.current
    ? Math.max(1, Math.ceil(data.streak.current / 7))
    : 1;

  return (
    <ImageBackground
      source={BG_IMAGE}
      resizeMode="cover"
      style={[st.root, { paddingTop: insets.top }]}
    >
      {/* Sync banner */}
      {(!isOnline || pendingCount > 0) && (
        <View style={[st.syncBanner,
          { backgroundColor: isOnline ? '#FEF3C7' : '#FEE2E2' }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', textAlign: 'center',
            color: isOnline ? '#92400E' : '#991B1B' }}>
            {!isOnline
              ? '📵 Offline — akan sinkron saat online'
              : syncing ? '🔄 Menyinkronkan...'
              : `⏳ ${pendingCount} data menunggu`}
          </Text>
        </View>
      )}

      {/* ═══ GreetCard — floating, pojok kanan atas, di luar flow scroll ════ */}
      <View style={[st.floatingGreet, { top: 62 }]} pointerEvents="box-none">
        <GreetCard username={user.username} compact />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 8 }]}
        style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
      >
        {/* ═══ Wrapper scale: mengecilkan SEMUA konten di bawah GreetCard
            secara proporsional (bukan ubah style tiap komponen satu-satu,
            supaya layout internal GoalCard/JarvisCard/NutrisiBox/
            QuickAccessGrid — yang file-nya tidak ada di sini — tidak
            ikut ke-edit dan berisiko berantakan). Tinggi asli diukur via
            onLayout, lalu ruang kosong sisa scale dipangkas dengan
            marginBottom negatif supaya tidak ada celah kosong di bawah. ═══ */}
        <View
          onLayout={(e) => setScaledContentH(e.nativeEvent.layout.height)}
          style={{
            transform: [{ scale: CONTENT_SCALE }],
            transformOrigin: 'top',
            marginBottom: scaledContentH ? -(scaledContentH * (1 - CONTENT_SCALE)) : 0,
          }}
        >
          {/* ═══ ROW 1b — Goal Card (full width) ════ */}
          <GoalCard
            tujuan={user.tujuan ?? 'bulking'}
            bbSekarang={user.bb ?? 0}
            bbTarget={user.target_bb ?? (user.bb ?? 0) + 5}
            bbAwal={user.bb_awal ?? (user.bb ?? 0) - 2}
            mingguKe={mingguKe}
            style={{ marginBottom: 8 }}
          />

          {/* ═══ ROW 2 — Jarvis: form konfirmasi tambah data (hanya muncul saat pendingFood) ════ */}
          {pendingFood && (
            <View style={[st.row, { marginBottom: 8 }]}>
              <JarvisCard
                onTalk={handleTalk}
                micStatus={micStatus}
                pendingFood={pendingFood}
                onConfirmFood={handleConfirmFood}
                onCancelFood={handleCancelFood}
              />
            </View>
          )}

          {/* ═══ ROW 3 — Nutrisi Box: Kalori, Karbo, Protein, Lemak (1 box) ════ */}
          <NutrisiBox
            kaloriCurrent={total_kalori}   kaloriTarget={target_kalori}
            karboCurrent={total_karbo}     karboTarget={target_karbo}
            proteinCurrent={total_protein} proteinTarget={target_protein}
            lemakCurrent={total_lemak}     lemakTarget={target_lemak}
            style={{ marginBottom: 8 }}
          />

          {/* ═══ ROW 4 — Quick Access Grid: 6 box (Input Makanan, Tambah Data, Laporan, Profile, Jarvis, Chat NutriAI) ════ */}
          <View style={{ marginTop: 14 }}>
            <QuickAccessGrid
              onInputMakanan={() => navigation.navigate(ROUTES.INPUT_MAKAN)}
              onTambahData={  () => navigation.navigate('TambahData')}
              onLaporan={     () => navigation.navigate(ROUTES.LAPORAN)}
              onProfile={     () => navigation.navigate(ROUTES.PROFIL)}
              onJarvis={(rect) => { setJarvisAnchor(rect); handleTalk(); }}
              onJarvisType={(rect) => { setJarvisAnchor(rect); setTextInputVisible(true); }}
              onChatAI={     () => navigation.navigate('AiChat')}
              micStatus={micStatus}
              isSpeaking={isSpeaking}
            />
          </View>
        </View>
      </Animated.ScrollView>

      <ResultModal
        visible={resVis}
        intent={resData.intent}
        reply={resData.reply}
        result={resData.result}
        onClose={() => setResVis(false)}
        onRefresh={onRefresh}
        onRevise={handleRevise}
        onAddMissing={handleAddMissing}
      />

      {/* ═══ Jarvis "mode on" — popover kecil mengambang di atas box Jarvis,
          spectrum suara real-time + Stop/Batal. Terpisah dari grid/card,
          jadi layout QuickAccessGrid & JarvisCard tidak pernah kesenggol. */}
      <JarvisVoiceOverlay
        visible={micStatus === 'recording' || micStatus === 'processing'}
        status={micStatus}
        level={micLevel}
        anchor={jarvisAnchor}
        onStop={handleTalk}
        onCancel={cancelRecording}
      />

      {/* ═══ Fallback "ketik perintah" — buat situasi gak nyaman/gak bisa
          ngomong ke mic (tempat berisik, mic error, dll). Reuse sendText()
          yang sama dipakai tombol "➕ Tambahkan Datanya" di ResultModal,
          jadi behavior backend-nya sudah teruji, bukan jalur baru. ═══ */}
      <JarvisTextInput
        visible={textInputVisible}
        anchor={jarvisAnchor}
        sending={micStatus === 'processing'}
        onSend={(text) => { setTextInputVisible(false); sendText(text); }}
        onClose={() => setTextInputVisible(false)}
      />
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────
const st = StyleSheet.create({

  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: PAD, paddingTop: 118, paddingBottom: 12 },
  row:    { flexDirection: 'row', gap: GAP },
  syncBanner: { paddingHorizontal: 14, paddingVertical: 7 },
  floatingGreet: {
    position: 'absolute',
    right: PAD + 20,
    zIndex: 20,
    elevation: 20,
  },

  ringCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: SHD_G,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },

  nutriCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: SHD_W, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 18, elevation: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.70)',
  },
  nutriCardInner: {
    borderRadius: 20, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 12,
  },
  nutriIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  nutriIcon:    { fontSize: 26, lineHeight: 30 },
  nutriLabel:   { fontSize: 12, color: TXT_S, fontWeight: '600', marginBottom: 2 },
  nutriCur:     { fontSize: 18, fontWeight: '900', color: TXT, letterSpacing: -0.5 },
  nutriTgt:     { fontSize: 13, color: TXT_M, fontWeight: '400' },
  nutriPct:     { fontSize: 13, fontWeight: '800', alignSelf: 'flex-start', marginTop: 4 },
  nutriBarBg: {
    height: 9, backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 999, marginTop: 10, overflow: 'hidden',
  },
  nutriBarFill: { height: 9, borderRadius: 999 },

  // ── Result Modal — Center Dialog ──────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,18,41,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resDialogWrap: {
    width: '100%',
    maxWidth: 400,
    // Shadow di wrapper — terpisah dari overflow:hidden
    shadowColor: 'rgba(8,18,41,0.30)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 24,
    borderRadius: 28,
    // Border di wrapper agar tidak di-clip Android
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.88)',
  },
  resDialog: {
    borderRadius: 26,
    overflow: 'hidden', // clip gradient dan konten saja
  },
  resGlass: {
    padding: 20,
    paddingBottom: 16,
  },
  resHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resBadge: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  resBadgeIcon: { fontSize: 22 },
  resCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(100,116,139,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  resCloseTxt:  { fontSize: 13, color: TXT_S, fontWeight: '700' },
  resBubble: {
    backgroundColor: 'rgba(248,250,252,0.9)',
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  resReply:   { fontSize: 14, fontWeight: '700', color: TXT, lineHeight: 21 },
  resBox: {
    width: '100%',
    backgroundColor: 'rgba(248,250,252,0.85)',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  resRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  resRowTxt:  { fontSize: 13, color: TXT, flex: 1, lineHeight: 18 },
  resRowMeta: { fontSize: 12, color: TXT_M },
  resBtnRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPri: {
    flex: 1, backgroundColor: GREEN,
    paddingVertical: 13, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPriTxt:  { color: WHITE, fontWeight: '800', fontSize: 13 },
  btnSec: {
    flex: 1, backgroundColor: 'rgba(241,245,249,0.9)',
    paddingVertical: 13, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)',
  },
  btnSecTxt:  { color: TXT_S, fontWeight: '700', fontSize: 13 },
});