import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { ITEM_RARITY_COLORS, PotionType, PotionRarity, ItemTier } from "@/lib/items";
import { TierBorderGlow } from "@/components/TierBorderGlow";

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

      {/* Tier border glow (replaces sparkles) */}
      <TierBorderGlow tier={tier} size={size} />

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
