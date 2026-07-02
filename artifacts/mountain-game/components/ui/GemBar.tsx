import React from "react";
import { View, ViewStyle } from "react-native";

type Gem = "ruby" | "sapphire" | "emerald" | "amethyst" | "gold" | "ember";

/** Bright solid fill colors — highly saturated for maximum visibility */
const FILL: Record<Gem, string> = {
  ruby: "#FF5544",
  sapphire: "#44AAFF",
  emerald: "#44DD77",
  amethyst: "#AA66FF",
  gold: "#FFCC44",
  ember: "#FF8833",
};

/** Light grey empty track — clearly visible on dark backgrounds */
const TRACK_BG: Record<Gem, string> = {
  ruby: "#777777",
  sapphire: "#6A7A8A",
  emerald: "#6A8A6A",
  amethyst: "#7A6A8A",
  gold: "#8A7A5A",
  ember: "#8A6A5A",
};

/** Lighter border for bar outline */
const TRACK_BORDER: Record<Gem, string> = {
  ruby: "#999999",
  sapphire: "#8A9AAA",
  emerald: "#8AAA8A",
  amethyst: "#9A8AAA",
  gold: "#AA9A7A",
  ember: "#AA8A7A",
};

interface Props {
  /** 0..1 */
  progress: number;
  gem?: Gem;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
  framed?: boolean;
}

/**
 * High-contrast progress bar with solid bright fill and light grey empty track.
 */
export function GemBar({
  progress,
  gem = "gold",
  height = 10,
  style,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const r = height / 2;

  return (
    <View style={[{ minHeight: height }, style]}>
      <View
        style={{
          height,
          borderRadius: r,
          backgroundColor: TRACK_BG[gem],
          borderWidth: 1.5,
          borderColor: TRACK_BORDER[gem],
          overflow: "hidden",
          width: "100%",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            backgroundColor: FILL[gem],
            borderRadius: r,
          }}
        />
        {/* White edge at the fill boundary for clear contrast */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: "rgba(255,255,255,0.65)",
          }}
        />
        {/* Top sheen for depth */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(2, r * 0.3),
            borderRadius: r,
            backgroundColor: "rgba(255,255,255,0.25)",
          }}
        />
      </View>
    </View>
  );
}
