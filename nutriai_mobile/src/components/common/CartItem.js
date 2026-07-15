import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import { Colors, Radius } from '../../theme';

// ── Neumorphism tokens (harus sama dengan CartSection.js) ──
const NM_BASE  = '#ECF0F3';
const NM_LIGHT = '#FFFFFF';
const NM_DARK  = '#C8CDD5';

const nm = (elevation = 4, inset = false) => {
  const h = inset ? -elevation : elevation;
  return Platform.select({
    ios: {
      shadowColor:  NM_DARK,
      shadowOffset: { width: h, height: h },
      shadowOpacity: 0.9,
      shadowRadius: elevation * 1.5,
    },
    android: { elevation: inset ? 0 : elevation },
  });
};


export default function CartItem({ item, onRemove, onChangePorsi }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const total_kal  = Math.round((item.base_kalori  || item.kalori)  * item.porsi);
  const total_prot = Math.round((item.base_protein || item.protein) * item.porsi);

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  return (
    <Animated.View style={[styles.cartItem, nm(5), { transform: [{ scale: scaleAnim }] }]}>
      {/* Gambar makanan */}
      <Image
        source={item.image ? { uri: item.image } : null}
        style={styles.foodImage}
        resizeMode="cover"
      />

      {/* Info */}
      <View style={styles.infoCol}>
        <Text style={styles.cartName} numberOfLines={1}>{item.nama_makanan}</Text>
        <Text style={styles.cartMacro}>{total_prot}g protein · {total_kal} kcal</Text>

        {item.fromAI && (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>🤖 Estimasi AI</Text>
          </View>
        )}

        {/* Stepper neumorphism */}
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepBtn, nm(3)]}
            onPress={() => { bounce(); onChangePorsi(item._uid, Math.max(0.5, item.porsi - 0.5)); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepLabel}>−</Text>
          </TouchableOpacity>

          <View style={[styles.stepDisplay, nm(3, true)]}>
            <Text style={styles.stepValue}>{item.porsi}×</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepBtn, nm(3)]}
            onPress={() => { bounce(); onChangePorsi(item._uid, item.porsi + 0.5); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepLabel}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tombol hapus */}
      <TouchableOpacity
        style={[styles.removeBtn, nm(3)]}
        onPress={() => onRemove(item._uid)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NM_BASE,
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  foodImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: NM_DARK,
  },
  infoCol:   { flex: 1, gap: 2 },
  cartName:  { fontSize: 14, fontWeight: '700', color: Colors.text || '#2D3A4A' },
  cartMacro: { fontSize: 11, color: Colors.textMuted || '#7A8A9A' },

  aiTag: {
    backgroundColor: Colors.purpleLight || '#EDE9FE',
    borderRadius: Radius.sm || 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 2,
  },
  aiTagText: { fontSize: 10, color: Colors.purple || '#7C3AED', fontWeight: '700' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary || '#5A8DF5', lineHeight: 18 },
  stepDisplay: {
    width: 40, height: 28, borderRadius: 8,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { fontSize: 13, fontWeight: '700', color: Colors.text || '#2D3A4A' },

  removeBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: NM_BASE,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 12, color: '#E06060', fontWeight: '700' },
});