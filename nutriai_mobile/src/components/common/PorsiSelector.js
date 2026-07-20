import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../../theme";

export default function PorsiSelector({ value, onChange }) {
  return (
    <View style={styles.porsiRow}>
      <TouchableOpacity
        style={styles.porsiBtn}
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        <Text style={styles.porsiBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.porsiVal}>{value}x</Text>
      <TouchableOpacity
        style={styles.porsiBtn}
        onPress={() => onChange(Math.min(10, value + 1))}
        disabled={value >= 10}
      >
        <Text style={styles.porsiBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  porsiRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  porsiBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  porsiBtnText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "700",
    lineHeight: 18,
  },
  porsiVal: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
    minWidth: 28,
    textAlign: "center",
  },
});
