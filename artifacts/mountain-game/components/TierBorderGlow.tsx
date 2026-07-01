import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const TIER_GLOW_COLORS = ["transparent", "#22C55E", "#3B82F6", "#A855F7"];

interface TierBorderGlowProps {
  tier: number;
  size: number;
}

export function TierBorderGlow({ tier, size }: TierBorderGlowProps) {
  if (tier <= 0) return null;
  const color = TIER_GLOW_COLORS[tier] ?? TIER_GLOW_COLORS[1];
  const pad = Math.max(6, size * 0.08);
  const glowSize = size + pad * 2;

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000 + tier * 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000 + tier * 200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [tier, pulseAnim]);

  // Tier 1 = single thin ring, T2 = double ring, T3 = triple ring with extra glow
  const ringCount = tier;

  return (
    <View
      style={{
        position: "absolute",
        width: glowSize,
        height: glowSize,
        top: -pad,
        left: -pad,
        zIndex: 10,
        pointerEvents: "none",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Pulsing outer glow backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: glowSize * 0.16,
            borderWidth: 2,
            borderColor: color,
            opacity: pulseAnim,
            shadowColor: color,
            shadowRadius: 8 + tier * 4,
            shadowOpacity: 0.85,
            elevation: 6,
          },
        ]}
      />

      {/* Static inner rings (tier count) */}
      {Array.from({ length: ringCount }).map((_, i) => {
        const inset = (i + 1) * 2.5;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: inset,
              top: inset,
              right: inset,
              bottom: inset,
              borderRadius: (glowSize - inset * 2) * 0.16,
              borderWidth: 1.5 - i * 0.3,
              borderColor: color,
              opacity: 0.65 - i * 0.15,
            }}
          />
        );
      })}

      {/* Corner sparkle dots */}
      {Array.from({ length: 4 + tier * 2 }).map((_, i) => {
        const angle = (i / (4 + tier * 2)) * Math.PI * 2 - Math.PI / 4;
        const dist = glowSize * 0.42;
        const dotSize = 2 + tier * 0.8;
        return (
          <Animated.View
            key={`dot-${i}`}
            style={{
              position: "absolute",
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              left: glowSize / 2 + Math.cos(angle) * dist - dotSize / 2,
              top: glowSize / 2 + Math.sin(angle) * dist - dotSize / 2,
              opacity: pulseAnim,
              shadowColor: color,
              shadowRadius: 3,
              shadowOpacity: 0.9,
            }}
          />
        );
      })}
    </View>
  );
}
