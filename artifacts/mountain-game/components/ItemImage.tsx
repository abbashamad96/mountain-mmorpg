import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { ITEM_QUALITY_COLORS, ITEM_RARITY_COLORS, ItemQuality, ItemRarity, ItemSlot, ItemTier } from "@/lib/items";

// ─── Static require map (Metro bundler needs literal require calls) ────────────
// 6 slots × 8 rarities = 48 images

const EQUIPMENT_SPLASH: Record<ItemSlot, Record<ItemRarity, any>> = {
  Weapon: {
    Common:    require("../assets/splash/Weapon_Common.png"),
    Uncommon:  require("../assets/splash/Weapon_Uncommon.png"),
    Rare:      require("../assets/splash/Weapon_Rare.png"),
    Epic:      require("../assets/splash/Weapon_Epic.png"),
    Elite:     require("../assets/splash/Weapon_Elite.png"),
    Legendary: require("../assets/splash/Weapon_Legendary.png"),
    Superior:  require("../assets/splash/Weapon_Superior.png"),
    Cosmic:    require("../assets/splash/Weapon_Cosmic.png"),
  },
  Armor: {
    Common:    require("../assets/splash/Armor_Common.png"),
    Uncommon:  require("../assets/splash/Armor_Uncommon.png"),
    Rare:      require("../assets/splash/Armor_Rare.png"),
    Epic:      require("../assets/splash/Armor_Epic.png"),
    Elite:     require("../assets/splash/Armor_Elite.png"),
    Legendary: require("../assets/splash/Armor_Legendary.png"),
    Superior:  require("../assets/splash/Armor_Superior.png"),
    Cosmic:    require("../assets/splash/Armor_Cosmic.png"),
  },
  Boots: {
    Common:    require("../assets/splash/Boots_Common.png"),
    Uncommon:  require("../assets/splash/Boots_Uncommon.png"),
    Rare:      require("../assets/splash/Boots_Rare.png"),
    Epic:      require("../assets/splash/Boots_Epic.png"),
    Elite:     require("../assets/splash/Boots_Elite.png"),
    Legendary: require("../assets/splash/Boots_Legendary.png"),
    Superior:  require("../assets/splash/Boots_Superior.png"),
    Cosmic:    require("../assets/splash/Boots_Cosmic.png"),
  },
  Helmet: {
    Common:    require("../assets/splash/Helmet_Common.png"),
    Uncommon:  require("../assets/splash/Helmet_Uncommon.png"),
    Rare:      require("../assets/splash/Helmet_Rare.png"),
    Epic:      require("../assets/splash/Helmet_Epic.png"),
    Elite:     require("../assets/splash/Helmet_Elite.png"),
    Legendary: require("../assets/splash/Helmet_Legendary.png"),
    Superior:  require("../assets/splash/Helmet_Superior.png"),
    Cosmic:    require("../assets/splash/Helmet_Cosmic.png"),
  },
  Amulet: {
    Common:    require("../assets/splash/Amulet_Common.png"),
    Uncommon:  require("../assets/splash/Amulet_Uncommon.png"),
    Rare:      require("../assets/splash/Amulet_Rare.png"),
    Epic:      require("../assets/splash/Amulet_Epic.png"),
    Elite:     require("../assets/splash/Amulet_Elite.png"),
    Legendary: require("../assets/splash/Amulet_Legendary.png"),
    Superior:  require("../assets/splash/Amulet_Superior.png"),
    Cosmic:    require("../assets/splash/Amulet_Cosmic.png"),
  },
  Ring: {
    Common:    require("../assets/splash/Ring_Common.png"),
    Uncommon:  require("../assets/splash/Ring_Uncommon.png"),
    Rare:      require("../assets/splash/Ring_Rare.png"),
    Epic:      require("../assets/splash/Ring_Epic.png"),
    Elite:     require("../assets/splash/Ring_Elite.png"),
    Legendary: require("../assets/splash/Ring_Legendary.png"),
    Superior:  require("../assets/splash/Ring_Superior.png"),
    Cosmic:    require("../assets/splash/Ring_Cosmic.png"),
  },
};

// ─── Rarity effects ───────────────────────────────────────────────────────────

const RARITY_GLOW_RINGS: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 1, Rare: 1, Epic: 2,
  Elite: 2, Legendary: 3, Superior: 3, Cosmic: 4,
};

