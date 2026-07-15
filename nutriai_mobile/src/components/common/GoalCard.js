/**
 * GoalCard.js
 * Style: Purple gradient card — ref image persis
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
const BG_BOX = require('../../../assets/bgbox.jpg');

const { width: SW } = Dimensions.get('window');
const PAD = 16;

const GOAL_CONFIG = {
  bulking: {
    label:        'Bulking',
    emoji:        '💪',
    dumbbell:     '🏋️',
    cardColors:   ['#8B7FE8', '#7C6FE0', '#6B5FD0'],
    glowColor:    'rgba(108,92,231,0.45)',
    overlayColor: 'rgba(60,40,140,0.55)',
    barFill:      ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)'],
  },
  cutting: {
    label:        'Cutting',
    emoji:        '🔥',
    dumbbell:     '⚡',
    cardColors:   ['#F87171', '#EF4444', '#DC2626'],
    glowColor:    'rgba(239,68,68,0.45)',
    overlayColor: 'rgba(140,30,30,0.55)',
    barFill:      ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)'],
  },
  maintain: {
    label:        'Maintain',
    emoji:        '⚖️',
    dumbbell:     '🌿',
    cardColors:   ['#34D399', '#10B981', '#059669'],
    glowColor:    'rgba(16,185,129,0.45)',
    overlayColor: 'rgba(5,80,50,0.55)',
    barFill:      ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)'],
  },
};

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
    <View style={[st.wrapper, { shadowColor: config.glowColor }, style]}>
      <ImageBackground
        source={BG_BOX}
        style={st.card}
        imageStyle={st.cardImage}
        resizeMode="cover"
      >
        {/* ── Dark overlay supaya teks tetap terbaca ── */}
        <View style={[st.darkOverlay, { backgroundColor: config.overlayColor }]} />

        {/* ── Highlight overlay terang di atas-kiri ── */}
        <View style={st.highlightOverlay} />

        {/* ── Dumbbell floating kanan ── */}
        <View style={st.dumbbellWrap} pointerEvents="none">
          <Text style={st.dumbbellEmoji}>{config.dumbbell}</Text>
        </View>

        {/* ── Konten kiri ── */}
        <View style={st.content}>
          {/* GOAL AKTIF label */}
          <Text style={st.goalActif}>GOAL AKTIF</Text>

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
                colors={config.barFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.barFill}
              />
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={st.footerRow}>
            <Text style={st.pctLabel}>{pctLabel}% selesai</Text>
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
    borderRadius:  22,
    // Glow shadow ungu di bawah
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius:  24,
    elevation:     12,
  },

  card: {
    borderRadius:      22,
    paddingHorizontal: 18,
    paddingTop:        14,
    paddingBottom:     14,
    overflow:          'hidden',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.25)',
  },
  cardImage: {
    borderRadius: 22,
  },

  // Overlay warna per-goal supaya teks tetap kontras
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },

  // Efek cahaya glossy di pojok kiri atas
  highlightOverlay: {
    position:      'absolute',
    top:           0,
    left:          0,
    right:         '30%',
    height:        '55%',
    borderTopLeftRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
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

  goalActif: {
    fontSize:      9,
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.70)',
    letterSpacing: 1.4,
    marginBottom:  6,
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
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius:    999,
    overflow:        'hidden',
    marginBottom:    8,
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
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  pctLabel: {
    fontSize:   11,
    fontWeight: '700',
    color:      'rgba(255,255,255,0.85)',
  },
  targetLabel: {
    fontSize:   10,
    fontWeight: '500',
    color:      'rgba(255,255,255,0.65)',
  },
});