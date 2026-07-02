import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { ITEM_RARITY_COLORS, PotionType, PotionRarity, ItemTier } from "@/lib/items";

// ─── Static require map (Metro bundler needs literal require calls) ─────────────────

const POTION_SPLASH: Record<PotionType, Record<PotionRarity, any>> = {
  Gold: {
    Common:    require("../assets/splash/Potion_Gold_Common.png"),
    Uncommon:  require("../assets/splash/Potion_Gold_Uncommon.png"),
    Rare:      require("../assets/splash/Potion_Gold_Rare.png"),
    Epic:      require("../assets/splash/Potion_Gold_Epic.png"),
    Elite:     require("../assets/splash/Potion_Gold_Elite.png"),
    Legendary: require("../assets/splash/Potion_Gold_Legendary.png"),
  },
  XP: {
    Common:    require("../assets/splash/Potion_XP_Common.png"),
    Uncommon:  require("../assets/splash/Potion_XP_Uncommon.png"),
    Rare:      require("../assets/splash/Potion_XP_Rare.png"),
    Epic:      require("../assets/splash/Potion_XP_Epic.png"),
    Elite:     require("../assets/splash/Potion_XP_Elite.png"),
    Legendary: require("../assets/splash/Potion_XP_Legendary.png"),
  },
  Exploration: {
    Common:    require("../assets/splash/Potion_Exploration_Common.png"),
    Uncommon:  require("../assets/splash/Potion_Exploration_Uncommon.png"),
    Rare:      require("../assets/splash/Potion_Exploration_Rare.png"),
    Epic:      require("../assets/splash/Potion_Exploration_Epic.png"),
    Elite:     require("../assets/splash/Potion_Exploration_Elite.png"),
    Legendary: require("../assets/splash/Potion_Exploration_Legendary.png"),
  },
  Energy: {
    Common:    require("../assets/splash/Potion_Energy_Uncommon.png"),
    Uncommon:  require("../assets/splash/Potion_Energy_Uncommon.png"),
    Rare:      require("../assets/splash/Potion_Energy_Rare.png"),
    Epic:      require("../assets/splash/Potion_Energy_Epic.png"),
    Elite:     require("../assets/splash/Potion_Energy_Elite.png"),
    Legendary: require("../assets/splash/Potion_Energy_Elite.png"),
  },
};

// ─── Rarity effects ───────────────────────────────────────────────────────

const RARITY_GLOW_RINGS: Record<PotionRarity, number> = {
  Common: 0, Uncommon: 1, Rare: 1, Epic: 2,
  Elite: 2, Legendary: 3,
};

const RARITY_GLOW_OPACITY: Record<PotionRarity, number> = {
  Common: 0.10, Uncommon: 0.18, Rare: 0.26, Epic: 0.36,
  Elite: 0.42, Legendary: 0.52,
};

// ─── Tier sparkle positions ────────────────────────────────────────────

const SPARKLE_POSITIONS: [number, number][][] = [
  [],
  [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]],
  [[0.05, 0.05], [0.50, 0.04], [0.95, 0.05],
   [0.96, 0.50],
   [0.95, 0.95], [0.50, 0.96], [0.05, 0.95],
   [0.04, 0.50]],
  [[0.05, 0.05], [0.38, 0.04], [0.62, 0.04], [0.95, 0.05],
   [0.96, 0.35], [0.96, 0.65],
   [0.95, 0.95], [0.62, 0.96], [0.38, 0.96], [0.05, 0.95],
   [0.04, 0.65], [0.04, 0.35]],
];

const SPARKLE_SIZES: number[] = [0, 3.5, 4.5, 6];

// ─── Component ───────────────────────────────────────────────────────────────

interface PotionImageProps {
  type: PotionType;
  rarity: PotionRarity;
  tier?: ItemTier;
  size?: number;
  compact?: boolean;
}

export function PotionImage({
  type, rarity, tier = 0, size = 80, compact = false,
}: PotionImageProps) {
  const rc = ITEM_RARITY_COLORS[rarity];
  const rings = RARITY_GLOW_RINGS[rarity];
  const baseOpacity = RARITY_GLOW_OPACITY[rarity];

  const sparkleAnim = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (compact || tier === 0) { sparkleAnim.setValue(0.55); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1.0, duration: 800 + tier * 150, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.15, duration: 800 + tier * 150, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [compact, tier, sparkleAnim]);

  const sparklePts  = SPARKLE_POSITIONS[tier] ?? [];
  const sparkleSize = SPARKLE_SIZES[tier] ?? 0;

  const imgSize = size * 0.90;
  const imgOffset = (size - imgSize) / 2;

  return (
    <View style={[ss.root, { width: size, height: size }]}>
      {/* Rarity glow rings */}
      {Array.from({ length: rings }).map((_, i) => {
        const offset = (i + 1) * 3;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: offset, top: offset,
              right: offset, bottom: offset,
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: rc,
              opacity: baseOpacity - i * 0.06,
            }}
          />
        );
      })}

      {/* Background circle */}
      <View
        style={{
          position: "absolute",
          left: 3, top: 3, right: 3, bottom: 3,
          borderRadius: size / 2,
          backgroundColor: rc + "0D",
          borderWidth: 1.5,
          borderColor: rc + "44",
        }}
      />

      {/* Sparkle dots */}
      {sparklePts.map(([lf, tf], i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: lf * size - sparkleSize / 2,
            top: tf * size - sparkleSize / 2,
            width: sparkleSize,
            height: sparkleSize,
            borderRadius: sparkleSize / 2,
            backgroundColor: rc,
            opacity: sparkleAnim,
            shadowColor: rc,
            shadowRadius: 4,
            shadowOpacity: 0.8,
          }}
        />
      ))}

      {/* Image */}
      <Image
        source={POTION_SPLASH[type][rarity]}
        style={{
          position: "absolute",
          left: imgOffset,
          top: imgOffset,
          width: imgSize,
          height: imgSize,
          resizeMode: "contain",
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  root: {
    justifyContent: "center",
    alignItems: "center",
  },
});
