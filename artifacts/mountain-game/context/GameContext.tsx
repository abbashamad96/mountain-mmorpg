import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  GameItem, ItemSlot, ItemStatBlock, ItemChest, ItemTier,
  sumItemStats, sumPercentStats,
  rollItemDropFromMonster, rollChestFromMonster, rollExplorationChest,
} from "@/lib/items";

export type { GameItem, ItemSlot, ItemStatBlock, ItemChest };

// ─── Types ───────────────────────────────────────────────────────────────────

export type MaterialType = "Ore" | "Wood" | "Herb" | "Leather";
export type RarityName =
  | "Common" | "Uncommon" | "Rare" | "Epic"
  | "Elite" | "Legendary" | "Superior" | "Cosmic";
export type VersionNum = 0 | 1 | 2 | 3;
export type SceneType =
  | "default" | "storm" | "treasure" | "combat"
  | "ruins" | "forest" | "snow" | "dungeon" | "volcanic" | "night";

export const RARITIES: RarityName[] = [
  "Common", "Uncommon", "Rare", "Epic",
  "Elite", "Legendary", "Superior", "Cosmic",
];

export const RARITY_COLORS: Record<RarityName, string> = {
  Common: "#9CA3AF",
  Uncommon: "#22C55E",
  Rare: "#3B82F6",
  Epic: "#A855F7",
  Elite: "#EF4444",
  Legendary: "#F59E0B",
  Superior: "#06B6D4",
  Cosmic: "#06B6D4",
};

export const VERSION_PARTICLE_COLORS: Record<VersionNum, string> = {
  0: "transparent",
  1: "#22C55E",
  2: "#3B82F6",
  3: "#A855F7",
};

export interface CharacterStats {
  strength: number;
  health: number;
  defence: number;
  speed: number;
}

export interface Material {
  type: MaterialType;
  rarity: RarityName;
  version: VersionNum;
}

export interface MaterialEntry {
  key: string;
  material: Material;
  count: number;
}

export interface NpcBattleStats {
  rarity: RarityName;
  version: VersionNum;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  goldReward: number;
  xpReward: number;
}

export type EventType = "gold_xp" | "gather" | "battle" | "item_chest";

export interface EventRoll {
  id: string;
  type: EventType;
  timestamp: number;
  sceneType: SceneType;
  // gold_xp fields
  goldGained: number;
  xpGained: number;
  levelsBefore: number;
  levelsAfter: number;
  statPointsGained: number;
  // gather fields
  material: Material | null;
  gatherAttempts: number;
  // battle fields
  npc: NpcBattleStats | null;
  // chest / item drop fields
  chest: ItemChest | null;
  itemDrop: GameItem | null;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: EventType;
  summary: string;
  goldGained: number;
  xpGained: number;
  material: Material | null;
  dropCount?: number;
  victory?: boolean;
  npcRarity?: RarityName;
  npcVersion?: VersionNum;
  chest?: ItemChest;
  itemDrop?: GameItem;
}

export interface Character {
  level: number;
  xp: number;
  xpToNext: number;
  stats: CharacterStats;
  gold: number;
  pendingStatPoints: number;
  materials: MaterialEntry[];
  equippedItems: Partial<Record<ItemSlot, GameItem>>;
  itemBag: GameItem[];
  chestBag: ItemChest[];
}

export function getEffectiveStats(char: Character): CharacterStats {
  const flat = sumItemStats(char.equippedItems);
  const pct  = sumPercentStats(char.equippedItems);
  const base: CharacterStats = {
    strength: char.stats.strength + flat.strength,
    health:   char.stats.health   + flat.health,
    defence:  char.stats.defence  + flat.defence,
    speed:    char.stats.speed    + flat.speed,
  };
  return {
    strength: base.strength * (1 + pct.strength),
    health:   base.health   * (1 + pct.health),
    defence:  base.defence  * (1 + pct.defence),
    speed:    base.speed    * (1 + pct.speed),
  };
}

export interface GameState {
  character: Character;
  currentScene: SceneType;
  eventLog: LogEntry[];
  totalEvents: number;
}

// ─── XP Formula ──────────────────────────────────────────────────────────────

export function calcXpToNext(level: number): number {
  return 987 + level * 223;
}

// ─── Rarity Rolls ────────────────────────────────────────────────────────────

const RARITY_WEIGHTS = [60, 25, 10, 5.9, 2.9, 0.98, 0.2, 0.02];
const RARITY_TOTAL = RARITY_WEIGHTS.reduce((a, b) => a + b, 0);

