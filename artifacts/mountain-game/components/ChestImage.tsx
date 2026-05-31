import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { ITEM_RARITY_COLORS, ItemRarity } from "@/lib/items";

// ─── Static require map ───────────────────────────────────────────────────────

const CHEST_SPLASH: Record<ItemRarity, any> = {
  Common:    require("../assets/splash/chest_Common.png"),
  Uncommon:  require("../assets/splash/chest_Uncommon.png"),
  Rare:      require("../assets/splash/chest_Rare.png"),
  Epic:      require("../assets/splash/chest_Epic.png"),
  Elite:     require("../assets/splash/chest_Legendary.png"),
  Legendary: require("../assets/splash/chest_Mythic.png"),
  Superior:  require("../assets/splash/chest_Divine.png"),
  Cosmic:    require("../assets/splash/chest_Cosmic.png"),
};

// ─── Rarity glow rings ────────────────────────────────────────────────────────

const RARITY_GLOW_RINGS: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 0, Rare: 1, Epic: 1,
  Elite: 2, Legendary: 2, Superior: 3, Cosmic: 3,
};

const RARITY_GLOW_OPACITY: Record<ItemRarity, number> = {
  Common: 0.10, Uncommon: 0.18, Rare: 0.28, Epic: 0.38,
  Elite: 0.45, Legendary: 0.55, Superior: 0.65, Cosmic: 0.80,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ChestImageProps {
  rarity: ItemRarity;
  size?: number;
  compact?: boolean;
}

export function ChestImage({ rarity, size = 80, compact: _compact = false }: ChestImageProps) {
  const rc = ITEM_RARITY_COLORS[rarity];
  const rings = RARITY_GLOW_RINGS[rarity];
  const baseOpacity = RARITY_GLOW_OPACITY[rarity];

  const imgSize = size * 0.90;
  const imgOffset = (size - imgSize) / 2;

  return (
    <View style={[ss.root, { width: size, height: size }]}>
      {/* Rarity glow rings */}
      {Array.from({ length: rings }).map((_, i) => {
        const s = size * (0.92 - i * 0.09);
        const offset = (size - s) / 2;
        return (
          <View key={i} style={[ss.ring, {
            width: s, height: s, borderRadius: s * 0.16,
            borderColor: rc, opacity: baseOpacity - i * 0.12,
            top: offset, left: offset,
          }]} />
        );
      })}

      {/* AI splash image */}
      <View style={[ss.imgWrap, {
        width: imgSize, height: imgSize,
        borderRadius: imgSize * 0.16,
        borderColor: rc + "55",
        borderWidth: 1.5,
        top: imgOffset, left: imgOffset,
      }]}>
        <Image
          source={CHEST_SPLASH[rarity]}
          style={{ width: "100%", height: "100%", borderRadius: imgSize * 0.16 }}
          resizeMode="cover"
        />
        {/* Rarity tint overlay */}
        <View style={[ss.tint, { borderRadius: imgSize * 0.16, backgroundColor: rc + "1A" }]} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root:   { alignItems: "center", justifyContent: "center" },
  ring:   { position: "absolute", borderWidth: 1 },
  imgWrap:{ position: "absolute", overflow: "hidden" },
  tint:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
