import { ItemRarity, ItemTier } from "./items";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalvagingSkill {
  level: number;
  xp: number;
}

export type SalvageMaterialType = "Wood" | "Herb" | "Ore" | "Leather";

export interface SalvageMaterial {
  type: SalvageMaterialType;
  rarity: ItemRarity;
  tier: ItemTier;
  count: number;
}

export interface SalvageResult {
  materials: SalvageMaterial[];
  totalCount: number;
  yieldPct: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SALVAGE_MAX_LEVEL = 100;

// Base material cost from crafting (same as CRAFTING_MATERIALS_NEEDED)
export const SALVAGE_BASE_COST: Record<ItemRarity, number> = {
  Common: 10, Uncommon: 15, Rare: 20, Epic: 25,
  Elite: 30, Legendary: 35, Superior: 40, Cosmic: 45,
};

// NPC buy prices per rarity
export const SALVAGE_NPC_PRICES: Record<ItemRarity, number> = {
  Common:    1_000,
  Uncommon:  2_000,
  Rare:      5_000,
  Epic:      10_000,
  Elite:     20_000,
  Legendary: 50_000,
  Superior:  100_000,
  Cosmic:    300_000,
};

// XP awarded per salvage by rarity
export const SALVAGE_XP_REWARDS: Record<ItemRarity, number> = {
  Common: 5, Uncommon: 13, Rare: 30, Epic: 75,
  Elite: 175, Legendary: 400, Superior: 900, Cosmic: 2000,
};

// XP needed to go from level N to N+1 (index = level - 1)
// Level 100 is max; index 99 value is kept for reference only.
export const SALVAGING_LEVEL_XP: number[] = [
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
];

const MATERIAL_TYPES: SalvageMaterialType[] = ["Wood", "Herb", "Ore", "Leather"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns [minPct, maxPct] yield range at a given salvaging level.
 * Base: 10%–30%. Each level above 1 adds +0.2% to both ends.
 */
export function getSalvageYieldRange(level: number): [number, number] {
  const bonus = (level - 1) * 0.2;
  return [10 + bonus, 30 + bonus];
}

/**
 * XP required to go from `level` to `level + 1`.
 * Returns Infinity at max level.
 */
export function getXpToNextSalvagingLevel(level: number): number {
  if (level >= SALVAGE_MAX_LEVEL) return Infinity;
  return Math.floor((SALVAGING_LEVEL_XP[level - 1] ?? Infinity) / 4);
}

/**
 * Roll salvage yield for an item of the given rarity/tier at the given skill level.
 * Returns materials of matching rarity+tier, distributed randomly across the 4 types.
 */
export function rollSalvageYield(
  rarity: ItemRarity,
  tier: ItemTier,
  level: number,
): SalvageResult {
  const [minPct, maxPct] = getSalvageYieldRange(level);
  const yieldPct = minPct + Math.random() * (maxPct - minPct);
  const baseCost = SALVAGE_BASE_COST[rarity];
  const totalCount = Math.max(1, Math.round((baseCost * yieldPct) / 100));

  // Distribute total among 4 material types randomly
  const counts: Record<SalvageMaterialType, number> = { Wood: 0, Herb: 0, Ore: 0, Leather: 0 };
  for (let i = 0; i < totalCount; i++) {
    const t = MATERIAL_TYPES[Math.floor(Math.random() * MATERIAL_TYPES.length)];
    counts[t]++;
  }

  const materials: SalvageMaterial[] = MATERIAL_TYPES
    .filter((t) => counts[t] > 0)
    .map((t) => ({ type: t, rarity, tier, count: counts[t] }));

  return { materials, totalCount, yieldPct };
}

/**
 * Apply XP gain to a salvaging skill, handling level-ups up to max.
 */
export function applySalvagingXp(skill: SalvagingSkill, xp: number): SalvagingSkill {
  if (skill.level >= SALVAGE_MAX_LEVEL) return skill;
  let { level, xp: current } = skill;
  current += xp;
  while (level < SALVAGE_MAX_LEVEL) {
    const needed = SALVAGING_LEVEL_XP[level - 1];
    if (current < needed) break;
    current -= needed;
    level++;
  }
  if (level >= SALVAGE_MAX_LEVEL) current = 0;
  return { level, xp: current };
}
