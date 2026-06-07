import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { ItemRarity } from "@/lib/items";
import { GatheringTool, TOOL_RARITY_COLORS, ToolType } from "@/lib/tools";

const TOOL_IMAGES: Record<ToolType, Record<ItemRarity, any>> = {
  Axe: {
    Common:    require("@/assets/tools/Axe_Common.png"),
    Uncommon:  require("@/assets/tools/Axe_Uncommon.png"),
    Rare:      require("@/assets/tools/Axe_Rare.png"),
    Epic:      require("@/assets/tools/Axe_Epic.png"),
    Elite:     require("@/assets/tools/Axe_Elite.png"),
    Legendary: require("@/assets/tools/Axe_Legendary.png"),
    Superior:  require("@/assets/tools/Axe_Superior.png"),
    Cosmic:    require("@/assets/tools/Axe_Cosmic.png"),
  },
  Pickaxe: {
    Common:    require("@/assets/tools/Pickaxe_Common.png"),
    Uncommon:  require("@/assets/tools/Pickaxe_Uncommon.png"),
    Rare:      require("@/assets/tools/Pickaxe_Rare.png"),
    Epic:      require("@/assets/tools/Pickaxe_Epic.png"),
    Elite:     require("@/assets/tools/Pickaxe_Elite.png"),
    Legendary: require("@/assets/tools/Pickaxe_Legendary.png"),
    Superior:  require("@/assets/tools/Pickaxe_Superior.png"),
    Cosmic:    require("@/assets/tools/Pickaxe_Cosmic.png"),
  },
  SkinningKnife: {
    Common:    require("@/assets/tools/SkinningKnife_Common.png"),
    Uncommon:  require("@/assets/tools/SkinningKnife_Uncommon.png"),
    Rare:      require("@/assets/tools/SkinningKnife_Rare.png"),
    Epic:      require("@/assets/tools/SkinningKnife_Epic.png"),
    Elite:     require("@/assets/tools/SkinningKnife_Elite.png"),
    Legendary: require("@/assets/tools/SkinningKnife_Legendary.png"),
    Superior:  require("@/assets/tools/SkinningKnife_Superior.png"),
    Cosmic:    require("@/assets/tools/SkinningKnife_Cosmic.png"),
  },
  Sickle: {
    Common:    require("@/assets/tools/Sickle_Common.png"),
    Uncommon:  require("@/assets/tools/Sickle_Uncommon.png"),
    Rare:      require("@/assets/tools/Sickle_Rare.png"),
    Epic:      require("@/assets/tools/Sickle_Epic.png"),
    Elite:     require("@/assets/tools/Sickle_Elite.png"),
    Legendary: require("@/assets/tools/Sickle_Legendary.png"),
    Superior:  require("@/assets/tools/Sickle_Superior.png"),
    Cosmic:    require("@/assets/tools/Sickle_Cosmic.png"),
  },
};

interface ToolImageProps {
  type: ToolType;
  rarity: ItemRarity;
  size?: number;
  compact?: boolean;
}

export function ToolImage({ type, rarity, size = 64, compact }: ToolImageProps) {
  const color = TOOL_RARITY_COLORS[rarity] ?? "#9CA3AF";
  const src = TOOL_IMAGES[type]?.[rarity];
  const pad = compact ? 2 : 4;
  const innerSize = size - pad * 2 - 3;
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderColor: color + "99",
          padding: pad,
          shadowColor: color,
        },
      ]}
    >
      {src && (
        <Image
          source={src}
          style={{ width: innerSize, height: innerSize, borderRadius: compact ? 4 : 7 }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

export function ToolCard({ tool, size = 64 }: { tool: GatheringTool; size?: number }) {
  return <ToolImage type={tool.type} rarity={tool.rarity} size={size} />;
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1.5,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
