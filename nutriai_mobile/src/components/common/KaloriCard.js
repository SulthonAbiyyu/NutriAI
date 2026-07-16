import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLG, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import KaloriImg from '../../../assets/air.png';

const TXT   = '#081229';
const TXT_S = '#64748B';
const TXT_M = '#94A3B8';
const AMBER = '#F59E0B';

function buildPath({ width, height, inset = 0 }) {
  const r      = Math.max(20 - inset, 8);
  const cx     = width / 2;
  const stepH  = 20 - inset;
  const tcr    = 20;
  const rightY = 10 + inset;
  const left   = inset;
  const right  = width - inset;
  const bottom = height - inset;

  // Notch bezier: start = cx-tcr-12, end = cx+22
  // Untuk slope atas = slope bawah, pakai S-curve simetris:
  // CP1 = start + (end-start)*t secara diagonal, CP2 = end - (end-start)*t
  // t=0.35 memberi kurva yang smooth dan simetris
  const nsx = cx - tcr - 12;  // notch start x
  const nex = cx + 22;         // notch end x
  const nsy = -stepH;          // notch start y
  const ney = rightY;          // notch end y
  const t   = 0.38;
  const cp1x = nsx + (nex - nsx) * t;
  const cp1y = nsy + (ney - nsy) * t;
  const cp2x = nex - (nex - nsx) * t;
  const cp2y = ney - (ney - nsy) * t;

  return [
    `M ${left + r},${-stepH}`,
    `L ${nsx},${nsy}`,
    `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${nex},${ney}`,
    `L ${right - r},${rightY}`,
    `Q ${right},${rightY} ${right},${rightY + r}`,
    `L ${right},${bottom - r}`,
    `Q ${right},${bottom} ${right - r},${bottom}`,
    `L ${left + r},${bottom}`,
    `Q ${left},${bottom} ${left},${bottom - r}`,
    `L ${left},${left + r - stepH}`,
    `Q ${left},${-stepH} ${left + r},${-stepH} Z`,
  ].join(' ');
}

function CardShape({ width, height, strokeColor }) {
  const stepH = 20;
  const d = buildPath({ width, height, inset: 0 });

  return (
    <Svg
      width={width}
      height={height + stepH}
      viewBox={`0 ${-stepH} ${width} ${height + stepH}`}
      style={[StyleSheet.absoluteFill, { top: -stepH }]}
    >
      <Defs>
        <SvgLG id="kalGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"  stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#FFFFFF" />
        </SvgLG>
      </Defs>
      <Path d={d} fill="url(#kalGrad)" />
      <Path d={d} fill="none" stroke={strokeColor} strokeWidth={1} />
    </Svg>
  );
}

function CardShapeRing({ width, height, startInset }) {
  const stepH = 20;
  const d = buildPath({ width, height, inset: startInset });

  // Fade horizontal: 0-50% flat, 50-100% smooth ke 0
  const stops = [
    { offset: '0%',   opacity: 0.025 },
    { offset: '10%',  opacity: 0.025 },
    { offset: '25%',  opacity: 0.025 },
    { offset: '40%',  opacity: 0.025 },
    { offset: '50%',  opacity: 0.025 },
    { offset: '57%',  opacity: 0.021 },
    { offset: '63%',  opacity: 0.017 },
    { offset: '69%',  opacity: 0.013 },
    { offset: '75%',  opacity: 0.009 },
    { offset: '81%',  opacity: 0.006 },
    { offset: '87%',  opacity: 0.003 },
    { offset: '93%',  opacity: 0.001 },
    { offset: '100%', opacity: 0     },
  ];

  return (
    <Svg
      width={width}
      height={height + stepH}
      viewBox={`0 ${-stepH} ${width} ${height + stepH}`}
      style={[StyleSheet.absoluteFill, { top: -stepH }, { zIndex: 1 }]}
    >
      <Defs>
        {/* Horizontal fade fill */}
        <SvgLG id="ringFade" x1="0" y1="0" x2="1" y2="0">
          {stops.map((s, i) => (
            <Stop key={i} offset={s.offset} stopColor="#7C3AED" stopOpacity={s.opacity} />
          ))}
        </SvgLG>
        {/* Radial glow di 30% horizontal, tengah vertikal */}
        <RadialGradient
          id="circleGlow"
          cx={width * 0.0}
          cy={height / 2}
          r={width * 0.50}
          fx={width * 0.0}
          fy={height / 2}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%"   stopColor="#E9D5FF" stopOpacity={0.12} />
          <Stop offset="45%"  stopColor="#C084FC" stopOpacity={0.06} />
          <Stop offset="100%" stopColor="#A855F7" stopOpacity={0}    />
        </RadialGradient>
      </Defs>

      {/* Fill ungu samar fade kanan */}
      <Path d={d} fill="url(#ringFade)" />

      {/* Circle light ungu di 30% */}
      <Path d={d} fill="url(#circleGlow)" />
    </Svg>
  );
}