export function rollRarity(): RarityName {
  let r = Math.random() * RARITY_TOTAL;
  for (let i = 0; i < RARITIES.length; i++) {
    r -= RARITY_WEIGHTS[i];
    if (r <= 0) return RARITIES[i];
  }
  return "Common";
}

export function rollVersion(): VersionNum {
  const r = Math.random() * 100;
  if (r < 1) return 3;
  if (r < 6) return 2;
  if (r < 16) return 1;
  return 0;
}

// ─── NPC Data ────────────────────────────────────────────────────────────────

const NPC_NAMES: Record<RarityName, string[]> = {
  Common: ["Mountain Rat", "Stray Wolf", "Cave Bat"],
  Uncommon: ["Stone Golem", "Forest Imp", "Bog Troll"],
  Rare: ["Ice Serpent", "Dark Archer", "Iron Bandit"],
  Epic: ["Shadow Knight", "Ancient Drake", "Plague Wraith"],
  Elite: ["Void Walker", "Bone Titan", "Storm Colossus"],
  Legendary: ["Chaos Leviathan", "Death Oracle", "Abyssal Warlord"],
  Superior: ["Abyss Sovereign", "Celestial Demon", "World Eater"],
  Cosmic: ["Primordial God", "Infinite Lich", "Void Emperor"],
};

// Monster stat total = base * tier * level * weakness
// Base: T0 Common = 0.7, +0.1 per rarity step
// Tier: T0=1.0, T1=1.1, T2=1.2, T3=1.35
// HP stat counts as 5 HP per point
const NPC_GOLD_BASE = [3, 8, 20, 50, 120, 300, 650, 1500];
const NPC_GOLD_RANGE = [5, 12, 30, 70, 180, 420, 950, 2000];
const NPC_XP_PCT = [1.2, 2.8, 5, 8, 13, 20, 30, 45];

function randomSplit3(total: number): [number, number, number] {
  const a = Math.random() * total;
  const b = Math.random() * (total - a);
  const c = total - a - b;
  return [a, b, c];
}

export function buildNpcBattle(xpToNextVal: number, playerLevel: number = 1): NpcBattleStats {
  const rarity = rollRarity();
  const version = rollVersion();
  const idx = RARITIES.indexOf(rarity);
  const level = Math.max(1, playerLevel + 1);

  const baseMultiplier = 0.7 + idx * 0.1;
  const tierMultiplier = [1.0, 1.1, 1.2, 1.35][version];
  const totalPool = Math.max(3, baseMultiplier * tierMultiplier * level);

  const [randHP, randStr, randSpd] = randomSplit3(totalPool);

  const hpStat = Math.max(2, Math.floor(randHP));
  const atk   = Math.max(2, Math.floor(randStr));
  const spd   = Math.max(5, Math.floor(randSpd));
  const def   = 0;

  // HP stat is 5 HP per point
  const maxHp = hpStat * 5;

  const vm = version === 3 ? 2 : version === 2 ? 1.5 : version === 1 ? 1.2 : 1;
  const names = NPC_NAMES[rarity];
  const name = names[Math.floor(Math.random() * names.length)];
  const goldReward = Math.floor((NPC_GOLD_BASE[idx] + Math.random() * NPC_GOLD_RANGE[idx]) * vm * Math.max(1, level * 0.1));
  const xpPct = NPC_XP_PCT[idx] * (0.8 + Math.random() * 0.4) * vm;
  const xpReward = Math.max(1, Math.floor((xpToNextVal * xpPct) / 100));

  return { rarity, version, name, hp: maxHp, maxHp, atk, def, spd, goldReward, xpReward };
}

// ─── Battle Material Drop ─────────────────────────────────────────────────────

const MATERIAL_TYPES_DROP: MaterialType[] = ["Ore", "Wood", "Herb", "Leather"];

// How many items drop per rarity [min, max]
const DROP_COUNT_RANGE: Record<RarityName, [number, number]> = {
  Common:    [1, 1],
  Uncommon:  [1, 1],
  Rare:      [1, 1],
  Epic:      [1, 1],
  Elite:     [1, 1],
  Legendary: [1, 1],
  Superior:  [1, 1],
  Cosmic:    [1, 1],
};

export type NpcDropResult =
  | null
  | { type: "material"; material: Material; count: number }
  | { type: "item";    item: GameItem }
  | { type: "chest";  chest: ItemChest };

