/**
 * JarvisVoiceOverlay.js — NutriAI Jarvis "mode on" popover
 *
 * Popover KECIL yang mengambang tepat di atas box Jarvis di QuickAccessGrid
 * (posisinya dikirim lewat prop `anchor`, hasil measureInWindow dari tile
 * itu sendiri — lihat QuickAccessGrid.js > JarvisTile > handlePress).
 * Ini BUKAN bottom-sheet lagi, jadi tidak ada lagi masalah ketutup home-bar
 * bawaan HP, dan tidak menyentuh layout QuickAccessGrid/JarvisCard sama
 * sekali (render-nya lewat Modal, layer sendiri).
 *
 * Kapan tampil: micStatus === 'recording' | 'processing' (lihat DashboardScreen).
 *
 * Fitur:
 *  - Icon PNG Jarvis (mic) dengan pulse ring, ukuran kecil
 *  - Spectrum bar yang bereaksi ke level suara ASLI dari mic (dBFS via
 *    expo-av metering, dinormalisasi 0..1) — bukan animasi dekoratif
 *  - Tombol "Batal" (✕) — buang rekaman, tidak dikirim ke backend
 *  - Tombol "Stop" — hentikan rekaman & proses seperti biasa
 *
 * Props:
 *   visible  — boolean, tampil/tidaknya overlay
 *   status   — 'recording' | 'processing'
 *   level    — number 0..1, level suara real-time (dari metering)
 *   anchor   — { x, y, width, height } | null — posisi tile Jarvis di layar
 *   onStop   — () => void, hentikan rekaman & kirim ke AI
 *   onCancel — () => void, batalkan rekaman tanpa mengirim
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICONS } from '../../constants';

// ── Design tokens (senada dengan JarvisCard.js) ────────────
const GREEN     = '#22C55E';
const GREEN_DRK = '#16A34A';
const DANGER    = '#EF4444';
const PURPLE    = '#818CF8';
const TXT_S     = '#64748B';
const WHITE     = '#FFFFFF';
const SLATE_BG  = '#F1F5F9';
const SLATE_BRD = '#E2E8F0';

// ── Ukuran popover (kecil, sesuai permintaan) ──────────────
const POP_WIDTH   = 208;
const POP_HEIGHT  = 198; // estimasi tinggi konten — dipakai buat naruh posisi "top" popover
const GAP_TO_TILE = 24;  // jarak antara ujung bawah popover & bagian atas tile
                          // (dilebihkan dikit karena sekarang ada label "JARVIS"
                          // yang nongol ~13px di atas box-nya)
const EDGE_PAD    = 12;  // jarak minimum ke tepi layar kiri/kanan

// ── VoiceSpectrum: bar kecil yang bereaksi ke level suara asli ─────
const BAR_SENS = [0.55, 0.85, 1, 0.85, 0.55];
const MIN_BAR  = 4;
const MAX_BAR  = 20;

function VoiceSpectrum({ level, active }) {
  const anims = useRef(BAR_SENS.map(() => new Animated.Value(MIN_BAR))).current;

  useEffect(() => {
    if (!active) {
      anims.forEach(a =>
        Animated.timing(a, { toValue: MIN_BAR, duration: 200, useNativeDriver: false }).start()
      );
      return;
    }
    anims.forEach((a, i) => {
      // Jitter kecil per-bar per-update supaya kerasa "hidup" seperti
      // spectrum sungguhan, tapi tetap proporsional ke level suara asli.
      const jitter = 0.88 + Math.random() * 0.24;
      const target = MIN_BAR + Math.max(0, Math.min(1, level)) * BAR_SENS[i] * jitter * (MAX_BAR - MIN_BAR);
      Animated.timing(a, {
        toValue: Math.min(MAX_BAR, target),
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [level, active]);

  return (
    <View style={sp.row}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[sp.bar, { height: a, backgroundColor: active ? GREEN : '#CBD5E1' }]}
        />
      ))}
    </View>
  );
}

const sp = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 5, height: MAX_BAR, marginTop: 8, marginBottom: 2,
  },
  bar: { width: 4, borderRadius: 2 },
});

// Hitung posisi popover: horizontal center-align ke tile, mengambang tepat
// di atasnya, tapi tetap di-clamp supaya tidak keluar layar (kiri/kanan/atas).
function computePosition(anchor, insetTop) {
  const { width: SW } = Dimensions.get('window');
  const minTop = insetTop + EDGE_PAD;

  if (!anchor) {
    // Fallback kalau anchor belum sempat ke-measure (jarang terjadi).
    return { left: SW - POP_WIDTH - EDGE_PAD, top: minTop, arrowLeft: POP_WIDTH - 28 };
  }

  const centerX = anchor.x + anchor.width / 2;
  let left = centerX - POP_WIDTH / 2;
  left = Math.max(EDGE_PAD, Math.min(left, SW - POP_WIDTH - EDGE_PAD));

  let top = anchor.y - POP_HEIGHT - GAP_TO_TILE;
  top = Math.max(minTop, top);

  // Posisi arrow relatif terhadap kiri popover, tetap nunjuk ke tengah tile
  // walau popover-nya sudah di-geser (clamp) karena mepet tepi layar.
  const arrowLeft = Math.max(16, Math.min(centerX - left - 7, POP_WIDTH - 28));

  return { left, top, arrowLeft };
}

// ── Main component ─────────────────────────────────────────
export default function JarvisVoiceOverlay({ visible, status, level, anchor, onStop, onCancel }) {
  const insets = useSafeAreaInsets();
  const isRecording  = status === 'recording';
  const isProcessing = status === 'processing';

  // Reposisi popover kalau dimensi layar berubah (rotasi device, split-screen,
  // dsb). computePosition() di bawah selalu ambil Dimensions.get('window')
  // yang terbaru, tapi komponen ini cuma re-render kalau props/state berubah
  // — listener ini yang mancing re-render itu. Catatan: anchor.x/y tetap
  // snapshot dari saat tile di-tap, jadi setelah rotasi posisi popover
  // relatif ke tile bisa sedikit meleset, tapi minimal selalu ke-clamp ke
  // batas layar yang baru (gak pernah kepotong/keluar layar).
  const [, forceReposition] = useState(0);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => forceReposition((n) => n + 1));
    return () => {
      // RN lama: Dimensions.addEventListener return undefined & butuh
      // removeEventListener manual. RN baru: return subscription ber-.remove().
      if (sub?.remove) sub.remove();
      else if (Dimensions.removeEventListener) Dimensions.removeEventListener('change', forceReposition);
    };
  }, []);

  const scaleIn = useRef(new Animated.Value(0.85)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const pulse        = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoop    = useRef(null);

  useEffect(() => {
    if (visible) {
      scaleIn.setValue(0.85);
      fadeIn.setValue(0);
      Animated.parallel([
        Animated.spring(scaleIn, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }),
        Animated.timing(fadeIn,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    pulseLoop.current?.stop();
    if (isRecording) {
      pulse.setValue(1);
      pulseOpacity.setValue(0.55);
      pulseLoop.current = Animated.loop(
        Animated.parallel([
          Animated.timing(pulse,        { toValue: 1.35, duration: 950, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0,     duration: 950, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulse.setValue(1);
      pulseOpacity.setValue(0);
    }
    return () => pulseLoop.current?.stop();
  }, [isRecording]);

  if (!visible) return null;

  const accent = isRecording ? DANGER : PURPLE;
  const { left, top, arrowLeft } = computePosition(anchor, insets.top);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => { if (isRecording || isProcessing) onCancel?.(); }}
    >
      <View style={ov.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => { if (isRecording || isProcessing) onCancel?.(); }}
        />

        <Animated.View
          style={[
            ov.popWrap,
            { left, top, opacity: fadeIn, transform: [{ scale: scaleIn }] },
          ]}
        >
          <View style={ov.pop}>
            <LinearGradient
              colors={isRecording ? ['#FEF2F2', '#FFFFFF'] : ['#F5F3FF', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }}
              style={ov.popInner}
            >
              {/* Icon + pulse ring */}
              <View style={ov.iconWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[ov.ring, { borderColor: accent, transform: [{ scale: pulse }], opacity: pulseOpacity }]}
                />
                <View style={[ov.iconCircle, { backgroundColor: isRecording ? '#FEE2E2' : '#EEF2FF' }]}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={PURPLE} />
                  ) : (
                    <Image source={ICONS.mic} style={ov.icon} resizeMode="contain" />
                  )}
                </View>
              </View>

              <Text style={[ov.title, { color: accent }]} numberOfLines={1}>
                {isRecording ? 'Mendengarkan...' : 'Memproses...'}
              </Text>

              {/* Spectrum suara real-time */}
              <VoiceSpectrum level={level} active={isRecording} />

              {/* Actions */}
              <View style={ov.btnRow}>
                {/* Batal TETAP aktif pas processing — audio udah kekirim,
                    tapi user masih bisa mutusin nunggu request-nya lewat
                    AbortController (lihat cancelRecording di DashboardScreen),
                    jadi gak ada lagi kondisi "kejebak nunggu tanpa jalan keluar". */}
                <TouchableOpacity
                  style={ov.cancelBtn}
                  onPress={onCancel}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Text style={ov.cancelIcon}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[ov.stopBtn, isProcessing && ov.btnDisabled]}
                  onPress={onStop}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <>
                      <View style={ov.stopSquare} />
                      <Text style={ov.stopLabel}>Stop</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Arrow kecil nunjuk ke box Jarvis di bawahnya — di LUAR `pop`
              (yang overflow:hidden) supaya tidak ke-clip. */}
          <View pointerEvents="none" style={[ov.arrow, { left: arrowLeft }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Dim sangat tipis — popover ini "mengambang di atas konten", bukan
    // dialog gelap penuh layar, jadi dashboard di belakangnya tetap kebaca.
    backgroundColor: 'rgba(8,18,41,0.10)',
  },
  popWrap: {
    position: 'absolute',
    width: POP_WIDTH,
  },
  pop: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: 'rgba(8,18,41,0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  popInner: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  arrow: {
    position: 'absolute',
    bottom: -6,
    width: 14, height: 14,
    backgroundColor: WHITE,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '45deg' }],
  },
  iconWrap: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  ring: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { width: 20, height: 20 },
  title: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  btnRow: {
    flexDirection: 'row', gap: 8, marginTop: 10, width: '100%',
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SLATE_BG, borderWidth: 1.5, borderColor: SLATE_BRD,
  },
  cancelIcon: { fontSize: 13, fontWeight: '800', color: TXT_S },
  stopBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
    height: 36, borderRadius: 12,
    backgroundColor: GREEN_DRK,
    shadowColor: 'rgba(34,197,94,0.40)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  stopSquare: { width: 10, height: 10, borderRadius: 2.5, backgroundColor: WHITE },
  stopLabel:  { fontSize: 12, fontWeight: '800', color: WHITE },
  btnDisabled: { opacity: 0.55 },
});