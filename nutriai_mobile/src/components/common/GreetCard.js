/**
 * GreetCard.js
 * Greeting row compact — no outer box, horizontal, 2 baris.
 * Tidak pakai fixed width — flex shrink agar BmiCard muat di ROW 1.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';

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
    <Animated.View style={[st.row, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {/* Icon pill */}
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
    </Animated.View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    marginTop: 6,
    flexShrink: 0,
    flexGrow: 1,
    alignSelf: 'stretch',
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(251,191,36,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 17, lineHeight: 20 },
  textBlock:  { flexShrink: 1, flexGrow: 1, gap: 1 },
  name: {
    fontSize: 17,
    fontWeight: '400',
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  nameBold: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 14,
  },
});