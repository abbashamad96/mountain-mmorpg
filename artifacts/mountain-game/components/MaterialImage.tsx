import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { RARITY_COLORS, MaterialType, RarityName, VersionNum, VERSION_PARTICLE_COLORS } from "@/context/GameContext";

const TYPE_ICON: Record<MaterialType, string> = {
  Ore: "⛏",
  Wood: "🪵",
  Herb: "🌿",
  Leather: "🐺",
};

const TYPE_BG: Record<MaterialType, string> = {
  Ore: "#4A3525",
  Wood: "#2A3A1A",
  Herb: "#1A3A2A",
  Leather: "#3A2A1A",
};

interface MaterialImageProps {
  type: MaterialType;
  rarity: RarityName;
  version: VersionNum;
  size?: number;
}

export function MaterialImage({ type, rarity, version, size = 140 }: MaterialImageProps) {
  const glow = useRef(new Animated.Value(0.5)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const rarityColor = RARITY_COLORS[rarity];
  const vColor = VERSION_PARTICLE_COLORS[version];

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.35, duration: 1000, useNativeDriver: false }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 800, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 0.94, duration: 800, useNativeDriver: false }),
      ])
    );
    glowLoop.start();
    floatLoop.start();
    return () => { glowLoop.stop(); floatLoop.stop(); };
  }, []);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [`${rarityColor}50`, rarityColor],
  });

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2,
          borderColor,
          backgroundColor: TYPE_BG[type],
          transform: [{ scale }],
        },
      ]}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            borderColor: rarityColor,
            opacity: shadowOpacity,
          },
        ]}
      />

      {/* Corner rarity dots */}
      <View style={[styles.corner, styles.cornerTL, { backgroundColor: rarityColor }]} />
      <View style={[styles.corner, styles.cornerTR, { backgroundColor: rarityColor }]} />
      <View style={[styles.corner, styles.cornerBL, { backgroundColor: rarityColor }]} />
      <View style={[styles.corner, styles.cornerBR, { backgroundColor: rarityColor }]} />

      {/* Main icon */}
      <Text style={[styles.icon, { fontSize: size * 0.42 }]}>{TYPE_ICON[type]}</Text>

      {/* Rarity shimmer line */}
      <View style={[styles.shimmerLine, { backgroundColor: rarityColor + "60" }]} />

      {/* Version dots */}
      {version > 0 && (
        <View style={styles.versionRow}>
          {Array.from({ length: version }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.vDot,
                { backgroundColor: vColor !== "transparent" ? vColor : rarityColor },
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 1,
  },
  corner: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cornerTL: { top: 6, left: 6 },
  cornerTR: { top: 6, right: 6 },
  cornerBL: { bottom: 6, left: 6 },
  cornerBR: { bottom: 6, right: 6 },
  icon: {
    textAlign: "center",
  },
  shimmerLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  versionRow: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  vDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
