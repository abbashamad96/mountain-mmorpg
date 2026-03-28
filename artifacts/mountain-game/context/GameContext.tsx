import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface CharacterStats {
  strength: number;
  health: number;
  defence: number;
  speed: number;
}

export interface Character {
  level: number;
  xp: number;
  xpToNext: number;
  stats: CharacterStats;
}

export interface EventResult {
  id: string;
  title: string;
  description: string;
  type: "gain" | "loss" | "neutral" | "level";
  statChanges?: Partial<CharacterStats>;
  xpGain?: number;
  timestamp: number;
}

export interface GameState {
  character: Character;
  currentScene: "default" | "storm" | "treasure" | "combat" | "ruins";
  eventLog: EventResult[];
  totalEvents: number;
}

interface GameContextType {
  gameState: GameState;
  triggerEvent: () => EventResult;
  isInteracting: boolean;
  lastEvent: EventResult | null;
}

const STORAGE_KEY = "@mountain_game_state";

const defaultCharacter: Character = {
  level: 0,
  xp: 0,
  xpToNext: 100,
  stats: {
    strength: 1,
    health: 10,
    defence: 1,
    speed: 1,
  },
};

const defaultGameState: GameState = {
  character: defaultCharacter,
  currentScene: "default",
  eventLog: [],
  totalEvents: 0,
};

function calcXpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level));
}

function clampStat(value: number, min = 1): number {
  return Math.max(min, value);
}

const MOUNTAIN_EVENTS = [
  {
    weight: 20,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Rocky Ascent",
      description:
        "You push through the jagged stones, your muscles burn and grow stronger.",
      type: "gain" as const,
      statChanges: { strength: 1 },
      xpGain: 12,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 15,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Ancient Shrine",
      description:
        "A forgotten shrine blesses you with resilience of the mountain.",
      type: "gain" as const,
      statChanges: { defence: 1 },
      xpGain: 15,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 15,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Wind Dancer",
      description:
        "The fierce summit winds teach you to move with unnatural swiftness.",
      type: "gain" as const,
      statChanges: { speed: 1 },
      xpGain: 12,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 10,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Mountain Spring",
      description:
        "Crystal clear mountain water restores your vitality and heals your wounds.",
      type: "gain" as const,
      statChanges: { health: 3 },
      xpGain: 10,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 12,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Treacherous Ledge",
      description:
        "A loose stone sends you tumbling. Your body aches from the fall.",
      type: "loss" as const,
      statChanges: { health: -2 },
      xpGain: 5,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 8,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Stone Golem Ambush",
      description:
        "A golem of living rock strikes you hard. You survive, barely.",
      type: "loss" as const,
      statChanges: { health: -3, strength: -1 },
      xpGain: 20,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 8,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Blizzard Trap",
      description:
        "A sudden blizzard saps your strength. You huddle until it passes.",
      type: "loss" as const,
      statChanges: { speed: -1 },
      xpGain: 8,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 5,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Mystic Fog",
      description:
        "Strange fog envelops you. You feel neither better nor worse, just... changed.",
      type: "neutral" as const,
      statChanges: { strength: 1, speed: -1 },
      xpGain: 6,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 4,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Supremacy Trial",
      description:
        "The mountain tests your true worth. All your stats are tempered.",
      type: "gain" as const,
      statChanges: { strength: 2, health: 2, defence: 2, speed: 2 },
      xpGain: 50,
      timestamp: Date.now(),
    }),
  },
  {
    weight: 3,
    build: (char: Character): EventResult => ({
      id: Date.now().toString(),
      title: "Ancient Forge",
      description:
        "Hidden deep in the rock, an ancient forge imbues your body with iron will.",
      type: "gain" as const,
      statChanges: { strength: 3, defence: 2 },
      xpGain: 35,
      timestamp: Date.now(),
    }),
  },
];

const SCENE_EVENTS: Record<
  GameState["currentScene"],
  GameState["currentScene"][]
> = {
  default: ["storm", "treasure", "ruins", "combat", "default"],
  storm: ["default", "combat", "default", "ruins"],
  treasure: ["default", "storm", "ruins"],
  combat: ["default", "storm", "treasure"],
  ruins: ["default", "treasure", "combat"],
};

function pickWeightedEvent(char: Character): EventResult {
  const total = MOUNTAIN_EVENTS.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * total;
  for (const event of MOUNTAIN_EVENTS) {
    rand -= event.weight;
    if (rand <= 0) {
      return event.build(char);
    }
  }
  return MOUNTAIN_EVENTS[0].build(char);
}

function pickNextScene(
  current: GameState["currentScene"]
): GameState["currentScene"] {
  const options = SCENE_EVENTS[current];
  return options[Math.floor(Math.random() * options.length)];
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [isInteracting, setIsInteracting] = useState(false);
  const [lastEvent, setLastEvent] = useState<EventResult | null>(null);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as GameState;
          setGameState(saved);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const triggerEvent = useCallback((): EventResult => {
    const state = stateRef.current;
    const event = pickWeightedEvent(state.character);

    setGameState((prev) => {
      const newStats = { ...prev.character.stats };
      if (event.statChanges) {
        for (const [key, delta] of Object.entries(event.statChanges)) {
          const stat = key as keyof CharacterStats;
          newStats[stat] = clampStat(
            (newStats[stat] ?? 0) + (delta ?? 0),
            stat === "health" ? 1 : 1
          );
        }
      }

      let newXp = prev.character.xp + (event.xpGain ?? 0);
      let newLevel = prev.character.level;
      let xpToNext = prev.character.xpToNext;

      while (newXp >= xpToNext) {
        newXp -= xpToNext;
        newLevel += 1;
        xpToNext = calcXpToNext(newLevel);
        newStats.strength += 1;
        newStats.health += 2;
        newStats.defence += 1;
        newStats.speed += 1;
      }

      const nextScene =
        Math.random() < 0.4
          ? pickNextScene(prev.currentScene)
          : prev.currentScene;

      const newState: GameState = {
        character: {
          level: newLevel,
          xp: newXp,
          xpToNext,
          stats: newStats,
        },
        currentScene: nextScene,
        eventLog: [event, ...prev.eventLog].slice(0, 20),
        totalEvents: prev.totalEvents + 1,
      };
      return newState;
    });

    setLastEvent(event);
    return event;
  }, []);

  return (
    <GameContext.Provider
      value={{ gameState, triggerEvent, isInteracting, lastEvent }}
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
