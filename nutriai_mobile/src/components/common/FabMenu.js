import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../theme';

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

      {/* Main FAB */}
      <View style={[styles.fabWrap, { bottom: bottomOffset }]}>
        <TouchableOpacity onPress={toggleFab} activeOpacity={0.85} style={styles.fabTouchable}>
          <BlurView intensity={30} tint="light" style={styles.fabGlass}>
            <Animated.Text style={[styles.fabIcon, {
              transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
            }]}>+</Animated.Text>
          </BlurView>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 90 },

  fabWrap: {
    position: 'absolute', right: 20, zIndex: 100,
    width: 58, height: 58, borderRadius: 29,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
    borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.45)',
    backgroundColor: Colors.primary,
  },
  fabTouchable: { flex: 1 },
  fabGlass: {
    flex: 1, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent', overflow: 'hidden',
  },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '200', lineHeight: 36, includeFontPadding: false },

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