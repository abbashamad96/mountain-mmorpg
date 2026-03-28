import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { EventResult } from "./GameContext";

export interface RemotePlayer {
  id: string;
  name: string;
  level: number;
  stats: {
    strength: number;
    health: number;
    defence: number;
    speed: number;
  };
}

export interface BattleResult {
  won: boolean;
  opponentName: string;
  opponentLevel: number;
  log: string[];
  hpRemaining: number;
}

export interface IncomingChallenge {
  fromId: string;
  fromName: string;
  fromLevel: number;
  fromStats: RemotePlayer["stats"];
}

export interface CoOpEvent {
  event: EventResult;
  triggeredBy: string;
  triggeredById: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface MultiplayerContextType {
  status: ConnectionStatus;
  roomCode: string | null;
  yourId: string | null;
  players: RemotePlayer[];
  playerName: string;
  setPlayerName: (name: string) => void;
  joinRoom: (
    roomCode: string | null,
    level: number,
    stats: RemotePlayer["stats"]
  ) => void;
  leaveRoom: () => void;
  broadcastCoOpEvent: (event: EventResult) => void;
  challengePlayer: (targetId: string) => void;
  acceptBattle: (challengerId: string) => void;
  declineBattle: (challengerId: string) => void;
  syncStats: (level: number, stats: RemotePlayer["stats"]) => void;
  incomingChallenge: IncomingChallenge | null;
  clearIncomingChallenge: () => void;
  lastBattleResult: BattleResult | null;
  clearBattleResult: () => void;
  lastCoOpEvent: CoOpEvent | null;
  clearCoOpEvent: () => void;
  coOpLog: CoOpEvent[];
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

const NAME_KEY = "@mountain_player_name";

export function MultiplayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [yourId, setYourId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  const [playerName, setPlayerNameState] = useState("Wanderer");
  const [incomingChallenge, setIncomingChallenge] =
    useState<IncomingChallenge | null>(null);
  const [lastBattleResult, setLastBattleResult] =
    useState<BattleResult | null>(null);
  const [lastCoOpEvent, setLastCoOpEvent] = useState<CoOpEvent | null>(null);
  const [coOpLog, setCoOpLog] = useState<CoOpEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingJoin = useRef<{
    roomCode: string | null;
    level: number;
    stats: RemotePlayer["stats"];
  } | null>(null);
  const nameRef = useRef(playerName);
  nameRef.current = playerName;

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((name) => {
      if (name) setPlayerNameState(name);
    });
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    nameRef.current = name;
    AsyncStorage.setItem(NAME_KEY, name);
  }, []);

  const send = useCallback((data: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;
    const url = `wss://${domain}/api/ws`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      if (pendingJoin.current) {
        const { roomCode: code, level, stats } = pendingJoin.current;
        ws.send(
          JSON.stringify({
            type: "join",
            name: nameRef.current,
            roomCode: code,
            level,
            stats,
          })
        );
        pendingJoin.current = null;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      setRoomCode(null);
      setPlayers([]);
      setYourId(null);
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus("disconnected");
    };

    ws.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }

      const { type } = msg;

      if (type === "room_joined") {
        setRoomCode(msg.roomCode);
        setYourId(msg.yourId);
        setPlayers(
          (msg.players as RemotePlayer[]).filter((p) => p.id !== msg.yourId)
        );
      } else if (type === "player_joined") {
        setPlayers((prev) => {
          if (prev.find((p) => p.id === msg.player.id)) return prev;
          return [...prev, msg.player];
        });
      } else if (type === "player_left") {
        setPlayers((prev) => prev.filter((p) => p.id !== msg.playerId));
      } else if (type === "player_updated") {
        setPlayers((prev) =>
          prev.map((p) => (p.id === msg.player.id ? { ...p, ...msg.player } : p))
        );
      } else if (type === "co_op_event") {
        const coOpEv: CoOpEvent = {
          event: msg.event,
          triggeredBy: msg.triggeredBy,
          triggeredById: msg.triggeredById,
        };
        setLastCoOpEvent(coOpEv);
        setCoOpLog((prev) => [coOpEv, ...prev].slice(0, 30));
      } else if (type === "battle_challenge") {
        setIncomingChallenge({
          fromId: msg.fromId,
          fromName: msg.fromName,
          fromLevel: msg.fromLevel,
          fromStats: msg.fromStats,
        });
      } else if (type === "battle_result") {
        setLastBattleResult({
          won: msg.won,
          opponentName: msg.opponentName,
          opponentLevel: msg.opponentLevel,
          log: msg.log,
          hpRemaining: msg.hpRemaining,
        });
        setIncomingChallenge(null);
      } else if (type === "battle_declined") {
        setLastBattleResult({
          won: false,
          opponentName: msg.byName,
          opponentLevel: 0,
          log: [`${msg.byName} declined the challenge.`],
          hpRemaining: 0,
        });
      }
    };
  }, []);

  const joinRoom = useCallback(
    (
      code: string | null,
      level: number,
      stats: RemotePlayer["stats"]
    ) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        pendingJoin.current = { roomCode: code, level, stats };
        connect();
      } else {
        ws.send(
          JSON.stringify({
            type: "join",
            name: nameRef.current,
            roomCode: code,
            level,
            stats,
          })
        );
      }
    },
    [connect]
  );

  const leaveRoom = useCallback(() => {
    wsRef.current?.close();
    setRoomCode(null);
    setPlayers([]);
    setYourId(null);
    setStatus("disconnected");
  }, []);

  const broadcastCoOpEvent = useCallback(
    (event: EventResult) => {
      send({ type: "co_op_event", event });
    },
    [send]
  );

  const challengePlayer = useCallback(
    (targetId: string) => {
      send({ type: "challenge", targetId });
    },
    [send]
  );

  const acceptBattle = useCallback(
    (challengerId: string) => {
      send({ type: "accept_battle", challengerId });
    },
    [send]
  );

  const declineBattle = useCallback(
    (challengerId: string) => {
      send({ type: "decline_battle", challengerId });
      setIncomingChallenge(null);
    },
    [send]
  );

  const syncStats = useCallback(
    (level: number, stats: RemotePlayer["stats"]) => {
      send({ type: "sync_stats", level, stats });
    },
    [send]
  );

  return (
    <MultiplayerContext.Provider
      value={{
        status,
        roomCode,
        yourId,
        players,
        playerName,
        setPlayerName,
        joinRoom,
        leaveRoom,
        broadcastCoOpEvent,
        challengePlayer,
        acceptBattle,
        declineBattle,
        syncStats,
        incomingChallenge,
        clearIncomingChallenge: () => setIncomingChallenge(null),
        lastBattleResult,
        clearBattleResult: () => setLastBattleResult(null),
        lastCoOpEvent,
        clearCoOpEvent: () => setLastCoOpEvent(null),
        coOpLog,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer(): MultiplayerContextType {
  const ctx = useContext(MultiplayerContext);
  if (!ctx)
    throw new Error("useMultiplayer must be used within MultiplayerProvider");
  return ctx;
}
