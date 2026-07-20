import React, { useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme";

const SCREEN_W = Dimensions.get("window").width;

export default function LineChart({
  data = [],
  color = Colors.primary,
  height = 130,
  target = 0,
  unit = "",
  style,
}) {
  const [w, setW] = useState(SCREEN_W - 64);

  if (!data || data.length < 2) {
    return (
      <View
        style={[
          { height, justifyContent: "center", alignItems: "center" },
          style,
        ]}
      >
        <Text style={{ fontSize: 12, color: Colors.textMuted }}>
          Belum cukup data
        </Text>
      </View>
    );
  }

  const PL = 38,
    PR = 8,
    PT = 14,
    PB = 22;
  const cW = w - PL - PR;
  const cH = height - PT - PB;

  const vals = data.map((d) => d.value);
  const rawMin = Math.min(...vals),
    rawMax = Math.max(...vals);
  const pad = (rawMax - rawMin) * 0.2 || 50;
  const minV = rawMin - pad,
    maxV = rawMax + pad,
    range = maxV - minV;

  const tx = (i) => PL + (i / (data.length - 1)) * cW;
  const ty = (v) => PT + cH - ((v - minV) / range) * cH;
  const segs = data.slice(0, -1).map((_, i) => {
    const x1 = tx(i),
      y1 = ty(vals[i]),
      x2 = tx(i + 1),
      y2 = ty(vals[i + 1]);
    const dx = x2 - x1,
      dy = y2 - y1;
    return {
      x1,
      y1,
      len: Math.sqrt(dx * dx + dy * dy),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
  });
  const yGrid = [0.2, 0.5, 0.8].map((p) => ({
    v: Math.round(minV + range * p),
    y: ty(minV + range * p),
  }));
  const step = Math.max(1, Math.ceil(data.length / 5));
  const xLabels = data.map((d, i) => ({
    label: d.label,
    x: tx(i),
    show: i % step === 0 || i === data.length - 1,
  }));

  const targetY = target > minV && target < maxV ? ty(target) : null;

  return (
    <View
      style={[{ height: height + 4 }, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {}
      {yGrid.map((g, i) => (
        <React.Fragment key={i}>
          <View style={[styles.grid, { top: g.y, left: PL, width: cW }]} />
          <Text style={[styles.yLbl, { top: g.y - 7, left: 0, width: PL - 4 }]}>
            {g.v >= 1000 ? `${(g.v / 1000).toFixed(1)}k` : g.v}
          </Text>
        </React.Fragment>
      ))}

      {}
      {targetY && (
        <View
          style={[styles.targetLine, { top: targetY, left: PL, width: cW }]}
        />
      )}

      {}
      {segs.map((s, i) => {
        const nextY = ty(vals[i + 1]);
        const botY = PT + cH;
        const top = Math.min(s.y1, nextY);
        return (
          <View
            key={`a${i}`}
            style={{
              position: "absolute",
              left: Math.min(s.x1, tx(i + 1)),
              top,
              width: Math.abs(tx(i + 1) - s.x1) + 1,
              height: botY - top,
              backgroundColor: color,
              opacity: 0.08,
            }}
          />
        );
      })}

      {}
      {segs.map((s, i) => (
        <View
          key={`l${i}`}
          style={{
            position: "absolute",
            left: s.x1,
            top: s.y1,
            width: s.len,
            height: 2.5,
            backgroundColor: color,
            borderRadius: 2,
            transform: [{ rotate: `${s.angle}deg` }],
            transformOrigin: "0 50%",
          }}
        />
      ))}

      {}
      {data.map((_, i) => (
        <View
          key={`d${i}`}
          style={[
            styles.dot,
            {
              left: tx(i) - 5,
              top: ty(vals[i]) - 5,
              backgroundColor: i === data.length - 1 ? color : Colors.surface,
              borderColor: color,
              borderWidth: i === data.length - 1 ? 0 : 2,
            },
          ]}
        />
      ))}

      {}
      <Text
        style={[
          styles.lastVal,
          {
            left: tx(data.length - 1) - 22,
            top: ty(vals[data.length - 1]) - 20,
            color,
          },
        ]}
      >
        {vals[data.length - 1]}
        {unit}
      </Text>

      {}
      {xLabels
        .filter((x) => x.show)
        .map((xl, i) => (
          <Text
            key={`x${i}`}
            style={[styles.xLbl, { left: xl.x - 18, top: PT + cH + 5 }]}
          >
            {xl.label}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    position: "absolute",
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  yLbl: {
    position: "absolute",
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: "right",
  },
  xLbl: {
    position: "absolute",
    fontSize: 9,
    color: Colors.textMuted,
    width: 36,
    textAlign: "center",
  },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
  lastVal: { position: "absolute", fontSize: 10, fontWeight: "700" },
  targetLine: {
    position: "absolute",
    height: 1.5,
    backgroundColor: Colors.warning,
    opacity: 0.7,
  },
});
