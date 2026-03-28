import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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

export type EventType = "gold_xp" | "gather" | "battle";

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
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: EventType;
  summary: string;
  goldGained: number;
  xpGained: number;
  material: Material | null;
  victory?: boolean;
}

export interface Character {
  level: number;
  xp: number;
  xpToNext: number;
  stats: CharacterStats;
  gold: number;
  pendingStatPoints: number;
  materials: MaterialEntry[];
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

const NPC_BASE_HP = [25, 65, 130, 270, 500, 900, 1600, 3000];
const NPC_BASE_ATK = [3, 7, 14, 26, 45, 70, 110, 180];
const NPC_BASE_DEF = [0, 1, 3, 7, 14, 24, 40, 68];
const NPC_BASE_SPD = [3, 6, 10, 16, 23, 32, 45, 65];
const NPC_GOLD_BASE = [3, 12, 35, 90, 220, 520, 1100, 2800];
const NPC_GOLD_RANGE = [7, 18, 45, 110, 280, 680, 1400, 3200];
const NPC_XP_PCT = [1.2, 2.8, 5, 8, 13, 20, 30, 45];

export function buildNpcBattle(xpToNextVal: number): NpcBattleStats {
  const rarity = rollRarity();
  const version = rollVersion();
  const idx = RARITIES.indexOf(rarity);
  const vm = version === 3 ? 2 : version === 2 ? 1.5 : version === 1 ? 1.2 : 1;
  const names = NPC_NAMES[rarity];
  const name = names[Math.floor(Math.random() * names.length)];
  const maxHp = Math.floor((NPC_BASE_HP[idx] + Math.random() * NPC_BASE_HP[idx] * 0.5) * vm);
  const atk = Math.floor(NPC_BASE_ATK[idx] * (0.85 + Math.random() * 0.3) * vm);
  const def = Math.floor(NPC_BASE_DEF[idx] * vm);
  const spd = Math.floor(NPC_BASE_SPD[idx] * (0.9 + Math.random() * 0.2) * vm);
  const goldReward = Math.floor((NPC_GOLD_BASE[idx] + Math.random() * NPC_GOLD_RANGE[idx]) * vm);
  const xpPct = NPC_XP_PCT[idx] * (0.8 + Math.random() * 0.4) * vm;
  const xpReward = Math.max(1, Math.floor((xpToNextVal * xpPct) / 100));
  return { rarity, version, name, hp: maxHp, maxHp, atk, def, spd, goldReward, xpReward };
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
    if (newLevel % 2 === 0) newPending++;
    newStats.health += 1;
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
  // Single exclusive event roll: 65% gold_xp, 25% gather, 15% battle (norm'd to 105)
  const r = Math.random() * 105;
  let type: EventType;
  if (r < 65) type = "gold_xp";
  else if (r < 90) type = "gather";
  else type = "battle";

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
      material: null, gatherAttempts: 0, npc: null,
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
      material: mat, gatherAttempts: attempts, npc: null,
    };
  }

  // battle
  const npc = buildNpcBattle(char.xpToNext);
  const scene = BATTLE_SCENES[Math.floor(Math.random() * BATTLE_SCENES.length)];
  return {
    id, type, timestamp: ts, sceneType: scene,
    goldGained: 0, xpGained: 0,
    levelsBefore, levelsAfter: levelsBefore, statPointsGained: 0,
    material: null, gatherAttempts: 0, npc,
  };
}

// ─── Default State ────────────────────────────────────────────────────────────

const defaultCharacter: Character = {
  level: 0,
  xp: 0,
  xpToNext: 987,
  stats: { strength: 1, health: 10, defence: 1, speed: 1 },
  gold: 0,
  pendingStatPoints: 0,
  materials: [],
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
  allocateStat: (stat: keyof CharacterStats) => void;
  addLogEntry: (entry: LogEntry) => void;
  incrementEvents: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as GameState;
        const char: Character = {
          ...defaultCharacter,
          ...saved.character,
          stats: { ...defaultCharacter.stats, ...saved.character?.stats },
          materials: saved.character?.materials ?? [],
        };
        setGameState({ ...defaultGameState, ...saved, character: char });
      } catch {}
    });
  }, []);

  useEffect(() => {
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

  const allocateStat = useCallback((stat: keyof CharacterStats) => {
    setGameState((prev) => {
      if (prev.character.pendingStatPoints <= 0) return prev;
      const newStats = { ...prev.character.stats };
      newStats[stat] += stat === "health" ? 5 : 1;
      return {
        ...prev,
        character: { ...prev.character, stats: newStats, pendingStatPoints: prev.character.pendingStatPoints - 1 },
      };
    });
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

  return (
    <GameContext.Provider
      value={{ gameState, setScene, applyGoldXp, addMaterials, allocateStat, addLogEntry, incrementEvents }}
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
