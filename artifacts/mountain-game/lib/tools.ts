import { ItemRarity, ItemTier, rollItemRarityFromMonster } from "./items";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolType = "Axe" | "Pickaxe" | "SkinningKnife" | "Sickle";
export type ToolMaterialType = "Wood" | "Ore" | "Leather" | "Herb";

export interface GatheringTool {
  id: string;
  type: ToolType;
  rarity: ItemRarity;
  tradable: boolean;
  effectChance: number;
  effectMinBonus: number;
  effectMaxBonus: number;
  passiveChance: number;
  levelRequirement: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const TOOL_STATS: Record<
  ItemRarity,
  { effectChance: number; minBonus: number; maxBonus: number; passiveChance: number }
> = {
  Common:    { effectChance: 10, minBonus: 1, maxBonus: 3, passiveChance: 1  },
  Uncommon:  { effectChance: 50, minBonus: 1, maxBonus: 3, passiveChance: 2  },
  Rare:      { effectChance: 20, minBonus: 2, maxBonus: 4, passiveChance: 3  },
  Epic:      { effectChance: 60, minBonus: 2, maxBonus: 4, passiveChance: 5  },
  Elite:     { effectChance: 25, minBonus: 3, maxBonus: 6, passiveChance: 7  },
  Legendary: { effectChance: 70, minBonus: 3, maxBonus: 6, passiveChance: 9  },
  Superior:  { effectChance: 50, minBonus: 4, maxBonus: 7, passiveChance: 12 },
  Cosmic:    { effectChance: 50, minBonus: 5, maxBonus: 8, passiveChance: 15 },
};

export const TOOL_LEVEL_REQ: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 15, Rare: 45, Epic: 90,
  Elite: 150, Legendary: 300, Superior: 500, Cosmic: 600,
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOOL_TYPES: ToolType[] = ["Axe", "Pickaxe", "SkinningKnife", "Sickle"];

export const TOOL_NAMES: Record<ToolType, string> = {
  Axe:           "Axe",
  Pickaxe:       "Pickaxe",
  SkinningKnife: "Skinning Knife",
  Sickle:        "Sickle",
};

export const TOOL_MATERIAL_MAP: Record<ToolType, ToolMaterialType> = {
  Axe:           "Wood",
  Pickaxe:       "Ore",
  SkinningKnife: "Leather",
  Sickle:        "Herb",
};

export const MATERIAL_TO_TOOL: Record<ToolMaterialType, ToolType> = {
  Wood:    "Axe",
  Ore:     "Pickaxe",
  Leather: "SkinningKnife",
  Herb:    "Sickle",
};

export const TOOL_ICONS: Record<ToolType, string> = {
  Axe:           "🪓",
  Pickaxe:       "⛏",
  SkinningKnife: "🗡",
  Sickle:        "🌿",
};

export const TOOL_RARITY_COLORS: Record<ItemRarity, string> = {
  Common:    "#9CA3AF",
  Uncommon:  "#22C55E",
  Rare:      "#3B82F6",
  Epic:      "#A855F7",
  Elite:     "#EF4444",
  Legendary: "#F59E0B",
  Superior:  "#EC4899",
  Cosmic:    "#22D3EE",
};

// ─── Generation ───────────────────────────────────────────────────────────────

export function generateTool(type: ToolType, rarity: ItemRarity): GatheringTool {
  const stats = TOOL_STATS[rarity];
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    rarity,
    tradable: true,
    effectChance:    stats.effectChance,
    effectMinBonus:  stats.minBonus,
    effectMaxBonus:  stats.maxBonus,
    passiveChance:   stats.passiveChance,
    levelRequirement: TOOL_LEVEL_REQ[rarity],
  };
}

export function formatToolName(tool: GatheringTool): string {
  return `${tool.rarity} ${TOOL_NAMES[tool.type]}`;
}

export function rollToolDrop(monsterRarity: ItemRarity, monsterTier: ItemTier): GatheringTool {
  const rarity = rollItemRarityFromMonster(monsterRarity, monsterTier);
  const type = TOOL_TYPES[Math.floor(Math.random() * TOOL_TYPES.length)];
  return generateTool(type, rarity);
}
