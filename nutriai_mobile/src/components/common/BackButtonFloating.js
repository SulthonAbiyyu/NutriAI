/**
 * BackButtonFloating.js
 * Tombol back mengambang, gaya 3D — dipakai di halaman yang tab bar-nya
 * disembunyikan (jadi user butuh cara balik ke Dashboard).
 * Ditaruh sendirian di pojok kiri bawah (mirror dari FabMenu di kanan bawah).
 *
 * Resep 3D-nya sama persis kayak QuickAccessGrid.Tile:
 *  1. DepthStack (4 layer, geser kanan-bawah, makin transparan) → shadow palsu
 *  2. Base gradient (terang kiri-atas → gelap kanan-bawah)
 *  3. ShadowOverlay → gradient diagonal transparan→hitam
 *  4. Texture (noise dots svg) → biar nggak flat vector
 *  5. Bevel border (atas-kiri terang, bawah-kanan gelap) → emboss
 *  6. Animated scale saat pressIn/pressOut → efek "ketekan" fisik
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const NOISE_DOTS = Array.from({ length: 26 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.4 + Math.random() * 0.6,
  o: 0.04 + Math.random() * 0.06,
  dark: Math.random() > 0.55,
}));

function Texture() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width="100%" height="100%">
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
        />
      ))}
    </Svg>
  );
}

function ShadowOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.30)']}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const DEPTH_LAYERS = [
  { dx: 1,   dy: 1.5, color: 'rgba(0,0,0,0.55)' },
  { dx: 2,   dy: 3,   color: 'rgba(0,0,0,0.40)' },
  { dx: 3.2, dy: 4.5, color: 'rgba(0,0,0,0.26)' },
  { dx: 4.5, dy: 6,   color: 'rgba(0,0,0,0.15)' },
];

function DepthStack({ size }) {
  return (
    <>
      {DEPTH_LAYERS.map((l, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: size / 2,
              backgroundColor: l.color,
              transform: [{ translateX: l.dx }, { translateY: l.dy }],
            },
          ]}
        />
      ))}
    </>
  );
}

export default function BackButtonFloating({
  onPress,
  size   = 58,
  bottom = 0,
  left   = 20,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  // Efek "ketekan": mengecil + sedikit lebih gelap pas jari nempel,
  // balik lagi pas dilepas — kayak tombol fisik beneran ketekan.
  const pressIn  = () => Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 18, bounciness: 9 }).start();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, bottom, left, transform: [{ scale }] },
      ]}
    >
      <DepthStack size={size} />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel="Kembali ke Dashboard"
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['#4ADE80', '#15803D']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            styles.inner,
            {
              borderRadius: size / 2,
              borderTopColor:    'rgba(255,255,255,0.45)',
              borderLeftColor:   'rgba(255,255,255,0.45)',
              borderRightColor:  'rgba(0,0,0,0.30)',
              borderBottomColor: 'rgba(0,0,0,0.40)',
            },
          ]}
        >
          <ShadowOverlay />
          <Texture />
          <Ionicons name="arrow-undo" size={size * 0.46} color="#FFFFFF" style={{ marginLeft: -1 }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 999,       // paling atas konten (JS-side stacking)
    elevation: 20,      // paling atas di Android
    shadowColor: 'rgba(21,128,61,0.45)',
    shadowOffset: { width: 4, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  inner: {
    flex: 1,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});