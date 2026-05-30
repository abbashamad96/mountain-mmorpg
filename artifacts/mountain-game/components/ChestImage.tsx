import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { ITEM_RARITY_COLORS, ItemRarity } from "@/lib/items";

// ─── Rarity glow ──────────────────────────────────────────────────────────────

const RARITY_GLOW_RINGS: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 0, Rare: 1, Epic: 1,
  Elite: 2, Legendary: 2, Superior: 3, Cosmic: 3,
};

const RARITY_GLOW_OPACITY: Record<ItemRarity, number> = {
  Common: 0.12, Uncommon: 0.18, Rare: 0.28, Epic: 0.38,
  Elite: 0.45, Legendary: 0.55, Superior: 0.65, Cosmic: 0.80,
};

// ─── Per-rarity decorations (SVG, 100×100 viewBox) ───────────────────────────

function ChestDecoration({ rarity, rc, fill }: { rarity: ItemRarity; rc: string; fill: string }) {
  switch (rarity) {
    case "Common":
      return (
        <G>
          <Rect x="8" y="56" width="84" height="2.5" fill={rc} opacity={0.35} />
          <Rect x="8" y="66" width="84" height="2.5" fill={rc} opacity={0.35} />
          <Rect x="8" y="76" width="84" height="2.5" fill={rc} opacity={0.35} />
        </G>
      );
    case "Uncommon":
      return (
        <G>
          <Rect x="10" y="51" width="5" height="37" rx="2" fill={rc} opacity={0.30} />
          <Rect x="24" y="51" width="5" height="37" rx="2" fill={rc} opacity={0.30} />
          <Rect x="71" y="51" width="5" height="37" rx="2" fill={rc} opacity={0.30} />
          <Rect x="85" y="51" width="5" height="37" rx="2" fill={rc} opacity={0.30} />
        </G>
      );
    case "Rare":
      return (
        <G>
          <Polygon points="12,50 22,50 12,63" fill={rc} opacity={0.5} />
          <Polygon points="88,50 78,50 88,63" fill={rc} opacity={0.5} />
          <Polygon points="12,88 22,88 12,75" fill={rc} opacity={0.5} />
          <Polygon points="88,88 78,88 88,75" fill={rc} opacity={0.5} />
        </G>
      );
    case "Epic":
      return (
        <G>
          <Circle cx="22" cy="69" r="6.5" fill="none" stroke={rc} strokeWidth="1.5" opacity={0.65} />
          <Circle cx="78" cy="69" r="6.5" fill="none" stroke={rc} strokeWidth="1.5" opacity={0.65} />
          <Line x1="29" y1="69" x2="71" y2="69" stroke={rc} strokeWidth="1" opacity={0.35} />
          <Circle cx="22" cy="69" r="2" fill={rc} opacity={0.8} />
          <Circle cx="78" cy="69" r="2" fill={rc} opacity={0.8} />
        </G>
      );
    case "Elite":
      return (
        <G>
          <Path d="M28,18 Q33,6 38,18" stroke={rc} strokeWidth="2.5" fill="none" opacity={0.75} />
          <Path d="M46,14 Q52,2 58,14" stroke={rc} strokeWidth="2.5" fill="none" opacity={0.85} />
          <Path d="M64,18 Q69,6 74,18" stroke={rc} strokeWidth="2.5" fill="none" opacity={0.75} />
          <Polygon points="50,8 54,14 50,18 46,14" fill={rc} opacity={0.5} />
        </G>
      );
    case "Legendary":
      return (
        <G>
          <Path d="M50,32 L53,24 L50,18 L47,24 Z" fill={rc} opacity={0.85} />
          <Path d="M50,32 L58,35 L64,30 L56,28 Z" fill={rc} opacity={0.65} />
          <Path d="M50,32 L42,35 L36,30 L44,28 Z" fill={rc} opacity={0.65} />
          <Path d="M50,32 L53,40 L50,45 L47,40 Z" fill={rc} opacity={0.55} />
          <Circle cx="50" cy="32" r="4" fill={fill} stroke={rc} strokeWidth="1" opacity={0.9} />
        </G>
      );
    case "Superior":
      return (
        <G>
          <Polygon points="50,12 62,22 58,34 42,34 38,22" fill={rc} opacity={0.25} />
          <Polygon points="50,12 62,22 50,22" fill={rc} opacity={0.35} />
          <Line x1="50" y1="12" x2="50" y2="34" stroke={rc} strokeWidth="0.8" opacity={0.6} />
          <Line x1="38" y1="22" x2="62" y2="22" stroke={rc} strokeWidth="0.8" opacity={0.6} />
          <Line x1="42" y1="34" x2="58" y2="10" stroke={rc} strokeWidth="0.5" opacity={0.3} />
        </G>
      );
    case "Cosmic":
      return (
        <G>
          <Circle cx="50" cy="22" r="18" fill="none" stroke={rc} strokeWidth="0.8" opacity={0.30} />
          <Circle cx="50" cy="22" r="11" fill="none" stroke={rc} strokeWidth="0.6" opacity={0.22} />
          <Circle cx="50" cy="10" r="3" fill={rc} opacity={0.80} />
          <Circle cx="62" cy="29" r="2.5" fill={rc} opacity={0.70} />
          <Circle cx="38" cy="29" r="2.5" fill={rc} opacity={0.70} />
          <Path d="M50,17 L51.8,21.5 L56.5,21.5 L52.7,24.5 L54.5,29 L50,26 L45.5,29 L47.3,24.5 L43.5,21.5 L48.2,21.5 Z" fill={rc} opacity={0.85} />
        </G>
      );
    default:
      return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChestImageProps {
  rarity: ItemRarity;
  size?: number;
  compact?: boolean;
}

export function ChestImage({ rarity, size = 80, compact = false }: ChestImageProps) {
  const rc = ITEM_RARITY_COLORS[rarity];
  const rings = RARITY_GLOW_RINGS[rarity];
  const baseOpacity = RARITY_GLOW_OPACITY[rarity];
  const fill = rc + "44";

  return (
    <View style={[ss.root, { width: size, height: size }]}>
      {/* Glow rings */}
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
        width: size * 0.90, height: size * 0.90,
        borderRadius: size * 0.15,
        backgroundColor: rc + "1A",
        borderColor: rc + "66",
        borderWidth: compact ? 1.5 : 2,
      }]}>
        <Svg viewBox="0 0 100 100" width={size * 0.76} height={size * 0.76}>
          <Defs>
            <RadialGradient id={`cbg_${rarity}`} cx="50%" cy="38%" r="60%">
              <Stop offset="0%" stopColor={rc} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={rc} stopOpacity={0.04} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#cbg_${rarity})`} />

          {/* Chest body */}
          <Rect x="8" y="48" width="84" height="42" rx="5" fill={fill} stroke={rc} strokeWidth="1.5" />
          <Rect x="8" y="82" width="84" height="8" rx="3" fill="rgba(0,0,0,0.28)" />

          {/* Chest lid (arched top) */}
          <Path d="M8,24 Q8,13 50,13 Q92,13 92,24 L92,49 L8,49 Z"
            fill={fill} stroke={rc} strokeWidth="1.5" />
          {/* Lid top shine */}
          <Path d="M11,21 Q50,11 89,21 L92,26 Q50,14 8,26 Z" fill="white" opacity={0.10} />

          {/* Lid/body band */}
          <Rect x="8" y="46" width="84" height="5" rx="0" fill={rc} opacity={0.55} />

          {/* Corner bands – body */}
          <Rect x="16" y="49" width="7" height="41" rx="2" fill={rc} opacity={0.20} />
          <Rect x="77" y="49" width="7" height="41" rx="2" fill={rc} opacity={0.20} />
          {/* Corner bands – lid */}
          <Rect x="16" y="13" width="7" height="33" rx="2" fill={rc} opacity={0.20} />
          <Rect x="77" y="13" width="7" height="33" rx="2" fill={rc} opacity={0.20} />

          {/* Lock body */}
          <Rect x="40" y="38" width="20" height="17" rx="4" fill={rc} opacity={0.90} />
          {/* Lock keyhole */}
          <Circle cx="50" cy="43" r="4.5" fill={fill} />
          <Rect x="48" y="43" width="4" height="8" rx="1" fill={fill} />
          {/* Lock shackle */}
          <Path d="M43,38 L43,29 Q43,19 50,19 Q57,19 57,29 L57,38"
            stroke={rc} strokeWidth="2.5" fill="none" opacity={0.88} />

          {/* Rarity decoration */}
          <ChestDecoration rarity={rarity} rc={rc} fill={fill} />
        </Svg>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1 },
  bg: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
