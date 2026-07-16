/**
 * GreetCard.js
 * Greeting card — sekarang dibungkus box (sebelumnya "no outer box"), tema
 * dark 3D disamakan persis resep NutrisiBox.js / GoalCard.js:
 *  1. Outer ambient shadow diagonal → wrapper
 *  2. DepthStack (4 layer identik bentuk card)
 *  3. Base gradient super dark
 *  4. ShadowOverlay diagonal
 *  5. Texture noise dots
 *  6. Bevel border 4 sisi
 *  7. Konten: icon pill (cream/gold, bevel sendiri) + teks (nama = accent
 *     hijau bold flat, tanpa shadow — sesuai preferensi terakhir)
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const RADIUS = 15;

// Overlay dasar super dark — sama persis palet NutrisiBox.js/GoalCard.js
// biar semua card di dashboard senada.
const CARD_BG_TOP    = '#0B120D';
const CARD_BG_MID    = '#060A07';
const CARD_BG_BOTTOM = '#020403';
const CARD_BORDER_TL = 'rgba(255,255,255,0.10)';
const CARD_BORDER_BR = 'rgba(0,0,0,0.55)';

const ACCENT_GREEN = '#22E070';

// ── DepthStack ───────────────────────────────────────────────────────
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
function ShadowOverlay({ opacity = 0.28 }) {
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
const NOISE_DOTS = Array.from({ length: 40 }).map(() => ({
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

export default function GreetCard({ username }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[st.wrapper, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {/* Layer 1-2: depth stack */}
      <DepthStack />

      {/* Layer 3: base gradient super dark */}
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
        {/* Layer 4-5: shadow overlay + texture noise */}
        <ShadowOverlay />
        <Texture />

        {/* Layer 6+: konten */}
        <View style={st.row}>
          {/* Icon pill — cream/gold, bevel sendiri */}
          <View style={st.iconPill}>
            <Text style={st.iconEmoji}>👋</Text>
          </View>

          {/* Text block */}
          <View style={st.textBlock}>
            <Text style={st.name} numberOfLines={1}>
              Halo, <Text style={st.nameBold}>{username}!</Text>
            </Text>
            <Text style={st.sub} numberOfLines={1}>Semangat hari ini!</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: RADIUS,
    position: 'relative',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 6,
  },
  cardInner: {
    borderRadius: RADIUS,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  // ── Icon pill: cream/gold gradient + bevel sendiri ──────────────────
  iconPill: {
    width: 33,
    height: 33,
    borderRadius: 10.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#F6D999',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.55)',
    borderLeftColor: 'rgba(255,255,255,0.55)',
    borderRightColor: 'rgba(120,80,10,0.30)',
    borderBottomColor: 'rgba(120,80,10,0.30)',
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconEmoji: { fontSize: 15, lineHeight: 18 },

  textBlock: { flexShrink: 1, flexGrow: 1, gap: 1 },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: -0.15,
    lineHeight: 16,
  },
  nameBold: {
    fontWeight: '900',
    color: ACCENT_GREEN,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 11,
  },
});