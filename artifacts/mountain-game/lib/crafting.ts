import {
  ItemRarity, ItemTier, ItemQuality, ITEM_QUALITIES, ITEM_SLOTS,
  GameItem, Potion, generateItem, generatePotion, rollPotionType,
} from "./items";
import { GatheringTool, TOOL_TYPES, generateTool } from "./tools";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CraftingSkill {
  level: number;
  xp: number;
}

export type CraftResultKind = "equipment" | "potion" | "tool";

export interface CraftResult {
  kind: CraftResultKind;
  item?: GameItem;
  potion?: Potion;
  tool?: GatheringTool;
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export const CRAFTING_MATERIALS_NEEDED: Record<ItemRarity, number> = {
  Common: 10, Uncommon: 15, Rare: 20, Epic: 25,
  Elite: 30, Legendary: 35, Superior: 40, Cosmic: 45,
};

export const CRAFTING_XP_REWARDS: Record<ItemRarity, number> = {
  Common: 10, Uncommon: 25, Rare: 60, Epic: 150,
  Elite: 350, Legendary: 800, Superior: 1800, Cosmic: 4000,
};

export const CRAFTING_UNLOCK_LEVELS: Record<ItemRarity, number> = {
  Common: 1, Uncommon: 5, Rare: 8, Epic: 12,
  Elite: 20, Legendary: 27, Superior: 34, Cosmic: 44,
};

// XP to level from L to L+1 (index = level-1; last entry = 0 for max level)
export const CRAFTING_LEVEL_XP: number[] = [
  150, 541, 1145, 1949, 2946, 4127, 5489, 7028, 8739, 10619,
  12667, 14879, 17254, 19789, 22483, 25335, 28341, 31503, 34817, 38282,
  41898, 45664, 49578, 53639, 57847, 62200, 66698, 71340, 76125, 81052,
  86121, 91331, 96681, 102171, 107800, 113567, 119472, 125514, 131692, 138007,
  144458, 151044, 157764, 164619, 171607, 178728, 185983, 193369, 200888, 208538,
  216320, 224232, 232275, 240447, 248750, 257181, 265742, 274431, 283248, 292194,
  301267, 310467, 319795, 329249, 338829, 348536, 358368, 368326, 378410, 388618,
  398951, 409408, 419990, 430695, 441524, 452477, 463553, 474751, 486073, 497517,
  509083, 520771, 532581, 544513, 556565, 568740, 581034, 593450, 605986, 618643,
  631419, 644316, 657332, 670468, 683723, 697097, 710590, 724202, 737932, 751781,
  765748, 779833, 794036, 808357, 822795, 837350, 852023, 866813, 881719, 896742,
  911882, 927138, 942511, 957999, 973604, 989324, 1005160, 1021111, 1037178, 1053359,
  1069656, 1086068, 1102594, 1119235, 1135991, 1152861, 1169845, 1186943, 1204155, 1221480,
  1238920, 1256473, 1274139, 1291919, 1309811, 1327817, 1345936, 1364167, 1382511, 1400968,
  1419537, 1438218, 1457011, 1475917, 1494934, 1514063, 1533304, 1552657, 1572121, 0,
];

export const CRAFTING_MAX_LEVEL = 150;

// ─── Quality ──────────────────────────────────────────────────────────────────

// Returns [basic%, good%, excellent%] weights for a given crafting level
export function getCraftingQualityWeights(level: number): [number, number, number] {
  const bonus = Math.max(0, level - 1);
  const excellent = 10 + bonus * 0.14;
  const good      = 25 + bonus * 0.2;
  const basic     = Math.max(0, 65 - bonus * 0.34);
  return [basic, good, excellent];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rollFromWeights<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function rollCraftQuality(level: number): ItemQuality {
  const [basic, good, excellent] = getCraftingQualityWeights(level);
  return rollFromWeights(ITEM_QUALITIES, [basic, good, excellent]);
}

// Common–Legendary: 74% equipment, 25% potion, 1% tool
// Superior/Cosmic:  99% equipment, 1% tool
export function rollCraftResultKind(rarity: ItemRarity): CraftResultKind {
  const isSuperiorCosmic = rarity === "Superior" || rarity === "Cosmic";
  const r = Math.random() * 100;
  if (r < 1) return "tool";
  if (!isSuperiorCosmic && r < 26) return "potion";
  return "equipment";
}

// ─── XP / levelling ───────────────────────────────────────────────────────────

export function getXpToNextCraftingLevel(level: number): number {
  if (level >= CRAFTING_MAX_LEVEL) return 0;
  return CRAFTING_LEVEL_XP[level - 1] ?? 0;
}

export function applyXpToCraftingSkill(skill: CraftingSkill, xpGained: number): CraftingSkill {
  let { level, xp } = skill;
  xp += xpGained;
  while (level < CRAFTING_MAX_LEVEL) {
    const needed = getXpToNextCraftingLevel(level);
    if (needed === 0 || xp < needed) break;
    xp -= needed;
    level++;
  }
  if (level >= CRAFTING_MAX_LEVEL) xp = 0;
  return { level, xp };
}

// ─── Roll ─────────────────────────────────────────────────────────────────────

const POTION_RARITIES_LIST = [
  "Common", "Uncommon", "Rare", "Epic", "Elite", "Legendary",
] as const;

export function rollCraftResult(
  rarity: ItemRarity,
  tier: ItemTier,
  craftingLevel: number,
): CraftResult {
  const kind    = rollCraftResultKind(rarity);
  const quality = rollCraftQuality(craftingLevel);

  if (kind === "equipment") {
    const slot = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)];
    return { kind, item: generateItem(slot, rarity, tier, quality) };
  }

  if (kind === "potion") {
    const potionRarity: typeof POTION_RARITIES_LIST[number] =
      POTION_RARITIES_LIST.includes(rarity as any)
        ? (rarity as typeof POTION_RARITIES_LIST[number])
        : "Legendary";
    const type = rollPotionType();
    return { kind, potion: generatePotion(type, potionRarity, tier) };
  }

  const toolType = TOOL_TYPES[Math.floor(Math.random() * TOOL_TYPES.length)];
  return { kind, tool: generateTool(toolType, rarity) };
}
