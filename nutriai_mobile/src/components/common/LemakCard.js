import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LemakImg from '../../../assets/lemak.png';

const TXT   = '#081229';
const TXT_S = '#64748B';
const TXT_M = '#94A3B8';
const PURPLE = '#818CF8';
const SHD_W  = 'rgba(15,23,42,0.08)';

export default function LemakCard({ current = 0, target = 65, style }) {
  const pct = Math.min(current / Math.max(target, 1), 1);

  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct, duration: 900,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[st.nutriCard, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(238,242,255,0.90)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={st.nutriCardInner}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={st.nutriIconWrap}>
            <Image source={LemakImg} style={st.nutriIconImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.nutriLabel}>Lemak</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={st.nutriCur}>{current}g</Text>
              <Text style={st.nutriTgt}> / {target}g</Text>
            </View>
          </View>
          <Text style={[st.nutriPct, { color: '#F59E0B' }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>

        <View style={st.nutriBarBg}>
          <Animated.View style={{ overflow: 'hidden', borderRadius: 999, flex: 1 }}>
            <Animated.View
              style={[
                st.nutriBarFill,
                { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            >
              <LinearGradient
                colors={['#FCD34D', '#F59E0B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 999 }}
              />
            </Animated.View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  nutriCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: SHD_W,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  nutriCardInner: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },
  nutriIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  nutriIcon:    { fontSize: 26, lineHeight: 30 },
  nutriIconImg: { width: 28, height: 28 },
  nutriLabel:   { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  nutriCur:     { fontSize: 18, fontWeight: '900', color: '#081229', letterSpacing: -0.5 },
  nutriTgt:     { fontSize: 13, color: '#94A3B8', fontWeight: '400' },
  nutriPct:     { fontSize: 13, fontWeight: '800', alignSelf: 'flex-start', marginTop: 4 },
  nutriBarBg: {
    height: 9, backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 999, marginTop: 10, overflow: 'hidden',
  },
  nutriBarFill: { height: 9, borderRadius: 999 },
});