export function rollNpcDrop(npc: NpcBattleStats): NpcDropResult {
  const r = Math.random() * 100;
  const materialChance = npc.version === 3 ? 45 : 40;

  if (r < 10) {
    // 10% equipment item drop
    const item = rollItemDropFromMonster(npc.rarity, npc.version as ItemTier);
    return { type: "item", item };
  }

  if (r < 11) {
    // 1% chest drop — goes to bag via ChestDropModal
    const chest = rollChestFromMonster(npc.rarity, npc.version as ItemTier);
    return { type: "chest", chest };
  }

  if (r < 11 + materialChance) {
    // material drop
    const matType = MATERIAL_TYPES_DROP[Math.floor(Math.random() * MATERIAL_TYPES_DROP.length)];
    const rarity = npc.rarity;
    let version = npc.version as VersionNum;
    if (version < 3 && Math.random() * 100 < 4) version = (version + 1) as VersionNum;
    const [min, max] = DROP_COUNT_RANGE[rarity] ?? [1, 1];
    const count = min + Math.floor(Math.random() * (max - min + 1));
    return { type: "material", material: { type: matType, rarity, version }, count };
  }

  return null;
}

// ─── Material Helpers ────────────────────────────────────────────────────────

function materialKey(m: Material): string {
  return `${m.type}|${m.rarity}|${m.version}`;
}

export function addMaterialToList(materials: MaterialEntry[], mat: Material): MaterialEntry[] {
  const key = materialKey(mat);
  const idx = materials.findIndex((e) => e.key === key);
  if (idx >= 0) {
    const next = [...materials];
    next[idx] = { ...next[idx], count: next[idx].count + 1 };
    return next;
  }
  return [...materials, { key, material: mat, count: 1 }];
}

// ─── XP / Level Apply ────────────────────────────────────────────────────────

interface ApplyResult {
  updatedChar: Character;
  levelsGained: number;
  statPointsGained: number;
}

export function applyXpGold(
  char: Character,
  xp: number,
  gold: number
): ApplyResult {
  let newXp = char.xp + xp;
  let newLevel = char.level;
  let newXpToNext = char.xpToNext;
  const newStats = { ...char.stats };
  let newPending = char.pendingStatPoints;
  const levelsBefore = char.level;

  while (newXp >= newXpToNext) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = calcXpToNext(newLevel);
    newPending++;
    newStats.health += 0.1;
    newStats.strength += 0.25;
    newStats.speed += 0.1;
  }

  return {
    updatedChar: {
      ...char,
      level: newLevel,
      xp: newXp,
      xpToNext: newXpToNext,
      stats: newStats,
      gold: char.gold + gold,
      pendingStatPoints: newPending,
    },
    levelsGained: newLevel - levelsBefore,
    statPointsGained: newPending - char.pendingStatPoints,
  };
}

// ─── Event Roll ───────────────────────────────────────────────────────────────

const GOLD_XP_SCENES: SceneType[] = ["default", "treasure", "ruins", "night"];
const GATHER_SCENES: SceneType[] = ["forest", "snow", "default"];
const BATTLE_SCENES: SceneType[] = ["combat", "dungeon", "volcanic"];
const MATERIAL_TYPES: MaterialType[] = ["Ore", "Wood", "Herb", "Leather"];

