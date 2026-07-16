/**
 * GoalCard.js
 * Style: dark card 3D — background bgbox.jpg TETAP dipakai, cuma overlay-nya
 * diganti super dark (nyaris hitam, rona hijau tipis) persis ref image baru.
 * Treatment 3D (DepthStack, ShadowOverlay, Texture noise, bevel border) sama
 * persis resep yang sudah dipakai di NutrisiBox.js / QuickAccessGrid.js biar
 * bahasa desainnya konsisten satu app.
 *
 * CATATAN PENTING soal warna progress:
 * Sebelumnya tiap goal (bulking/cutting/maintain) punya warna kartu & progress
 * beda-beda (ungu/merah/hijau). Di ref image baru, progress bar + persentase
 * "Bulking" tampil HIJAU — jadi warna progress sekarang disatukan jadi satu
 * accent hijau universal (representasi "on track"/progress), TIDAK lagi
 * mengikuti warna identitas goal. Kalau kamu tetap mau tiap goal punya warna
 * accent beda (ungu utk bulking, dst), tinggal bilang, saya kembalikan jadi
 * per-goal.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
const BG_BOX = require('../../../assets/bgbox.jpg');

const RADIUS = 22;

// Overlay dasar super dark (universal, tidak lagi per-goal) — dipasang DI ATAS
// bgbox.jpg via LinearGradient, bukan menghapus background-nya.
const OVERLAY_TOP    = 'rgba(6,14,10,0.94)';
const OVERLAY_MID    = 'rgba(4,9,7,0.96)';
const OVERLAY_BOTTOM = 'rgba(2,5,4,0.97)';

// Accent hijau universal (progress bar, persen, badge) — flat & vivid, TANPA
// shadow, sesuai preferensi terakhir (tajam-cerah-padat, bukan glow tebal).
const ACCENT_GREEN      = '#22E070';
const ACCENT_GREEN_SOFT = ['#7CF5A0', '#22E070'];

const GOAL_CONFIG = {
  bulking:  { label: 'Bulking',  emoji: '💪', dumbbell: '🏋️' },
  cutting:  { label: 'Cutting',  emoji: '🔥', dumbbell: '⚡' },
  maintain: { label: 'Maintain', emoji: '⚖️', dumbbell: '🌿' },
};

// ── DepthStack ───────────────────────────────────────────────────────
// Persis resep NutrisiBox.js: beberapa layer identik bentuk card, ditumpuk
// geser kanan-bawah makin transparan → simulasi blur+shadow asli.
const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: 'rgba(0,0,0,0.55)' },
  { dx: 3,   dy: 5,   color: 'rgba(0,0,0,0.40)' },
  { dx: 5,   dy: 7.5, color: 'rgba(0,0,0,0.26)' },
  { dx: 7,   dy: 10.5,color: 'rgba(0,0,0,0.15)' },
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

// ── ShadowOverlay ────────────────────────────────────────────────────
function ShadowOverlay({ opacity = 0.30 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.1, y: 0.05 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

// ── Texture (noise/grain) ────────────────────────────────────────────
const NOISE_DOTS = Array.from({ length: 55 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.55,
  o: 0.03 + Math.random() * 0.05,
  dark: Math.random() > 0.55,
}));

function Texture({ opacity = 1 }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width="100%" height="100%">
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o * opacity})` : `rgba(255,255,255,${d.o * opacity})`}
        />
      ))}
    </Svg>
  );
}

export default function GoalCard({
  tujuan     = 'bulking',
  bbSekarang = 70,
  bbTarget   = 75,
  bbAwal     = 65,
  mingguKe   = 3,
  style,
}) {
  const config = GOAL_CONFIG[tujuan] ?? GOAL_CONFIG.bulking;

  const range   = Math.abs(bbTarget - bbAwal);
  const covered = Math.abs(bbSekarang - bbAwal);
  const pct     = range > 0 ? Math.min(Math.max(covered / range, 0), 1) : 0;
  const pctLabel = Math.round(pct * 100);

  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue:         pct,
      duration:        950,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[st.wrapper, style]}>
      {/* Layer 1-2: depth stack (blur+shadow palsu, kanan-bawah) */}
      <DepthStack />

      <ImageBackground
        source={BG_BOX}
        style={st.card}
        imageStyle={st.cardImage}
        resizeMode="cover"
      >
        {/* Layer 3: overlay super dark universal — background PNG tetap ada,
            cuma "diredupkan" total via gradient nyaris opaque di atasnya */}
        <LinearGradient
          pointerEvents="none"
          colors={[OVERLAY_TOP, OVERLAY_MID, OVERLAY_BOTTOM]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 4-5: shadow overlay diagonal + texture noise, biar permukaan
            berlapis & bertekstur, bukan flat vector */}
        <ShadowOverlay />
        <Texture />

        {/* Highlight glossy tipis pojok kiri-atas — pakai gradient yang
            fade total ke transparan (bukan kotak solid ber-tepi tegas)
            supaya tidak muncul garis/seam aneh di atas overlay super dark */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          locations={[0, 0.35, 0.75]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Dumbbell floating kanan ── */}
        <View style={st.dumbbellWrap} pointerEvents="none">
          <Text style={st.dumbbellEmoji}>{config.dumbbell}</Text>
        </View>

        {/* ── Konten kiri ── */}
        <View style={st.content}>
          {/* GOAL AKTIF badge — pill dgn bevel tipis, senada infoBox NutrisiBox */}
          <View style={st.badgeWrap}>
            <Text style={st.goalActif}>GOAL AKTIF</Text>
          </View>

          {/* Emoji + Label */}
          <View style={st.titleRow}>
            <Text style={st.titleEmoji}>{config.emoji}</Text>
            <Text style={st.titleLabel}>{config.label}</Text>
          </View>

          {/* Progress bar */}
          <View style={st.barBg}>
            <Animated.View
              style={[
                st.barFillWrap,
                {
                  width: barAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={ACCENT_GREEN_SOFT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.barFill}
              />
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={st.footerRow}>
            <Text style={st.pctRow}>
              <Text style={st.pctLabel}>{pctLabel}%</Text>
              <Text style={st.pctSuffix}> selesai</Text>
            </Text>
            <Text style={st.targetLabel}>
              Target: {bbTarget}kg · Sekarang: {bbSekarang}kg
            </Text>
          </View>
        </View>

      </ImageBackground>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    width:         '100%',
    borderRadius:  RADIUS,
    position:      'relative',
    shadowColor:   'rgba(0,0,0,0.65)',
    shadowOffset:  { width: 5, height: 12 },
    shadowOpacity: 1,
    shadowRadius:  16,
    elevation:     10,
  },

  card: {
    borderRadius:      RADIUS,
    paddingHorizontal: 18,
    paddingTop:        14,
    paddingBottom:     14,
    overflow:          'hidden',
    borderWidth:       1.5,
    // Bevel border 4 sisi: atas-kiri terang, bawah-kanan gelap — trik emboss
    // klasik, sama seperti cardInner di NutrisiBox.js.
    borderTopColor:    'rgba(255,255,255,0.10)',
    borderLeftColor:   'rgba(255,255,255,0.10)',
    borderRightColor:  'rgba(0,0,0,0.55)',
    borderBottomColor: 'rgba(0,0,0,0.55)',
  },
  cardImage: {
    borderRadius: RADIUS,
  },

  // Dumbbell besar floating di kanan
  dumbbellWrap: {
    position:  'absolute',
    right:     -8,
    top:       -6,
    bottom:    -6,
    width:     130,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dumbbellEmoji: {
    fontSize:  80,
    opacity:   0.90,
    transform: [{ rotate: '-15deg' }],
  },

  content: {
    // Biarkan konten di kiri, tidak sampai ke dumbbell
    paddingRight: 110,
  },

  // ── Badge "GOAL AKTIF" — pill kecil, flat, tanpa shadow tebal ──────
  badgeWrap: {
    alignSelf:        'flex-start',
    backgroundColor:  'rgba(255,255,255,0.12)',
    borderRadius:     999,
    paddingHorizontal: 10,
    paddingVertical:  4,
    borderWidth:      1,
    borderTopColor:   'rgba(255,255,255,0.18)',
    borderLeftColor:  'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(0,0,0,0.25)',
    borderBottomColor:'rgba(0,0,0,0.25)',
    marginBottom:     10,
  },
  goalActif: {
    fontSize:      9,
    fontWeight:    '800',
    color:         '#FFFFFF',
    letterSpacing: 1.2,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  12,
    gap:           6,
  },
  titleEmoji: {
    fontSize:   26,
    lineHeight: 30,
  },
  titleLabel: {
    fontSize:      28,
    fontWeight:    '900',
    color:         '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight:    32,
  },

  // ── Progress bar ──────────────────────────────
  barBg: {
    height:          10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius:    999,
    overflow:        'hidden',
    marginBottom:    10,
  },
  barFillWrap: {
    height:       '100%',
    borderRadius: 999,
    overflow:     'hidden',
  },
  barFill: {
    flex:         1,
    borderRadius: 999,
  },

  // ── Footer ────────────────────────────────────
  footerRow: {
    flexDirection:  'column',
    alignItems:     'flex-start',
    gap:            2,
  },
  pctRow: {
    fontSize: 15,
  },
  pctLabel: {
    fontWeight: '900',
    color:      ACCENT_GREEN,
    letterSpacing: -0.3,
  },
  pctSuffix: {
    fontWeight: '600',
    color:      '#FFFFFF',
  },
  targetLabel: {
    fontSize:   11.5,
    fontWeight: '500',
    color:      'rgba(255,255,255,0.55)',
  },
});