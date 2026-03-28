import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MaterialType = "Ore" | "Wood" | "Herb" | "Leather";
export type RarityName =
  | "Common" | "Uncommon" | "Rare" | "Epic"
  | "Elite" | "Legendary" | "Superior" | "Cosmic";
export type VersionNum = 0 | 1 | 2 | 3;
export type SceneType = "default" | "storm" | "treasure" | "combat" | "ruins";

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
  Cosmic: "#06B6D4", // handled with animation externally
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

export interface NpcResult {
  rarity: RarityName;
  version: VersionNum;
  goldDrop: number;
  xpDrop: number;
}

export interface EventOutcome {
  id: string;
  timestamp: number;
  goldGained: number;
  xpGained: number;
  gathered: Material | null;
  npc: NpcResult | null;
  levelsBefore: number;
  levelsAfter: number;
  statPointsGained: number;
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
  eventLog: EventOutcome[];
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

// ─── NPC Drop Tables ─────────────────────────────────────────────────────────

const NPC_GOLD_BASE = [3, 12, 35, 90, 220, 520, 1100, 2800];
const NPC_GOLD_RANGE = [7, 18, 45, 110, 280, 680, 1400, 3200];
const NPC_XP_PCT = [1.2, 2.8, 5, 8, 13, 20, 30, 45];

function buildNpc(xpToNextVal: number): NpcResult {
  const rarity = rollRarity();
  const version = rollVersion();
  const idx = RARITIES.indexOf(rarity);
  const vm = version === 3 ? 2 : version === 2 ? 1.5 : version === 1 ? 1.2 : 1;
  const goldDrop = Math.floor((NPC_GOLD_BASE[idx] + Math.random() * NPC_GOLD_RANGE[idx]) * vm);
  const xpPct = NPC_XP_PCT[idx] * (0.8 + Math.random() * 0.4) * vm;
  const xpDrop = Math.max(1, Math.floor((xpToNextVal * xpPct) / 100));
  return { rarity, version, goldDrop, xpDrop };
}

// ─── Material Inventory ───────────────────────────────────────────────────────

function materialKey(m: Material): string {
  return `${m.type}|${m.rarity}|${m.version}`;
}

function addMaterial(materials: MaterialEntry[], mat: Material): MaterialEntry[] {
  const key = materialKey(mat);
  const idx = materials.findIndex((e) => e.key === key);
  if (idx >= 0) {
    const next = [...materials];
    next[idx] = { ...next[idx], count: next[idx].count + 1 };
    return next;
  }
  return [...materials, { key, material: mat, count: 1 }];
}

// ─── Event Logic ─────────────────────────────────────────────────────────────

function runEvent(
  character: Character
): { updatedChar: Character; outcome: EventOutcome } {
  const levelsBefore = character.level;
  const xpNeeded = character.xpToNext;

  let goldGained = 0;
  let xpGained = 0;
  let gathered: Material | null = null;
  let npc: NpcResult | null = null;

  // 65% → EXP / GOLD event
  if (Math.random() < 0.65) {
    if (Math.random() < 0.6) {
      const minG = Math.floor(Math.random() * 100);
      const lvlG = Math.floor(
        character.level * 0.25 + Math.random() * Math.max(0, character.level * 0.25)
      );
      goldGained += Math.max(minG, lvlG);
    }
    if (Math.random() < 0.6) {
      const pct = 3.5 + Math.random() * 2.5;
      xpGained += Math.max(1, Math.floor((xpNeeded * pct) / 100));
    }
  }

  // 25% → Gather material
  if (Math.random() < 0.25) {
    const types: MaterialType[] = ["Ore", "Wood", "Herb", "Leather"];
    gathered = {
      type: types[Math.floor(Math.random() * 4)],
      rarity: rollRarity(),
      version: rollVersion(),
    };
  }

  // 15% → NPC enemy
  if (Math.random() < 0.15) {
    npc = buildNpc(xpNeeded);
    goldGained += npc.goldDrop;
    xpGained += npc.xpDrop;
  }

  // Apply to character
  let newXp = character.xp + xpGained;
  let newLevel = character.level;
  let newXpToNext = character.xpToNext;
  const newStats = { ...character.stats };
  let newPending = character.pendingStatPoints;

  while (newXp >= newXpToNext) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = calcXpToNext(newLevel);
    if (newLevel % 2 === 0) newPending++;
    newStats.health += 1;
  }

  const statPointsGained = newPending - character.pendingStatPoints;

  const newMaterials = gathered
    ? addMaterial(character.materials, gathered)
    : character.materials;

  const updatedChar: Character = {
    level: newLevel,
    xp: newXp,
    xpToNext: newXpToNext,
    stats: newStats,
    gold: character.gold + goldGained,
    pendingStatPoints: newPending,
    materials: newMaterials,
  };

  const outcome: EventOutcome = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    goldGained,
    xpGained,
    gathered,
    npc,
    levelsBefore,
    levelsAfter: newLevel,
    statPointsGained,
  };

  return { updatedChar, outcome };
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
  triggerEvent: () => EventOutcome;
  allocateStat: (stat: keyof CharacterStats) => void;
  lastOutcome: EventOutcome | null;
}

const GameContext = createContext<GameContextType | null>(null);

const SCENES: SceneType[] = ["default", "storm", "treasure", "combat", "ruins"];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [lastOutcome, setLastOutcome] = useState<EventOutcome | null>(null);
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

  const triggerEvent = useCallback((): EventOutcome => {
    const { updatedChar, outcome } = runEvent(stateRef.current.character);
    const nextScene =
      Math.random() < 0.3
        ? SCENES[Math.floor(Math.random() * SCENES.length)]
        : stateRef.current.currentScene;

    setGameState((prev) => {
      const next = {
        ...prev,
        character: updatedChar,
        currentScene: nextScene,
        eventLog: [outcome, ...prev.eventLog].slice(0, 40),
        totalEvents: prev.totalEvents + 1,
      };
      stateRef.current = next;
      return next;
    });

    setLastOutcome(outcome);
    return outcome;
  }, []);

  const allocateStat = useCallback((stat: keyof CharacterStats) => {
    setGameState((prev) => {
      if (prev.character.pendingStatPoints <= 0) return prev;
      const newStats = { ...prev.character.stats };
      newStats[stat] += stat === "health" ? 5 : 1;
      return {
        ...prev,
        character: {
          ...prev.character,
          stats: newStats,
          pendingStatPoints: prev.character.pendingStatPoints - 1,
        },
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{ gameState, triggerEvent, allocateStat, lastOutcome }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