export function rollEvent(char: Character): EventRoll {
  // Single exclusive event roll: 60% gold_xp, 25% gather, 10% battle, 5% item_chest
  const r = Math.random() * 100;
  let type: EventType;
  if (r < 60) type = "gold_xp";
  else if (r < 85) type = "gather";
  else if (r < 95) type = "battle";
  else type = "item_chest";

  const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const ts = Date.now();
  const levelsBefore = char.level;

  if (type === "gold_xp") {
    let gold = 0, xp = 0;
    if (Math.random() < 0.6) {
      const minG = Math.floor(Math.random() * 100);
      const lvlG = Math.floor(char.level * 0.25 + Math.random() * Math.max(0, char.level * 0.25));
      gold = Math.max(minG, lvlG);
    }
    if (Math.random() < 0.6) {
      const pct = 3.5 + Math.random() * 2.5;
      xp = Math.max(1, Math.floor((char.xpToNext * pct) / 100));
    }
    const scene = GOLD_XP_SCENES[Math.floor(Math.random() * GOLD_XP_SCENES.length)];
    return {
      id, type, timestamp: ts, sceneType: scene,
      goldGained: gold, xpGained: xp,
      levelsBefore, levelsAfter: levelsBefore, statPointsGained: 0,
      material: null, gatherAttempts: 0, npc: null, chest: null, itemDrop: null,
    };
  }

  if (type === "gather") {
    const mat: Material = {
      type: MATERIAL_TYPES[Math.floor(Math.random() * 4)],
      rarity: rollRarity(),
      version: rollVersion(),
    };
    const attempts = 1 + Math.floor(Math.random() * 3);
    const scene = GATHER_SCENES[Math.floor(Math.random() * GATHER_SCENES.length)];
    return {
      id, type, timestamp: ts, sceneType: scene,
      goldGained: 0, xpGained: 0,
      levelsBefore, levelsAfter: levelsBefore, statPointsGained: 0,
      material: mat, gatherAttempts: attempts, npc: null, chest: null, itemDrop: null,
    };
  }

  if (type === "item_chest") {
    const chest = rollExplorationChest(rollRarity());
    const scene = GOLD_XP_SCENES[Math.floor(Math.random() * GOLD_XP_SCENES.length)];
    return {
      id, type, timestamp: ts, sceneType: scene,
      goldGained: 0, xpGained: 0,
      levelsBefore, levelsAfter: levelsBefore, statPointsGained: 0,
      material: null, gatherAttempts: 0, npc: null, chest, itemDrop: null,
    };
  }

  // battle
  const npc = buildNpcBattle(char.xpToNext, char.level);
  const scene = BATTLE_SCENES[Math.floor(Math.random() * BATTLE_SCENES.length)];
  return {
    id, type, timestamp: ts, sceneType: scene,
    goldGained: 0, xpGained: 0,
    levelsBefore, levelsAfter: levelsBefore, statPointsGained: 0,
    material: null, gatherAttempts: 0, npc, chest: null, itemDrop: null,
  };
}

// ─── Default State ────────────────────────────────────────────────────────────

const defaultCharacter: Character = {
  level: 0,
  xp: 0,
  xpToNext: 987,
  stats: { strength: 5, health: 1, defence: 1, speed: 5 },
  gold: 0,
  pendingStatPoints: 0,
  materials: [],
  equippedItems: {},
  itemBag: [],
  chestBag: [],
};

