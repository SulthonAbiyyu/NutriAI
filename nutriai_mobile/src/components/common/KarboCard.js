import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLG, RadialGradient, Stop, Line, G } from 'react-native-svg';
import DaunImg from '../../../assets/daun.png';

const GREEN = '#22C55E';
const TXT   = '#081229';
const TXT_S = '#64748B';
const TXT_M = '#94A3B8';
const WHITE = '#FFFFFF';

export default function KarboCard({ current = 0, target = 300, size = 220 }) {
  const SZ = size * 0.84;
  const CX = SZ / 2;
  const CY = SZ / 2;

  const RING_STK   = SZ * 0.018;
  const RING_R     = SZ / 2 - RING_STK / 2 - 6;
  const INNER_EDGE = RING_R - RING_STK / 2;
  const PLATE_R    = INNER_EDGE;

  const PROG_STK = SZ * 0.098;
  const PROG_R   = RING_R + RING_STK / 2 + PROG_STK / 2;

  const WHITE_GAP = PROG_STK * 0.25;
  const WHITE_STK = PROG_STK * 0.30;
  const WHITE_R   = PROG_R + PROG_STK / 2 + WHITE_GAP + WHITE_STK / 2;

  const MID_STK = PROG_STK * 0.65;
  const MID_R   = PROG_R + PROG_STK / 2 + WHITE_GAP / 2;

  const CIR = 2 * Math.PI * PROG_R;
  const pct = Math.min(current / Math.max(target, 1), 1);

  const anim = useRef(new Animated.Value(0)).current;
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setAnimPct(value));
    Animated.timing(anim, {
      toValue: pct, duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [pct]);

  const MIN_DASH  = CIR * 0.03;                          // stub minimal di jam 12
  const dashLen   = animPct > 0.01 ? CIR * animPct : MIN_DASH;
  const knobAngle = -Math.PI / 2 + animPct * 2 * Math.PI;
  const knobX     = CX + PROG_R * Math.cos(knobAngle);
  const knobY     = CY + PROG_R * Math.sin(knobAngle);
  const KNOB_R    = PROG_STK / 2 - 1;

  const CONTENT_MARGIN = WHITE_R + WHITE_STK / 2 + 2;
  const SVG_SZ = CONTENT_MARGIN * 2;
  const OFF    = SVG_SZ / 2 - CX;
  const ACX    = OFF + CX;
  const ACY    = OFF + CY;

  const PCT_DIST  = KNOB_R + 18;
  const pctLabelX = knobX + OFF + PCT_DIST * Math.cos(knobAngle);
  const pctLabelY = knobY + OFF + PCT_DIST * Math.sin(knobAngle);

  const buildVeins = () => {
    if (animPct < 0.04) return [];
    const veins = [];
    const COUNT      = Math.floor(animPct * 22);
    const ARROW_LEN  = PROG_STK * 0.42;
    const ARROW_OPEN = 0.55;
    for (let i = 1; i <= COUNT; i++) {
      const t        = i / (COUNT + 1);
      const arcAngle = -Math.PI / 2 + t * animPct * 2 * Math.PI;
      const tangent  = arcAngle + Math.PI / 2;
      const tipX = ACX + PROG_R * Math.cos(arcAngle) + (ARROW_LEN * 0.4) * Math.cos(tangent);
      const tipY = ACY + PROG_R * Math.sin(arcAngle) + (ARROW_LEN * 0.4) * Math.sin(tangent);
      const backAngle  = tangent + Math.PI;
      const outerAngle = backAngle - ARROW_OPEN;
      const innerAngle = backAngle + ARROW_OPEN;
      const ox = tipX + ARROW_LEN * Math.cos(outerAngle);
      const oy = tipY + ARROW_LEN * Math.sin(outerAngle);
      const ix = tipX + ARROW_LEN * Math.cos(innerAngle);
      const iy = tipY + ARROW_LEN * Math.sin(innerAngle);
      veins.push({ tipX, tipY, ox, oy, ix, iy });
    }
    return veins;
  };

  const veins = buildVeins();

  return (
    <View style={{ width: SVG_SZ, height: SVG_SZ, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SVG_SZ} height={SVG_SZ} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLG id="progGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#16A34A" stopOpacity="1" />
            <Stop offset="50%"  stopColor="#15803D" stopOpacity="1" />
            <Stop offset="100%" stopColor="#14532D" stopOpacity="1" />
          </SvgLG>
          <RadialGradient id="plateSurface" cx="38%" cy="28%" r="72%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1"    />
            <Stop offset="60%"  stopColor="#F4FDF7" stopOpacity="0.98" />
            <Stop offset="100%" stopColor="#E8F9EE" stopOpacity="0.96" />
          </RadialGradient>
          <RadialGradient id="innerShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#000000" stopOpacity="0"    />
            <Stop offset="93%"  stopColor="#000000" stopOpacity="0"    />
            <Stop offset="97%"  stopColor="#000000" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </RadialGradient>
        </Defs>

        {/* WHITE OUTER RING */}
        <Circle cx={ACX} cy={ACY} r={WHITE_R} fill="none" stroke="#FFFFFF" strokeWidth={WHITE_STK} />

        {/* MIDDLE RING — 12 layer rapat untuk fade benar-benar smooth */}
        {[
          { o: 0.14, rOff: 0.00, w: 0.08 },
          { o: 0.11, rOff: 0.08, w: 0.09 },
          { o: 0.09, rOff: 0.16, w: 0.10 },
          { o: 0.07, rOff: 0.24, w: 0.10 },
          { o: 0.055,rOff: 0.32, w: 0.11 },
          { o: 0.042,rOff: 0.40, w: 0.11 },
          { o: 0.030,rOff: 0.48, w: 0.12 },
          { o: 0.020,rOff: 0.56, w: 0.12 },
          { o: 0.013,rOff: 0.64, w: 0.13 },
          { o: 0.008,rOff: 0.72, w: 0.13 },
          { o: 0.004,rOff: 0.80, w: 0.14 },
          { o: 0.002,rOff: 0.88, w: 0.14 },
        ].map((l, i) => (
          <Circle key={i}
            cx={ACX} cy={ACY}
            r={MID_R + MID_STK * l.rOff}
            fill="none"
            stroke="#000000"
            strokeOpacity={l.o}
            strokeWidth={MID_STK * l.w}
          />
        ))}

        {/* PLATE */}
        <Circle cx={ACX} cy={ACY} r={PLATE_R} fill="url(#plateSurface)" />

        {/* RING HIJAU */}
        <Circle cx={ACX} cy={ACY} r={RING_R} fill="none" stroke="#16A34A" strokeWidth={RING_STK} />

        {/* INNER SHADOW */}
        <Circle cx={ACX} cy={ACY} r={INNER_EDGE} fill="url(#innerShadow)" />

        {/* PROGRESS ARC — selalu tampil, minimal stub di jam 12 saat 0% */}
        <>
          <Circle
            cx={ACX} cy={ACY} r={PROG_R}
            stroke="url(#progGrad)" strokeWidth={PROG_STK} fill="none"
            strokeDasharray={`${dashLen} ${CIR - dashLen}`}
            strokeDashoffset={CIR * 0.25} strokeLinecap="round"
          />
          <Circle
            cx={ACX} cy={ACY} r={PROG_R}
            stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth={PROG_STK * 0.10} fill="none"
            strokeDasharray={`${dashLen} ${CIR - dashLen}`}
            strokeDashoffset={CIR * 0.25} strokeLinecap="round"
          />
          {veins.map((v, i) => (
            <G key={i} opacity={0.60}>
              <Line x1={v.tipX} y1={v.tipY} x2={v.ox} y2={v.oy}
                stroke="#FFFFFF" strokeWidth={PROG_STK * 0.06} strokeLinecap="round" />
              <Line x1={v.tipX} y1={v.tipY} x2={v.ix} y2={v.iy}
                stroke="#FFFFFF" strokeWidth={PROG_STK * 0.06} strokeLinecap="round" />
            </G>
          ))}
        </>
      </Svg>

      {true && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
          <Image
            source={DaunImg}
            style={{
              position: 'absolute',
              width: KNOB_R * 5,
              height: KNOB_R * 5,
              left: knobX + OFF - KNOB_R * 4.5 + (animPct < 0.005 ? 35 : 18),
              top:  knobY + OFF - KNOB_R * 4.5 + (animPct < 0.005 ? 6 : 10),
              resizeMode: 'contain',
            }}
          />
        </View>
      )}

      <View style={styles.center}>
        <Text style={styles.label}>Karbo Hari Ini</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.number}>{current.toLocaleString('id-ID')}</Text>
          <Text style={[styles.targetTxt, { position: 'absolute', right: -30, bottom: 4 }]}>/{target.toLocaleString('id-ID')}g</Text>
        </View>
        <View style={styles.glassBadge}>
          <View style={styles.glassInner}>
            <Text style={styles.pctLabel}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  label: { fontSize: 8, color: TXT_S, fontWeight: '500', letterSpacing: 0.8, marginBottom: 6 },
  number: { fontSize: 32, fontWeight: '800', color: TXT, letterSpacing: -1, lineHeight: 36 },
  targetTxt: { fontSize: 9, fontWeight: '500', color: TXT_M, letterSpacing: 0.1 },
  glassBadge: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  glassInner: {
    paddingHorizontal: 10,
    paddingTop: 3,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(220, 252, 231, 0.45)',
  },
  pctLabel: { fontSize: 11, fontWeight: '700', color: '#15803D', letterSpacing: 0.8 },
});