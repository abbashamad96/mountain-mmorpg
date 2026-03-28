import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RARITY_COLORS, MaterialType, RarityName, VersionNum, VERSION_PARTICLE_COLORS } from "@/context/GameContext";
import Colors from "@/constants/colors";

// Per-type, per-rarity: escalating mystery and power in the icon
const TYPE_RARITY_ICON: Record<MaterialType, Record<RarityName, string>> = {
  Ore: {
    Common:    "◆",
    Uncommon:  "◈",
    Rare:      "💎",
    Epic:      "🔷",
    Elite:     "💠",
    Legendary: "⭐",
    Superior:  "🌟",
    Cosmic:    "✨",
  },
  Wood: {
    Common:    "🌿",
    Uncommon:  "🍃",
    Rare:      "🌲",
    Epic:      "🌳",
    Elite:     "🌴",
    Legendary: "🎋",
    Superior:  "☘",
    Cosmic:    "🌌",
  },
  Herb: {
    Common:    "🌱",
    Uncommon:  "🌸",
    Rare:      "🌺",
    Epic:      "💐",
    Elite:     "🌻",
    Legendary: "🌹",
    Superior:  "⚗",
    Cosmic:    "🔮",
  },
  Leather: {
    Common:    "🐺",
    Uncommon:  "🦊",
    Rare:      "🐆",
    Epic:      "🦁",
    Elite:     "🐉",
    Legendary: "🦅",
    Superior:  "🌑",
    Cosmic:    "👁",
  },
};

const TYPE_BG: Record<MaterialType, string[]> = {
  Ore:     ["#1C1108", "#2A1A0A"],
  Wood:    ["#0A1A08", "#121F0A"],
  Herb:    ["#091518", "#0E1E22"],
  Leather: ["#180A08", "#211010"],
};

// Rarity → number of border rings (1–4)
const RARITY_RINGS: Record<RarityName, number> = {
  Common:    1,
  Uncommon:  1,
  Rare:      2,
  Epic:      2,
  Elite:     3,
  Legendary: 3,
  Superior:  4,
  Cosmic:    4,
};

// Border width escalation
const RARITY_BORDER_W: Record<RarityName, number> = {
  Common:    1,
  Uncommon:  1.5,
  Rare:      2,
  Epic:      2.5,
  Elite:     3,
  Legendary: 3,
  Superior:  3.5,
  Cosmic:    4,
};

// Icon scale multiplier per rarity
const RARITY_ICON_SCALE: Record<RarityName, number> = {
  Common:    0.38,
  Uncommon:  0.40,
  Rare:      0.43,
  Epic:      0.46,
  Elite:     0.49,
  Legendary: 0.52,
  Superior:  0.55,
  Cosmic:    0.58,
};

// Decorative corner symbol per rarity
const RARITY_CORNER: Record<RarityName, string | null> = {
  Common:    null,
  Uncommon:  null,
  Rare:      null,
  Epic:      "✦",
  Elite:     "✦",
  Legendary: "✸",
  Superior:  "✸",
  Cosmic:    "✺",
};

// Top badge for legendary+
const RARITY_TOP_BADGE: Record<RarityName, string | null> = {
  Common:    null,
  Uncommon:  null,
  Rare:      null,
  Epic:      null,
  Elite:     null,
  Legendary: "♛",
  Superior:  "✶",
  Cosmic:    "∞",
};

// Glow intensity per rarity (0–1)
const RARITY_GLOW: Record<RarityName, number> = {
  Common:    0,
  Uncommon:  0.08,
  Rare:      0.18,
  Epic:      0.30,
  Elite:     0.42,
  Legendary: 0.55,
  Superior:  0.70,
  Cosmic:    0.90,
};

// Hexifies a color with an alpha (0–1)
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return hex + a;
}

interface MaterialImageProps {
  type: MaterialType;
  rarity: RarityName;
  version: VersionNum;
  size?: number;
}

