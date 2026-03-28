import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import {
  RARITY_COLORS,
  MaterialType,
  RarityName,
  VersionNum,
  VERSION_PARTICLE_COLORS,
} from "@/context/GameContext";
import { AmbientParticles } from "@/components/AmbientParticles";

// ── Splash art map ────────────────────────────────────────────────────────────
// One AI-generated image per type × rarity
const SPLASH: Record<MaterialType, Record<RarityName, ImageSourcePropType>> = {
  Ore: {
    Common:    require("@/assets/images/materials/ore_common.png"),
    Uncommon:  require("@/assets/images/materials/ore_uncommon.png"),
    Rare:      require("@/assets/images/materials/ore_rare.png"),
    Epic:      require("@/assets/images/materials/ore_epic.png"),
    Elite:     require("@/assets/images/materials/ore_elite.png"),
    Legendary: require("@/assets/images/materials/ore_legendary.png"),
    Superior:  require("@/assets/images/materials/ore_superior.png"),
    Cosmic:    require("@/assets/images/materials/ore_cosmic.png"),
  },
  Wood: {
    Common:    require("@/assets/images/materials/wood_common.png"),
    Uncommon:  require("@/assets/images/materials/wood_uncommon.png"),
    Rare:      require("@/assets/images/materials/wood_rare.png"),
    Epic:      require("@/assets/images/materials/wood_epic.png"),
    Elite:     require("@/assets/images/materials/wood_elite.png"),
    Legendary: require("@/assets/images/materials/wood_legendary.png"),
    Superior:  require("@/assets/images/materials/wood_superior.png"),
    Cosmic:    require("@/assets/images/materials/wood_cosmic.png"),
  },
  Herb: {
    Common:    require("@/assets/images/materials/herb_common.png"),
    Uncommon:  require("@/assets/images/materials/herb_uncommon.png"),
    Rare:      require("@/assets/images/materials/herb_rare.png"),
    Epic:      require("@/assets/images/materials/herb_epic.png"),
    Elite:     require("@/assets/images/materials/herb_elite.png"),
    Legendary: require("@/assets/images/materials/herb_legendary.png"),
    Superior:  require("@/assets/images/materials/herb_superior.png"),
    Cosmic:    require("@/assets/images/materials/herb_cosmic.png"),
  },
  Leather: {
    Common:    require("@/assets/images/materials/leather_common.png"),
    Uncommon:  require("@/assets/images/materials/leather_uncommon.png"),
    Rare:      require("@/assets/images/materials/leather_rare.png"),
    Epic:      require("@/assets/images/materials/leather_epic.png"),
    Elite:     require("@/assets/images/materials/leather_elite.png"),
    Legendary: require("@/assets/images/materials/leather_legendary.png"),
    Superior:  require("@/assets/images/materials/leather_superior.png"),
    Cosmic:    require("@/assets/images/materials/leather_cosmic.png"),
  },
};

// ── Rarity frame escalation ───────────────────────────────────────────────────

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

const RARITY_RINGS: Record<RarityName, number> = {
  Common:    0,
  Uncommon:  0,
  Rare:      1,
  Epic:      2,
  Elite:     2,
  Legendary: 3,
  Superior:  3,
  Cosmic:    4,
};

// Overlay darkness on the image — lower rarity = darker/murkier; higher = vivid
const RARITY_DARKEN: Record<RarityName, number> = {
  Common:    0.45,
  Uncommon:  0.30,
  Rare:      0.18,
  Epic:      0.12,
  Elite:     0.08,
  Legendary: 0.05,
  Superior:  0.02,
  Cosmic:    0,
};

// Rarity glow intensity for the halo behind the image
const RARITY_GLOW: Record<RarityName, number> = {
  Common:    0,
  Uncommon:  0,
  Rare:      0.15,
  Epic:      0.28,
  Elite:     0.42,
  Legendary: 0.58,
  Superior:  0.75,
  Cosmic:    0.95,
};

// Decorative corner marks (Epic+)
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

// Top center badge (Legendary+)
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

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex + a;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MaterialImageProps {
  type: MaterialType;
  rarity: RarityName;
  version: VersionNum;
  size?: number;
}

