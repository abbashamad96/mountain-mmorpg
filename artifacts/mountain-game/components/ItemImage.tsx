import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { ITEM_QUALITY_COLORS, ITEM_RARITY_COLORS, ItemQuality, ItemRarity, ItemSlot } from "@/lib/items";

// ─── Rarity effects ───────────────────────────────────────────────────────────

const RARITY_GLOW_RINGS: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 1, Rare: 1, Epic: 2,
  Elite: 2, Legendary: 3, Superior: 3, Cosmic: 4,
};

const RARITY_GLOW_OPACITY: Record<ItemRarity, number> = {
  Common: 0.12, Uncommon: 0.20, Rare: 0.28, Epic: 0.38,
  Elite: 0.45, Legendary: 0.55, Superior: 0.65, Cosmic: 0.80,
};

const QUALITY_SHINE: Record<ItemQuality, number> = {
  Basic: 0, Good: 0.10, Excellent: 0.22,
};

// ─── Slot shapes (100×100 viewBox) ────────────────────────────────────────────

function WeaponShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Polygon points="50,6 58,22 56,72 44,72 42,22" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Polygon points="50,4 57,20 43,20" fill={stroke} opacity={0.9} />
      <Rect x="47.5" y="28" width="5" height="38" rx="2" fill={stroke} opacity={0.35} />
      <Rect x="24" y="70" width="52" height="8" rx="3.5" fill={stroke} stroke={fill} strokeWidth="1" />
      <Rect x="43" y="78" width="14" height="16" rx="4" fill={fill} stroke={stroke} strokeWidth="1" />
      <Circle cx="50" cy="97" r="5.5" fill={stroke} />
    </G>
  );
}

function ArmorShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Rect x="6" y="22" width="18" height="22" rx="7" fill={stroke} opacity={0.55} />
      <Rect x="76" y="22" width="18" height="22" rx="7" fill={stroke} opacity={0.55} />
      <Polygon points="50,10 80,20 90,54 78,86 50,96 22,86 10,54 20,20" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M 50,12 L 64,18 L 67,30 L 57,34 L 50,38 L 43,34 L 33,30 L 36,18 Z" fill="rgba(0,0,0,0.45)" />
      <Rect x="47" y="38" width="6" height="40" rx="2.5" fill={stroke} opacity={0.40} />
      <Rect x="20" y="74" width="60" height="9" rx="3.5" fill={stroke} opacity={0.50} />
    </G>
  );
}

function HelmetShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Path d="M 14,66 Q 14,18 50,18 Q 86,18 86,66 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Path d="M 14,66 L 14,82 Q 14,88 22,88 L 32,88 L 34,66 Z" fill={stroke} opacity={0.6} />
      <Path d="M 86,66 L 86,82 Q 86,88 78,88 L 68,88 L 66,66 Z" fill={stroke} opacity={0.6} />
      <Rect x="14" y="64" width="72" height="11" rx="2.5" fill={stroke} opacity={0.85} />
      <Rect x="18" y="67" width="64" height="5" rx="1.5" fill="rgba(0,0,0,0.55)" />
      <Rect x="44" y="8" width="12" height="24" rx="4" fill={stroke} />
      <Path d="M 8,66 L 92,66 L 90,73 L 10,73 Z" fill={stroke} opacity={0.38} />
    </G>
  );
}

function BootsShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Rect x="30" y="10" width="26" height="54" rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Rect x="28" y="10" width="30" height="9" rx="5" fill={stroke} opacity={0.65} />
      <Path
        d="M 30,60 L 30,80 Q 30,86 35,86 L 76,86 Q 82,86 82,80 L 82,68 Q 77,62 70,62 L 56,62 L 56,60 Z"
        fill={fill} stroke={stroke} strokeWidth="1.5"
      />
      <Path d="M 30,84 L 30,88 L 76,88 Q 82,88 82,84 Z" fill={stroke} opacity={0.42} />
      <Path d="M 72,62 Q 82,64 82,72 L 82,80 Q 74,68 70,65 Z" fill={stroke} opacity={0.32} />
      <Rect x="28" y="34" width="30" height="6" rx="2.5" fill={stroke} opacity={0.42} />
    </G>
  );
}

function AmuletShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Path d="M 34,14 Q 50,22 66,14" stroke={stroke} strokeWidth="3.5" fill="none" opacity={0.55} />
      <Circle cx="34" cy="14" r="4.5" fill={stroke} opacity={0.55} />
      <Circle cx="66" cy="14" r="4.5" fill={stroke} opacity={0.55} />
      <Circle cx="50" cy="22" r="3.5" fill={stroke} opacity={0.45} />
      <Path d="M 50,22 L 50,36" stroke={stroke} strokeWidth="3" opacity={0.55} />
      <Polygon points="50,36 70,56 50,76 30,56" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Polygon points="50,36 70,56 50,56" fill={stroke} opacity={0.28} />
      <Polygon points="50,76 30,56 50,56" fill={stroke} opacity={0.14} />
      <Polygon points="50,44 60,56 50,64 40,56" fill={stroke} opacity={0.38} />
      <Polygon points="50,76 56,84 50,92 44,84" fill={stroke} opacity={0.65} />
    </G>
  );
}

function RingShape({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <G>
      <Circle cx="50" cy="60" r="34" fill="none" stroke={fill} strokeWidth="16" />
      <Circle cx="50" cy="60" r="34" fill="none" stroke={stroke} strokeWidth="2" opacity={0.45} />
      <Circle cx="50" cy="60" r="26" fill="none" stroke={stroke} strokeWidth="1" opacity={0.22} />
      <Polygon points="50,14 64,28 50,38 36,28" fill={stroke} opacity={0.75} />
      <Polygon points="50,16 62,28 50,36 38,28" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <Polygon points="50,16 62,28 50,28" fill={stroke} opacity={0.38} />
      <Rect x="32" y="24" width="6" height="10" rx="2.5" fill={stroke} opacity={0.55} />
      <Rect x="62" y="24" width="6" height="10" rx="2.5" fill={stroke} opacity={0.55} />
    </G>
  );
}

function SlotShape({ slot, fill, stroke }: { slot: ItemSlot; fill: string; stroke: string }) {
  switch (slot) {
    case "Weapon": return <WeaponShape fill={fill} stroke={stroke} />;
    case "Armor":  return <ArmorShape  fill={fill} stroke={stroke} />;
    case "Helmet": return <HelmetShape fill={fill} stroke={stroke} />;
    case "Boots":  return <BootsShape  fill={fill} stroke={stroke} />;
    case "Amulet": return <AmuletShape fill={fill} stroke={stroke} />;
    case "Ring":   return <RingShape   fill={fill} stroke={stroke} />;
    default:       return <WeaponShape fill={fill} stroke={stroke} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemImageProps {
  slot: ItemSlot;
  rarity: ItemRarity;
  quality?: ItemQuality;
  size?: number;
  compact?: boolean;
}

export function ItemImage({ slot, rarity, quality = "Basic", size = 80, compact = false }: ItemImageProps) {
  const rc = ITEM_RARITY_COLORS[rarity];
  const rings = RARITY_GLOW_RINGS[rarity];
  const baseOpacity = RARITY_GLOW_OPACITY[rarity];
  const shine = QUALITY_SHINE[quality];

  const fill   = rc + "55";
  const stroke = rc;

  return (
    <View style={[ss.root, { width: size, height: size }]}>
      {/* Glow rings (behind) */}
      {Array.from({ length: rings }).map((_, i) => {
        const s = size * (0.90 - i * 0.09);
        const offset = (size - s) / 2;
        return (
          <View
            key={i}
            style={[ss.ring, {
              width: s, height: s, borderRadius: s / 2,
              borderColor: rc, opacity: baseOpacity - i * 0.12,
              top: offset, left: offset,
            }]}
          />
        );
      })}

      {/* Background tile */}
      <View style={[ss.bg, {
        width: size * 0.90,
        height: size * 0.90,
        borderRadius: size * 0.15,
        backgroundColor: rc + "1A",
        borderColor: rc + "66",
        borderWidth: compact ? 1.5 : 2,
      }]}>
        <Svg viewBox="0 0 100 100" width={size * 0.76} height={size * 0.76}>
          <Defs>
            <RadialGradient id={`bg_${rarity}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={rc} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={rc} stopOpacity={0.04} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#bg_${rarity})`} />
          <SlotShape slot={slot} fill={fill} stroke={stroke} />
          {shine > 0 && (
            <Polygon points="0,0 100,0 55,42 0,20" fill="white" opacity={shine} />
          )}
        </Svg>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
  },
  bg: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
