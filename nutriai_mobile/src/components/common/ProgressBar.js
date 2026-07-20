import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors, Radius } from "../../theme";

export default function ProgressBar({
  value = 0,
  color = Colors.primary,
  size = "md",
  style,
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const height = size === "sm" ? 5 : size === "lg" ? 10 : 7;

  return (
    <View
      style={[styles.track, { height, backgroundColor: color + "22" }, style]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedValue}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: Radius.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    borderRadius: Radius.full,
  },
});
