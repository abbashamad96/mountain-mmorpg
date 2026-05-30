// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemSlot = "Weapon" | "Armor" | "Boots" | "Helmet" | "Amulet" | "Ring";
export type ItemQuality = "Basic" | "Good" | "Excellent";
export type ItemTier = 0 | 1 | 2 | 3;
export type ItemRarity =
  | "Common" | "Uncommon" | "Rare" | "Epic"
  | "Elite" | "Legendary" | "Superior" | "Cosmic";

export interface ItemStatBlock {
  strength: number;
  health: number;
  defence: number;
  speed: number;
}

export interface GameItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  tier: ItemTier;
  quality: ItemQuality;
  levelRequirement: number;
  tradable: boolean;
  stats: ItemStatBlock;
  percentStats: ItemStatBlock;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ITEM_SLOTS: ItemSlot[] = ["Weapon", "Armor", "Boots", "Helmet", "Amulet", "Ring"];

export const ITEM_SLOT_ICONS: Record<ItemSlot, string> = {
  Weapon: "⚔",
  Armor: "🛡",
  Boots: "👢",
  Helmet: "⛑",
  Amulet: "📿",
  Ring: "💍",
};

export const ITEM_RARITIES: ItemRarity[] = [
  "Common", "Uncommon", "Rare", "Epic", "Elite", "Legendary", "Superior", "Cosmic",
];

export const ITEM_QUALITIES: ItemQuality[] = ["Basic", "Good", "Excellent"];

export const ITEM_QUALITY_COLORS: Record<ItemQuality, string> = {
  Basic: "#9CA3AF",
  Good: "#3B82F6",
  Excellent: "#F59E0B",
};

export const ITEM_RARITY_COLORS: Record<ItemRarity, string> = {
  Common: "#9CA3AF",
  Uncommon: "#22C55E",
  Rare: "#3B82F6",
  Epic: "#A855F7",
  Elite: "#EF4444",
  Legendary: "#F59E0B",
  Superior: "#06B6D4",
  Cosmic: "#EC4899",
};

export const ITEM_NAMES: Record<ItemRarity, Record<ItemSlot, string>> = {
  Common: {
    Weapon: "Iron Blade", Armor: "Iron Vest", Boots: "Iron Boots",
    Helmet: "Iron Cap", Amulet: "Iron Pendant", Ring: "Iron Band",
  },
  Uncommon: {
    Weapon: "Heavy Sword", Armor: "Heavy Coat", Boots: "Heavy Threads",
    Helmet: "Heavy Hood", Amulet: "Heavy Chain", Ring: "Heavy Ring",
  },
  Rare: {
    Weapon: "Duskfall Warblade", Armor: "Duskfall Hauberk", Boots: "Duskfall Greaves",
    Helmet: "Duskfall Visor", Amulet: "Duskfall Talisman", Ring: "Duskfall Seal",
  },
  Epic: {
    Weapon: "Crimson Fang", Armor: "Crimson Plate", Boots: "Crimson Striders",
    Helmet: "Crimson Helm", Amulet: "Crimson Relic", Ring: "Crimson Sigil",
  },
  Elite: {
    Weapon: "Ashen Edge", Armor: "Ashen Warplate", Boots: "Ashen Sabatons",
    Helmet: "Ashen Crest", Amulet: "Ashen Emblem", Ring: "Ashen Crest Ring",
  },
  Legendary: {
    Weapon: "Ember Ruinblade", Armor: "Ember Aegis", Boots: "Ember Ironstriders",
    Helmet: "Ember Crown", Amulet: "Ember Soulmark", Ring: "Ember Oath Ring",
  },
  Superior: {
    Weapon: "Abyssal Dreadblade", Armor: "Abyssal Dreadplate", Boots: "Abyssal Voidstriders",
    Helmet: "Abyssal Warhelm", Amulet: "Abyssal Voidmark", Ring: "Abyssal Dread Ring",
  },
  Cosmic: {
    Weapon: "Starborn Eternity", Armor: "Starborn Celestial Plate", Boots: "Starborn Starwalkers",
    Helmet: "Starborn Astral Crown", Amulet: "Starborn Cosmosmark", Ring: "Starborn Eternity Ring",
  },
};