const defaultGameState: GameState = {
  character: defaultCharacter,
  currentScene: "default",
  eventLog: [],
  totalEvents: 0,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@mountain_game_v3";

interface GameContextType {
  gameState: GameState;
  setScene: (scene: SceneType) => void;
  applyGoldXp: (gold: number, xp: number) => ApplyResult;
  addMaterials: (mats: Material[]) => void;
  addMaterialCount: (material: Material, count: number) => void;
  removeMaterial: (key: string, count: number) => void;
  allocateStat: (stat: keyof CharacterStats) => void;
  addLogEntry: (entry: LogEntry) => void;
  incrementEvents: () => void;
  loadState: (state: Partial<GameState>) => void;
  resetGameState: () => void;
  equipItem: (item: GameItem) => void;
  unequipItem: (slot: ItemSlot) => void;
  addItemToBag: (item: GameItem) => void;
  removeItemFromBag: (id: string) => void;
  addChestToBag: (chest: ItemChest) => void;
  removeChestFromBag: (id: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const stateRef = useRef(gameState);
  const didLoadRef = useRef(false);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      didLoadRef.current = true;
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as GameState;
        const char: Character = {
          ...defaultCharacter,
          ...saved.character,
          stats: { ...defaultCharacter.stats, ...saved.character?.stats },
          materials: saved.character?.materials ?? [],
          equippedItems: saved.character?.equippedItems ?? {},
          itemBag: saved.character?.itemBag ?? [],
          chestBag: saved.character?.chestBag ?? [],
        };
        setGameState({ ...defaultGameState, ...saved, character: char });
      } catch {
        // Corrupt data — still mark as loaded so saves proceed
      }
    });
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const setScene = useCallback((scene: SceneType) => {
    setGameState((prev) => ({ ...prev, currentScene: scene }));
  }, []);

  const applyGoldXp = useCallback((gold: number, xp: number): ApplyResult => {
    const result = applyXpGold(stateRef.current.character, xp, gold);
    setGameState((prev) => {
      const next = { ...prev, character: result.updatedChar };
      stateRef.current = next;
      return next;
    });
    return result;
  }, []);

  const addMaterials = useCallback((mats: Material[]) => {
    setGameState((prev) => {
      let materials = prev.character.materials;
      for (const m of mats) materials = addMaterialToList(materials, m);
      return { ...prev, character: { ...prev.character, materials } };
    });
  }, []);

  const addMaterialCount = useCallback((material: Material, count: number) => {
    if (count <= 0) return;
    setGameState((prev) => {
      const key = materialKey(material);
      const materials = [...prev.character.materials];
      const idx = materials.findIndex((e) => e.key === key);
      if (idx >= 0) {
        materials[idx] = { ...materials[idx], count: materials[idx].count + count };
      } else {
        materials.push({ key, material, count });
      }
      return { ...prev, character: { ...prev.character, materials } };
    });
  }, []);

  const removeMaterial = useCallback((key: string, count: number) => {
    setGameState((prev) => {
      const materials = prev.character.materials
        .map((e) => e.key === key ? { ...e, count: e.count - count } : e)
        .filter((e) => e.count > 0);
      return { ...prev, character: { ...prev.character, materials } };
    });
  }, []);

  const allocateStat = useCallback((stat: keyof CharacterStats) => {
    setGameState((prev) => {
      if (prev.character.pendingStatPoints <= 0) return prev;
      const newStats = { ...prev.character.stats };
      newStats[stat] += 1;
      return {
        ...prev,
        character: { ...prev.character, stats: newStats, pendingStatPoints: prev.character.pendingStatPoints - 1 },
      };
    });
  }, []);

  const equipItem = useCallback((item: GameItem) => {
    setGameState((prev) => {
      const oldEquipped = prev.character.equippedItems[item.slot];
      const newEquipped = { ...prev.character.equippedItems, [item.slot]: item };
      // If something was already in the slot, move it to bag
      let newBag = prev.character.itemBag.filter((i) => i.id !== item.id);
      if (oldEquipped) newBag = [...newBag, oldEquipped];
      return { ...prev, character: { ...prev.character, equippedItems: newEquipped, itemBag: newBag } };
    });
  }, []);

  const unequipItem = useCallback((slot: ItemSlot) => {
    setGameState((prev) => {
      const item = prev.character.equippedItems[slot];
      if (!item) return prev;
      const newEquipped = { ...prev.character.equippedItems };
      delete newEquipped[slot];
      return {
        ...prev,
        character: { ...prev.character, equippedItems: newEquipped, itemBag: [...prev.character.itemBag, item] },
      };
    });
  }, []);

  const addItemToBag = useCallback((item: GameItem) => {
    setGameState((prev) => ({
      ...prev,
      character: { ...prev.character, itemBag: [...prev.character.itemBag, item] },
    }));
  }, []);

  const removeItemFromBag = useCallback((id: string) => {
    setGameState((prev) => ({
      ...prev,
      character: { ...prev.character, itemBag: prev.character.itemBag.filter((i) => i.id !== id) },
    }));
  }, []);

  const addChestToBag = useCallback((chest: ItemChest) => {
    setGameState((prev) => ({
      ...prev,
      character: { ...prev.character, chestBag: [...prev.character.chestBag, chest] },
    }));
  }, []);

  const removeChestFromBag = useCallback((id: string) => {
    setGameState((prev) => ({
      ...prev,
      character: { ...prev.character, chestBag: prev.character.chestBag.filter((c) => c.id !== id) },
    }));
  }, []);

  const addLogEntry = useCallback((entry: LogEntry) => {
    setGameState((prev) => ({
      ...prev,
      eventLog: [entry, ...prev.eventLog].slice(0, 40),
    }));
  }, []);

  const incrementEvents = useCallback(() => {
    setGameState((prev) => ({ ...prev, totalEvents: prev.totalEvents + 1 }));
  }, []);

  const loadState = useCallback((state: Partial<GameState>) => {
    if (!state) return;
    const saved = state as GameState;
    const char: Character = {
      ...defaultCharacter,
      ...saved.character,
      stats: { ...defaultCharacter.stats, ...saved.character?.stats },
      materials: saved.character?.materials ?? [],
      equippedItems: saved.character?.equippedItems ?? {},
      itemBag: saved.character?.itemBag ?? [],
      chestBag: saved.character?.chestBag ?? [],
    };
    didLoadRef.current = true;
    setGameState({ ...defaultGameState, ...saved, character: char });
  }, []);

  const resetGameState = useCallback(() => {
    didLoadRef.current = true;
    setGameState(defaultGameState);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <GameContext.Provider
      value={{ gameState, setScene, applyGoldXp, addMaterials, addMaterialCount, removeMaterial, allocateStat, addLogEntry, incrementEvents, loadState, resetGameState, equipItem, unequipItem, addItemToBag, removeItemFromBag, addChestToBag, removeChestFromBag }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