export default function KaloriCard({ current = 0, target = 2000, style }) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct, duration: 900,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct]);

  const STEP_H = 4;
  const INSET  = 6;

  return (
    <View style={[{ marginTop: STEP_H, marginBottom: 12 }, style]}>
      <View
        style={st.nutriCard}
        onLayout={e =>
          setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
      >
        {/* Layer 1: box utama — fill putih, paling belakang */}
        {size.width > 0 && (
          <CardShape
            width={size.width}
            height={size.height}
            strokeColor="rgba(255,255,255,0.70)"
          />
        )}

        {/* Layer 2: icon air absolute — di belakang ring shadow, posisi sama dengan icon wrap */}
        {size.width > 0 && (
          <View style={[st.nutriIconAbsolute, { top: (size.height - 20 - 44) / 2 }]}>
            <Image source={KaloriImg} style={st.nutriIconImg} resizeMode="contain" />
          </View>
        )}

        {/* Layer 3: ring shadow ungu — di atas icon */}
        {size.width > 0 && (
          <CardShapeRing
            width={size.width}
            height={size.height}
            startInset={INSET}
          />
        )}

        {/* Layer 4: konten — paling depan, zIndex 2 */}
        <View style={[st.nutriCardInner, { zIndex: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>

            {/* Kolom kiri — placeholder transparan agar layout tetap sama */}
            <View style={{ width: 44, height: 44 }} />

            {/* Kolom kanan — label, nilai, bar, persen */}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.nutriLabel}>Kalori</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={st.nutriCur}>{current} kcal</Text>
                    <Text style={st.nutriTgt}> / {target} kcal</Text>
                  </View>
                </View>
                <Text style={[st.nutriPct, { color: '#818CF8', marginLeft: 8 }]}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>

              {/* Bar progress */}
              <View style={st.nutriBarBg}>
                <Animated.View style={{ overflow: 'hidden', borderRadius: 999, flex: 1 }}>
                  <Animated.View
                    style={[
                      st.nutriBarFill,
                      { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                    ]}
                  >
                    <LinearGradient
                      colors={['#A5B4FC', '#6366F1']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ flex: 1, borderRadius: 999 }}
                    />
                  </Animated.View>
                </Animated.View>
              </View>
            </View>

          </View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  nutriCard: {
    shadowColor: 'rgba(15,23,42,0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
    marginBottom: 0,
  },
  nutriCardInner: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 12,
  },
  nutriIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  nutriIconAbsolute: {
    position: 'absolute',
    left: 14,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 0,
  },
  nutriIconImg: { width: 34, height: 34 },
  nutriLabel:   { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  nutriCur:     { fontSize: 20, fontWeight: '900', color: '#081229', letterSpacing: -0.5 },
  nutriTgt:     { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
  nutriPct:     { fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginTop: 0 },
  nutriBarBg: {
    height: 9, backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 999, marginTop: 6, overflow: 'hidden',
  },
  nutriBarFill: { height: 9, borderRadius: 999 },
});