import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';

/**
 * Card
 * @param {string} variant - 'default' | 'elevated' | 'outlined' | 'tinted'
 * @param {string} accent  - left-border color (optional)
 */
export default function Card({ children, style, variant = 'default', accent }) {
  return (
    <View style={[styles.base, styles[variant], accent && { borderLeftColor: accent, borderLeftWidth: 4 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 14,
  },
  default:  { ...Shadow.sm },
  elevated: { ...Shadow.md },
  outlined: { borderWidth: 1, borderColor: Colors.border },
  tinted:   { backgroundColor: Colors.surfaceAlt },
});