export const ITEM_LEVEL_REQ: Record<ItemRarity, number> = {
  Common: 0, Uncommon: 15, Rare: 45, Epic: 90,
  Elite: 150, Legendary: 300, Superior: 500, Cosmic: 600,
};

// [tier 0..3][quality 0=Basic 1=Good 2=Excellent] → total flat stat points
const STAT_TABLE: Record<ItemRarity, [number, number, number][]> = {
  Common:    [[2,3,4],[3,4,6],[4,6,8],[6,8,10]],
  Uncommon:  [[8,11,14],[11,14,18],[14,18,22],[18,22,28]],
  Rare:      [[24,30,38],[30,38,48],[38,48,60],[48,60,75]],
  Epic:      [[60,75,92],[75,92,112],[92,112,135],[112,135,162]],
  Elite:     [[140,168,200],[168,200,238],[200,238,282],[238,282,335]],
  Legendary: [[300,360,430],[360,430,510],[430,510,605],[510,605,720]],
  Superior:  [[650,780,935],[780,935,1120],[935,1120,1340],[1120,1340,1600]],
  Cosmic:    [[1450,1740,2090],[1740,2090,2510],[2090,2510,3010],[2510,3010,3600]],
};

// [tier 0..3][quality 0=Basic 1=Good 2=Excellent] → extra % as decimal (0 = none)
const PERCENT_TABLE: Record<ItemRarity, [number, number, number][]> = {
  Common:    [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  Uncommon:  [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  Rare:      [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  Epic:      [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  Elite:     [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  Legendary: [[0.005,0.01,0.015],[0.01,0.015,0.02],[0.015,0.025,0.03],[0.025,0.03,0.04]],
  Superior:  [[0.035,0.04,0.05],[0.04,0.045,0.05],[0.045,0.05,0.055],[0.05,0.06,0.08]],
  Cosmic:    [[0.07,0.08,0.09],[0.08,0.09,0.10],[0.09,0.11,0.12],[0.15,0.175,0.20]],
};

const QUALITY_IDX: Record<ItemQuality, number> = { Basic: 0, Good: 1, Excellent: 2 };

// ─── Stat Generation ──────────────────────────────────────────────────────────

function randomSplit4(total: number): [number, number, number, number] {
  if (total === 0) return [0, 0, 0, 0];
  // Pick 3 random cut points in [0, total], sort them, derive 4 bucket sizes
  const cuts = [
    Math.floor(Math.random() * (total + 1)),
    Math.floor(Math.random() * (total + 1)),
    Math.floor(Math.random() * (total + 1)),
  ].sort((a, b) => a - b);
  return [
    cuts[0],
    cuts[1] - cuts[0],
    cuts[2] - cuts[1],
    total - cuts[2],
  ];
}

function randomPercentSplit(totalPct: number): ItemStatBlock {
  const chunks = Math.round(totalPct / 0.005);
  const buckets = [0, 0, 0, 0];
  for (let i = 0; i < chunks; i++) {
    buckets[Math.floor(Math.random() * 4)]++;
  }
  return {
    strength: Math.round(buckets[0] * 0.005 * 1000) / 1000,
    health:   Math.round(buckets[1] * 0.005 * 1000) / 1000,
    defence:  Math.round(buckets[2] * 0.005 * 1000) / 1000,
    speed:    Math.round(buckets[3] * 0.005 * 1000) / 1000,
  };
}

export function generateItem(
  slot: ItemSlot,
  rarity: ItemRarity,
  tier: ItemTier,
  quality: ItemQuality,
): GameItem {
  const qIdx = QUALITY_IDX[quality];
  const totalFlat = STAT_TABLE[rarity][tier][qIdx];
  const totalPct  = PERCENT_TABLE[rarity][tier][qIdx];

  const [str, hp, def, spd] = randomSplit4(totalFlat);
  const stats: ItemStatBlock = { strength: str, health: hp, defence: def, speed: spd };
  const percentStats = totalPct > 0 ? randomPercentSplit(totalPct) : { strength: 0, health: 0, defence: 0, speed: 0 };

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: ITEM_NAMES[rarity][slot],
    slot,
    rarity,
    tier,
    quality,
    levelRequirement: ITEM_LEVEL_REQ[rarity],
    tradable: true,
    stats,
    percentStats,
  };
}

// ─── Stat Computation ─────────────────────────────────────────────────────────

export function sumItemStats(equipped: Partial<Record<ItemSlot, GameItem>>): ItemStatBlock {
  const out: ItemStatBlock = { strength: 0, health: 0, defence: 0, speed: 0 };
  for (const item of Object.values(equipped)) {
    if (!item) continue;
    out.strength += item.stats.strength;
    out.health   += item.stats.health;
    out.defence  += item.stats.defence;
    out.speed    += item.stats.speed;
  }
  return out;
}

export function sumPercentStats(equipped: Partial<Record<ItemSlot, GameItem>>): ItemStatBlock {
  const out: ItemStatBlock = { strength: 0, health: 0, defence: 0, speed: 0 };
  for (const item of Object.values(equipped)) {
    if (!item) continue;
    out.strength += item.percentStats.strength;
    out.health   += item.percentStats.health;
    out.defence  += item.percentStats.defence;
    out.speed    += item.percentStats.speed;
  }
  return out;
}

export function formatPercent(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function getTotalStatPoints(rarity: ItemRarity, tier: ItemTier, quality: ItemQuality): number {
  return STAT_TABLE[rarity][tier][QUALITY_IDX[quality]];
}

export function getTotalPercent(rarity: ItemRarity, tier: ItemTier, quality: ItemQuality): number {
  return PERCENT_TABLE[rarity][tier][QUALITY_IDX[quality]];
}

export function formatItemName(item: GameItem): string {
  const qualPart = item.quality !== "Basic" ? ` [${item.quality}]` : "";
  return `T${item.tier} ${item.rarity} ${item.name}${qualPart}`;
}

export function formatChestName(chest: ItemChest): string {
  return `T${chest.tier} ${chest.rarity} Chest`;
}

// ─── Item Chest ───────────────────────────────────────────────────────────────

export interface ItemChest {
  id: string;
  rarity: ItemRarity;
  tier: ItemTier;
  tradable: boolean;
}

export const CHEST_RARITY_ICONS: Record<ItemRarity, string> = {
  Common: "📦", Uncommon: "📦", Rare: "📦", Epic: "📦",
  Elite: "📦", Legendary: "📦", Superior: "📦", Cosmic: "📦",
};

// ─── Drop Tables ──────────────────────────────────────────────────────────────

// [monster rarity][monster tier 0..3] → item rarity weights [Common..Cosmic]
const ITEM_DROP_TABLE: Record<ItemRarity, number[][]> = {
  Common:    [[64.39,21,10,3,1,0.4,0.2,0.1],[60.36,22,12,3.6,1.2,0.48,0.24,0.12],[56.42,23,14,4.2,1.4,0.56,0.28,0.14],[52.48,24,16,4.8,1.6,0.64,0.32,0.16]],
  Uncommon:  [[42.28,28,16,8,3.5,1.5,0.7,0.02],[34.336,30,19.2,9.6,4.2,1.8,0.84,0.024],[26.392,32,22.4,11.2,4.9,2.1,0.98,0.028],[18.448,34,25.6,12.8,5.6,2.4,1.12,0.032]],
  Rare:      [[22.05,22,28,16,7,3,1.9,0.05],[18.46,17,31,19.2,8.4,3.6,2.28,0.06],[13.87,13,34,22.4,9.8,4.2,2.66,0.07],[9.28,9,37,25.6,11.2,4.8,3.04,0.08]],
  Epic:      [[10,12,22,30,16,7,2.9,0.1],[8.4,8,23,32,17,8,3.48,0.12],[5.8,5,24,34,18,9,4.06,0.14],[3.2,2,25,36,19,10,4.64,0.16]],
  Elite:     [[6.1,7,12,22,30,18,4.7,0.2],[5.62,6,11.5,20,32,19,5.64,0.24],[5.14,5,11,18,34,20,6.58,0.28],[4.66,4,10.5,16,36,21,7.52,0.32]],
  Legendary: [[1,1.5,9,15,25.1,32.4,15,1],[0,0,8,15,25.6,34.2,16,1.2],[0,0,6.1,13.5,26,36,17,1.4],[0,0,2.9,13,26.5,38,18,1.6]],
  Superior:  [[0,0,1,10,16,28,41,4],[0,0,0,8.2,14,29,44,4.8],[0,0,0,5.4,12,30,47,5.6],[0,0,0,2.6,10,31,50,6.4]],
  Cosmic:    [[0,0,0,1,9.8,25,54.2,10],[0,0,0,0,7.5,23.5,57,12],[0,0,0,0,4,22,60,14],[0,0,0,0,0.5,20.5,63,16]],
};

// monster tier → item tier weights [T0, T1, T2, T3]
const ITEM_TIER_DROP_WEIGHTS: number[][] = [
  [90, 6, 3, 1],
  [50, 40, 6, 4],
  [30, 40, 21, 9],
  [15, 30, 40, 15],
];

const ITEM_QUALITY_WEIGHTS = [65, 25, 10];

// ─── Roll Helpers ─────────────────────────────────────────────────────────────

function rollFromWeights<T>(items: readonly T[], weights: readonly number[]): T {
  const total = (weights as number[]).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function rollItemQuality(): ItemQuality {
  return rollFromWeights(ITEM_QUALITIES, ITEM_QUALITY_WEIGHTS);
}

export function rollItemTier(monsterTier: ItemTier): ItemTier {
  return rollFromWeights([0, 1, 2, 3] as const, ITEM_TIER_DROP_WEIGHTS[monsterTier]);
}

export function rollItemRarityFromMonster(monsterRarity: ItemRarity, monsterTier: ItemTier): ItemRarity {
  return rollFromWeights(ITEM_RARITIES, ITEM_DROP_TABLE[monsterRarity][monsterTier]);
}

export function rollItemDropFromMonster(monsterRarity: ItemRarity, monsterTier: ItemTier): GameItem {
  const itemRarity = rollItemRarityFromMonster(monsterRarity, monsterTier);
  const itemTier   = rollItemTier(monsterTier);
  const quality    = rollItemQuality();
  const slot       = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)];
  return generateItem(slot, itemRarity, itemTier, quality);
}

export function rollChestFromMonster(monsterRarity: ItemRarity, monsterTier: ItemTier): ItemChest {
  let rarity = monsterRarity;
  let tier   = monsterTier;
  if (Math.random() < 0.01) {
    const idx = ITEM_RARITIES.indexOf(rarity);
    if (idx < ITEM_RARITIES.length - 1) {
      rarity = ITEM_RARITIES[idx + 1];
      if (monsterTier === 3) tier = 0;
    }
  }
  return { id: `chest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, rarity, tier, tradable: true };
}

export function rollExplorationChest(rarity: ItemRarity): ItemChest {
  return { id: `chest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, rarity, tier: 0, tradable: true };
}

export function openChest(chest: ItemChest): GameItem {
  const itemRarity = rollItemRarityFromMonster(chest.rarity, chest.tier);
  const itemTier   = rollItemTier(chest.tier);
  const quality    = rollItemQuality();
  const slot       = ITEM_SLOTS[Math.floor(Math.random() * ITEM_SLOTS.length)];
  return generateItem(slot, itemRarity, itemTier, quality);
}
