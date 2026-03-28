import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Material } from "./GameContext";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  ts: number;
  type: "chat" | "system";
}

export interface AuctionListing {
  id: string;
  sellerId: string;
  sellerName: string;
  material: Material;
  count: number;
  price: number;
  ts: number;
}

export interface IncomingChallenge {
  fromId: string;
  fromName: string;
  fromLevel: number;
  fromStats: { strength: number; health: number; defence: number; speed: number };
  ts: number;
}

export type AhEventType = "bought" | "sale" | "cancelled";
export interface AhEvent {
  id: string;
  kind: AhEventType;
  listing: AuctionListing;
  buyerName?: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface MultiplayerContextType {
  status: ConnectionStatus;
  yourId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  messages: ChatMessage[];
  sendChat: (text: string) => void;
  // Auction House
  listings: AuctionListing[];
  listAhItem: (material: Material, count: number, price: number) => void;
  buyAhItem: (listingId: string) => void;
  cancelAhListing: (listingId: string) => void;
  refreshListings: () => void;
  // AH events queue (consume + clear)
  ahEvents: AhEvent[];
  consumeAhEvent: (id: string) => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

const NAME_KEY = "@mountain_player_name";

export function MultiplayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [yourId, setYourId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState("Wanderer");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [ahEvents, setAhEvents] = useState<AhEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(playerName);
  nameRef.current = playerName;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((saved) => {
      if (saved) {
        setPlayerNameState(saved);
        nameRef.current = saved;
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain || wsRef.current) return;

    setStatus("connecting");
    const ws = new WebSocket(`wss://${domain}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      ws.send(JSON.stringify({ type: "join", name: nameRef.current }));
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      let msg: any;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "joined") {
        setYourId(msg.yourId);
      } else if (msg.type === "chat" || msg.type === "system") {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            senderId: msg.senderId ?? "system",
            senderName: msg.senderName ?? "",
            text: msg.text,
            ts: msg.ts,
            type: msg.type,
          },
        ].slice(-200));
      } else if (msg.type === "ah_update") {
        setListings(msg.listings ?? []);
      } else if (msg.type === "ah_bought" && msg.listing) {
        const ev: AhEvent = {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "bought",
          listing: msg.listing,
        };
        setAhEvents((prev) => [...prev, ev]);
      } else if (msg.type === "ah_sale" && msg.listing) {
        const ev: AhEvent = {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "sale",
          listing: msg.listing,
          buyerName: msg.buyerName,
        };
        setAhEvents((prev) => [...prev, ev]);
      } else if (msg.type === "ah_cancelled" && msg.listing) {
        const ev: AhEvent = {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "cancelled",
          listing: msg.listing,
        };
        setAhEvents((prev) => [...prev, ev]);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const setPlayerName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 20) || "Wanderer";
      setPlayerNameState(trimmed);
      nameRef.current = trimmed;
      AsyncStorage.setItem(NAME_KEY, trimmed);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "join", name: trimmed }));
      }
    },
    []
  );

  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "chat", text }));
    }
  }, []);

  const listAhItem = useCallback((material: Material, count: number, price: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ah_list", material, count, price }));
    }
  }, []);

  const buyAhItem = useCallback((listingId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ah_buy", listingId }));
    }
  }, []);

  const cancelAhListing = useCallback((listingId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ah_cancel", listingId }));
    }
  }, []);

  const refreshListings = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ah_get" }));
    }
  }, []);

  const consumeAhEvent = useCallback((id: string) => {
    setAhEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <MultiplayerContext.Provider
      value={{
        status,
        yourId,
        playerName,
        setPlayerName,
        messages,
        sendChat,
        listings,
        listAhItem,
        buyAhItem,
        cancelAhListing,
        refreshListings,
        ahEvents,
        consumeAhEvent,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer(): MultiplayerContextType {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error("useMultiplayer must be used within MultiplayerProvider");
  return ctx;
}