const RARITY_GLOW_OPACITY: Record<ItemRarity, number> = {
  Common: 0.10, Uncommon: 0.18, Rare: 0.26, Epic: 0.36,
  Elite: 0.42, Legendary: 0.52, Superior: 0.62, Cosmic: 0.78,
};

// ─── Tier sparkle positions (as [left_frac, top_frac] of total size) ──────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemImageProps {
  slot: ItemSlot;
  rarity: ItemRarity;
  quality?: ItemQuality;
  tier?: ItemTier;
  size?: number;
  compact?: boolean;
}

export function ItemImage({
  slot, rarity, quality = "Basic", tier = 0, size = 80, compact = false,
}: ItemImageProps) {
  const rc = ITEM_RARITY_COLORS[rarity];
  const rings = RARITY_GLOW_RINGS[rarity];
  const baseOpacity = RARITY_GLOW_OPACITY[rarity];

  const isGood      = quality === "Good";
  const isExcellent = quality === "Excellent";
  const qBorderColor = isExcellent
    ? ITEM_QUALITY_COLORS.Excellent
    : isGood
    ? ITEM_QUALITY_COLORS.Good
    : rc;
  const innerBorderWidth = (isGood || isExcellent) ? 2 : 1.5;

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
        const s = size * (0.90 - i * 0.09);
        const offset = (size - s) / 2;
        return (
          <View key={i} style={[ss.ring, {
            width: s, height: s, borderRadius: s * 0.16,
            borderColor: rc, opacity: baseOpacity - i * 0.10,
            top: offset, left: offset,
          }]} />
        );
      })}

      {/* Good quality – single outer ring in blue */}
      {isGood && (
        <View style={[ss.qualRing, {
          width: size * 0.96, height: size * 0.96,
          borderRadius: size * 0.175,
          borderColor: ITEM_QUALITY_COLORS.Good + "BB",
          borderWidth: 1.5,
          top: size * 0.02, left: size * 0.02,
        }]} />
      )}

      {/* Excellent quality – two outer rings in gold */}
      {isExcellent && (
        <>
          <View style={[ss.qualRing, {
            width: size * 0.985, height: size * 0.985,
            borderRadius: size * 0.18,
            borderColor: ITEM_QUALITY_COLORS.Excellent + "EE",
            borderWidth: 1.5,
            top: size * 0.0075, left: size * 0.0075,
          }]} />
          <View style={[ss.qualRing, {
            width: size * 0.955, height: size * 0.955,
            borderRadius: size * 0.17,
            borderColor: ITEM_QUALITY_COLORS.Excellent + "55",
            borderWidth: 1,
            top: size * 0.0225, left: size * 0.0225,
          }]} />
        </>
      )}

      {/* AI splash image tile — slot + rarity specific */}
      <View style={[ss.bg, {
        width: imgSize, height: imgSize,
        borderRadius: imgSize * 0.16,
        borderColor: (isGood || isExcellent) ? qBorderColor + "88" : rc + "55",
        borderWidth: innerBorderWidth,
        top: imgOffset, left: imgOffset,
      }]}>
        <Image
          source={EQUIPMENT_SPLASH[slot][rarity]}
          style={{ width: "100%", height: "100%", borderRadius: imgSize * 0.16 }}
          resizeMode="cover"
        />
        {/* Rarity colour tint overlay */}
        <View style={[ss.tint, { borderRadius: imgSize * 0.16, backgroundColor: rc + "18" }]} />
        {/* Excellent quality shimmer */}
        {isExcellent && (
          <View style={[ss.shimmer, { borderRadius: imgSize * 0.16, backgroundColor: ITEM_QUALITY_COLORS.Excellent + "12" }]} />
        )}
      </View>

      {/* Tier sparkle dots */}
      {sparklePts.map(([lf, tf], i) => (
        <Animated.View key={i} style={[ss.sparkle, {
          width: sparkleSize, height: sparkleSize,
          backgroundColor: rc,
          left: lf * size - sparkleSize / 2,
          top: tf * size - sparkleSize / 2,
          opacity: compact ? (0.3 + tier * 0.15) : sparkleAnim,
          shadowColor: rc, shadowOpacity: 0.85,
          shadowRadius: sparkleSize * 1.2, elevation: 3,
        }]} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root:     { alignItems: "center", justifyContent: "center" },
  ring:     { position: "absolute", borderWidth: 1 },
  qualRing: { position: "absolute" },
  bg:       { position: "absolute", overflow: "hidden" },
  tint:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  shimmer:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sparkle:  { position: "absolute", transform: [{ rotate: "45deg" }] },
});
