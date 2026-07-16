import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme';

// ── PlusIcon3D ───────────────────────────────────────────────────────
// Ikon "+" itu sendiri yang dibikin timbul/3D (bukan icon tipis di dalam
// kotak/lingkaran). Triknya: "+" dirender sebagai 2 batang tebal
// (horizontal + vertical), lalu batang itu ditumpuk beberapa kali —
// makin jauh ke kanan-bawah, makin gelap/pudar — persis prinsip
// "faux 3D lettering" yang dipakai Title3D di QuickAccessGrid, cuma di
// sini bentuknya bar bukan teks. Lapis paling atas dikasih gradient
// terang→gelap + highlight tipis di tepi atas biar kerasa mengkilap.
const PLUS_EXTRUDE = [
  { dx: 4,   dy: 5,   color: 'rgba(20,83,45,0.85)' },  // paling jauh, paling pudar
  { dx: 2.7, dy: 3.3, color: 'rgba(21,101,54,0.9)' },
  { dx: 1.4, dy: 1.8, color: 'rgba(22,120,64,0.95)' }, // paling dekat, paling tajam (seam)
];

// Warna Main FAB — hijau, senada sama identitas app & tombol back.
const PLUS_TOP_COLORS = ['#4ADE80', '#15803D'];
const FAB_SIZE = 58;

function PlusBar({ style }) {
  return (
    <View style={[styles.plusBarBase, style]}>
      <LinearGradient
        colors={PLUS_TOP_COLORS}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* highlight tipis di tepi atas biar kerasa mengkilap/timbul */}
      <View style={styles.plusBarHighlight} />
    </View>
  );
}

function PlusIcon3D({ size = FAB_SIZE }) {
  const thickness = Math.round(size * 0.34);
  const radius    = thickness / 2;

  return (
    <View style={{ width: size, height: size }}>
      {PLUS_EXTRUDE.map((l, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', top: l.dy, left: l.dx, width: size, height: size }}
        >
          <View style={{
            position: 'absolute', top: (size - thickness) / 2, left: 0,
            width: size, height: thickness, borderRadius: radius,
            backgroundColor: l.color,
          }} />
          <View style={{
            position: 'absolute', left: (size - thickness) / 2, top: 0,
            width: thickness, height: size, borderRadius: radius,
            backgroundColor: l.color,
          }} />
        </View>
      ))}

      {/* Lapis paling atas — gradient + highlight, ini yang keliatan "hidup" */}
      <PlusBar style={{
        top: (size - thickness) / 2, left: 0, width: size, height: thickness, borderRadius: radius,
      }} />
      <PlusBar style={{
        left: (size - thickness) / 2, top: 0, width: thickness, height: size, borderRadius: radius,
      }} />
    </View>
  );
}

const FAB_ITEMS = [
  {
    key: 'scan',
    label: 'Scan Barcode',
    emoji: '▦',
    color: '#3B82F6',
    offset: 4,
  },
  {
    key: 'ai',
    label: 'Analisis AI',
    emoji: '✦',
    color: '#A855F7',
    offset: 3,
  },
  {
    key: 'templates',
    label: 'Meal Templates',
    emoji: '☰',
    color: '#F59E0B',
    offset: 2,
  },
  {
    key: 'data',
    label: 'Tambah Data',
    emoji: '+',
    color: Colors.primary,
    offset: 1,
  },
];

export default function FabMenu({ bottomOffset = 100, onScan, onAI, onTambahData, onMealTemplates }) {
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 18, bounciness: 9 }).start();

  const toggleFab = () => {
    const toVal = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);
    Animated.spring(fabAnim, { toValue: toVal, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };

  const ACTIONS = { scan: onScan, ai: onAI, templates: onMealTemplates, data: onTambahData };

  const handleItemPress = (key) => {
    toggleFab();
    ACTIONS[key]?.();
  };

  return (
    <>
      {/* Backdrop */}
      {fabOpen && (
        <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={toggleFab} />
      )}

      {/* FAB Menu Items */}
      {FAB_ITEMS.map((item) => {
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(item.offset * 66)],
        });
        const opacity = fabAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
        const scale   = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

        return (
          <Animated.View
            key={item.key}
            style={[styles.fabItem, {
              bottom: bottomOffset,
              transform: [{ translateY }, { scale }],
              opacity,
            }]}
            pointerEvents={fabOpen ? 'auto' : 'none'}
          >
            <TouchableOpacity style={styles.fabItemLabel} onPress={() => handleItemPress(item.key)} activeOpacity={0.85}>
              <BlurView intensity={70} tint="light" style={styles.fabLabelBlur}>
                <Text style={styles.fabItemLabelText}>{item.label}</Text>
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { borderColor: item.color + '55' }]}
              onPress={() => handleItemPress(item.key)}
              activeOpacity={0.8}
            >
              <BlurView intensity={80} tint="light" style={styles.fabMiniBlur}>
                <Text style={[styles.fabMiniIcon, { color: item.color }]}>{item.emoji}</Text>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB — langsung "+" 3D, tanpa circle box di belakangnya */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            bottom: bottomOffset,
            transform: [
              { scale: pressScale },
              { rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleFab}
          onPressIn={pressIn}
          onPressOut={pressOut}
          activeOpacity={0.85}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.fabTouchable}
        >
          <PlusIcon3D size={FAB_SIZE} />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fabBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 90 },

  fabWrap: {
    position: 'absolute', right: 20, zIndex: 100,
    width: FAB_SIZE, height: FAB_SIZE,
  },
  fabTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  plusBarBase: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: 'rgba(21,101,54,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 3, elevation: 4,
  },
  plusBarHighlight: {
    position: 'absolute', top: 0, left: '12%', right: '12%', height: '35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  fabItem: { position: 'absolute', right: 20, zIndex: 95, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fabItemLabel: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  fabLabelBlur:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  fabItemLabelText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  fabMini: {
    width: 48, height: 48, borderRadius: 24,
    overflow: 'hidden', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  fabMiniBlur: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  fabMiniIcon: { fontSize: 20, fontWeight: '800' },
});