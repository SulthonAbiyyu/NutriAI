import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';

/**
 * Input
 * @param {string} label
 * @param {string} error
 * @param {string} hint
 */
export default function Input({ label, error, hint, style, containerStyle, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error  && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur ={() => setFocused(false)}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {hint  && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError:   { borderColor: Colors.danger },
  error: { fontSize: 12, color: Colors.danger, marginTop: 4, fontWeight: '500' },
  hint:  { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
