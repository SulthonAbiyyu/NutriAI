import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme';

/**
 * Badge
 * @param {string} label
 * @param {string} color  - text color
 * @param {string} bg     - background color
 */
export default function Badge({ label, color = Colors.primary, bg = Colors.primaryLight, style }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