export function MaterialImage({ type, rarity, version, size = 140 }: MaterialImageProps) {
  const rarityColor = RARITY_COLORS[rarity];
  const borderW = RARITY_BORDER_W[rarity];
  const rings = RARITY_RINGS[rarity];
  const darken = RARITY_DARKEN[rarity];
  const glow = RARITY_GLOW[rarity];
  const corner = RARITY_CORNER[rarity];
  const topBadge = RARITY_TOP_BADGE[rarity];
  const vColor =
    VERSION_PARTICLE_COLORS[version] !== "transparent"
      ? VERSION_PARTICLE_COLORS[version]
      : rarityColor;

  const br = size * 0.18;
  const cornerFs = Math.max(8, size * 0.09);

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
        },
      ]}
    >
      {/* Outer glow ring (Elite+) */}
      {glow >= 0.42 && (
        <View
          style={[
            styles.absRing,
            {
              width: size + borderW * 2 + 10,
              height: size + borderW * 2 + 10,
              borderRadius: br + 5,
              borderWidth: 5,
              borderColor: withAlpha(rarityColor, glow * 0.4),
            },
          ]}
        />
      )}

      {/* Full-bleed splash art */}
      <Image
        source={SPLASH[type][rarity]}
        style={[styles.img, { borderRadius: br - borderW }]}
        resizeMode="cover"
      />

      {/* Darkening veil for lower rarities */}
      {darken > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: br - borderW,
              backgroundColor: `rgba(0,0,0,${darken})`,
            },
          ]}
        />
      )}

      {/* Rarity glow overlay (color tint for high rarity) */}
      {glow > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: br - borderW,
              backgroundColor: withAlpha(rarityColor, glow * 0.12),
            },
          ]}
        />
      )}

      {/* Inner border rings */}
      {rings >= 1 && (
        <View
          style={[
            styles.absRing,
            {
              width: size * 0.88,
              height: size * 0.88,
              borderRadius: size * 0.44,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.45),
            },
          ]}
        />
      )}
      {rings >= 2 && (
        <View
          style={[
            styles.absRing,
            {
              width: size * 0.76,
              height: size * 0.76,
              borderRadius: size * 0.38,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.3),
            },
          ]}
        />
      )}
      {rings >= 3 && (
        <View
          style={[
            styles.absRing,
            {
              width: size * 0.64,
              height: size * 0.64,
              borderRadius: size * 0.32,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.22),
            },
          ]}
        />
      )}
      {rings >= 4 && (
        <View
          style={[
            styles.absRing,
            {
              width: size * 0.52,
              height: size * 0.52,
              borderRadius: size * 0.26,
              borderWidth: 1,
              borderColor: withAlpha(rarityColor, 0.18),
            },
          ]}
        />
      )}

      {/* Corner marks (Epic+) */}
      {corner && (
        <>
          <Text style={[styles.corner, styles.cTL, { fontSize: cornerFs, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.corner, styles.cTR, { fontSize: cornerFs, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.corner, styles.cBL, { fontSize: cornerFs, color: rarityColor }]}>{corner}</Text>
          <Text style={[styles.corner, styles.cBR, { fontSize: cornerFs, color: rarityColor }]}>{corner}</Text>
        </>
      )}

      {/* Top badge (Legendary+) */}
      {topBadge && (
        <Text style={[styles.topBadge, { fontSize: size * 0.12, color: rarityColor }]}>
          {topBadge}
        </Text>
      )}

      {/* Bottom strip — rarity name + version */}
      <View
        style={[
          styles.strip,
          {
            backgroundColor: withAlpha(rarityColor, 0.28),
            borderBottomLeftRadius: br - borderW,
            borderBottomRightRadius: br - borderW,
          },
        ]}
      >
        <Text style={[styles.stripText, { color: rarityColor, fontSize: Math.max(8, size * 0.083) }]}>
          {rarity.toUpperCase()}
          {version > 0 ? `   V${version}` : ""}
        </Text>
      </View>

      {/* Ambient particle halo for versioned materials — rendered before dots so it sits behind them */}
      {version > 0 && (
        <AmbientParticles
          color={VERSION_PARTICLE_COLORS[version]}
          version={version as 1 | 2 | 3}
          size={size}
        />
      )}

      {/* Version dots (top-right) */}
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
                  borderRadius: 99,
                  shadowColor: vColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
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
    overflow: "visible",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  img: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  absRing: {
    position: "absolute",
  },
  corner: {
    position: "absolute",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cTL: { top: 5, left: 5 },
  cTR: { top: 5, right: 5 },
  cBL: { bottom: 18, left: 5 },
  cBR: { bottom: 18, right: 5 },
  topBadge: {
    position: "absolute",
    top: 4,
    alignSelf: "center",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  strip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: "center",
  },
  stripText: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