export function MaterialImage({ type, rarity, version, size = 140 }: MaterialImageProps) {
  const rarityColor = RARITY_COLORS[rarity];
  const rings = RARITY_RINGS[rarity];
  const borderW = RARITY_BORDER_W[rarity];
  const iconScale = RARITY_ICON_SCALE[rarity];
  const corner = RARITY_CORNER[rarity];
  const topBadge = RARITY_TOP_BADGE[rarity];
  const glow = RARITY_GLOW[rarity];
  const icon = TYPE_RARITY_ICON[type][rarity];
  const [bg1, bg2] = TYPE_BG[type];
  const vColor = VERSION_PARTICLE_COLORS[version] !== "transparent"
    ? VERSION_PARTICLE_COLORS[version]
    : rarityColor;

  const iconSize = size * iconScale;
  const cornerFontSize = Math.max(8, size * 0.09);
  const br = size * 0.22;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: br,
          borderWidth: borderW,
          borderColor: rarityColor,
          backgroundColor: bg1,
        },
      ]}
    >
      {/* Inner background gradient-like layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: br - borderW,
            backgroundColor: bg2,
            opacity: 0.7,
          },
        ]}
      />

      {/* Glow halo behind icon */}
      {glow > 0 && (
        <View
          style={[
            styles.glowHalo,
            {
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: size * 0.36,
              backgroundColor: withAlpha(rarityColor, glow * 0.5),
            },
          ]}
        />
      )}

      {/* Extra border rings */}
      {rings >= 2 && (
        <View
          style={[
            styles.ringAbs,
            {
              width: size * 0.88,
              height: size * 0.88,
              borderRadius: size * 0.44,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.35),
            },
          ]}
        />
      )}
      {rings >= 3 && (
        <View
          style={[
            styles.ringAbs,
            {
              width: size * 0.77,
              height: size * 0.77,
              borderRadius: size * 0.385,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.25),
            },
          ]}
        />
      )}
      {rings >= 4 && (
        <View
          style={[
            styles.ringAbs,
            {
              width: size * 0.65,
              height: size * 0.65,
              borderRadius: size * 0.325,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.20),
            },
          ]}
        />
      )}

      {/* Strong outer glow (Elite+) as shadow-like ring */}
      {glow >= 0.42 && (
        <View
          style={[
            styles.ringAbs,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: br + 4,
              borderWidth: 4,
              borderColor: withAlpha(rarityColor, glow * 0.35),
            },
          ]}
        />
      )}

      {/* Main icon */}
      <Text style={{ fontSize: iconSize, textAlign: "center", lineHeight: iconSize * 1.1 }}>
        {icon}
      </Text>

      {/* Corner rarity marks (Epic+) */}
      {corner && (
        <>
          <Text style={[styles.cornerMark, styles.cornerTL, { fontSize: cornerFontSize, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.cornerMark, styles.cornerTR, { fontSize: cornerFontSize, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.cornerMark, styles.cornerBL, { fontSize: cornerFontSize, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.cornerMark, styles.cornerBR, { fontSize: cornerFontSize, color: rarityColor }]}>{corner}</Text>
        </>
      )}

      {/* Top center badge (Legendary+) */}
      {topBadge && (
        <Text
          style={[
            styles.topBadge,
            { fontSize: size * 0.12, color: rarityColor },
          ]}
        >
          {topBadge}
        </Text>
      )}

      {/* Bottom rarity label strip */}
      <View style={[styles.strip, { backgroundColor: withAlpha(rarityColor, 0.22) }]}>
        <Text style={[styles.stripText, { color: rarityColor, fontSize: Math.max(8, size * 0.085) }]}>
          {rarity.toUpperCase()}
          {version > 0 ? `  V${version}` : ""}
        </Text>
      </View>

      {/* Version dots at top-right */}
      {version > 0 && (
        <View style={styles.vDots}>
          {Array.from({ length: version }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.vDot,
                {
                  backgroundColor: vColor,
                  width: Math.max(5, size * 0.055),
                  height: Math.max(5, size * 0.055),
                  borderRadius: size * 0.03,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  glowHalo: {
    position: "absolute",
  },
  ringAbs: {
    position: "absolute",
  },
  cornerMark: {
    position: "absolute",
    fontWeight: "700",
  },
  cornerTL: { top: 5, left: 5 },
  cornerTR: { top: 5, right: 5 },
  cornerBL: { bottom: 16, left: 5 },
  cornerBR: { bottom: 16, right: 5 },
  topBadge: {
    position: "absolute",
    top: 5,
    alignSelf: "center",
    fontWeight: "700",
  },
  strip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: "center",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  stripText: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  vDots: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  vDot: {
    borderRadius: 99,
  },
});
