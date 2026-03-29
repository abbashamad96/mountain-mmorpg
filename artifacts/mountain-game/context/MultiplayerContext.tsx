import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Material } from "./GameContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

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
  material: Material & { version: number };
  count: number;
  price: number;
  listedAt: number;
}

export interface BuyOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  material: { type: string; rarity: string; version: number | null };
  count: number;
  filled: number;
  pricePerUnit: number;
  createdAt: number;
}

export type AhEvent =
  | { id: string; kind: "sale"; listing: AuctionListing; buyerName?: string }
  | { id: string; kind: "bought"; listing: AuctionListing }
  | { id: string; kind: "cancelled"; listing: AuctionListing }
  | { id: string; kind: "bo_sold"; boOrderId: string; boCount: number; boGoldEarned: number }
  | { id: string; kind: "bo_received"; boOrderId: string; boCount: number; boMaterial: AuctionListing["material"] }
  | { id: string; kind: "bo_cancelled"; boOrderId: string; boGoldReturn: number };

interface MultiplayerContextType {
  status: ConnectionStatus;
  yourId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  messages: ChatMessage[];
  sendChat: (text: string) => void;
  listings: AuctionListing[];
  listAhItem: (material: Material, count: number, price: number) => void;
  buyAhItem: (listingId: string) => void;
  cancelAhListing: (listingId: string) => void;
  refreshListings: () => void;
  buyOrders: BuyOrder[];
  createBuyOrder: (material: { type: string; rarity: string; version: number | null }, count: number, pricePerUnit: number) => void;
  cancelBuyOrder: (orderId: string) => void;
  fillBuyOrder: (orderId: string, count: number, version: number) => void;
  ahEvents: AhEvent[];
  consumeAhEvent: (id: string) => void;
  isAuthenticated: boolean;
  authUsername: string | null;
  authError: string | null;
  authPending: boolean;
  serverGameState: unknown | null;
  clearServerGameState: () => void;
  register: (username: string, password: string, gameState: unknown) => void;
  login: (username: string, password: string) => void;
  logout: () => void;
  saveGameState: (state: unknown) => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

const NAME_KEY = "@mountain_player_name";
const AUTH_TOKEN_KEY = "@mountain_auth_token_v1";
const AUTH_USER_KEY = "@mountain_auth_user_v1";

const GUEST_ADJ = ["Swift", "Iron", "Dark", "Stone", "Wild", "Frost", "Brave", "Shadow", "Silver", "Ember", "Ash", "Storm"];
const GUEST_NOUN = ["Walker", "Seeker", "Hunter", "Climber", "Ranger", "Scout", "Blade", "Shield", "Arrow", "Drifter", "Pilgrim", "Warden"];
function generateGuestName(): string {
  const adj = GUEST_ADJ[Math.floor(Math.random() * GUEST_ADJ.length)];
  const noun = GUEST_NOUN[Math.floor(Math.random() * GUEST_NOUN.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

// ─── Provider ───────────────────────────────────────────────────────────────────

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [yourId, setYourId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState("...");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([]);
  const [ahEvents, setAhEvents] = useState<AhEvent[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [serverGameState, setServerGameState] = useState<unknown | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(playerName);
  nameRef.current = playerName;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const authTokenRef = useRef<string | null>(null);
  const connectRef = useRef<() => void>(() => {});

  // ── Load from storage, then connect ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [savedName, savedToken] = await Promise.all([
        AsyncStorage.getItem(NAME_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);
      if (cancelled) return;

      // Resolve player name
      const usable = savedName && savedName !== "Wanderer" ? savedName : null;
      const name = usable ?? generateGuestName();
      setPlayerNameState(name);
      nameRef.current = name;
      if (!usable) AsyncStorage.setItem(NAME_KEY, name);

      // Store auth token before connecting so onopen can send it
      if (savedToken) authTokenRef.current = savedToken;

      // Now connect — token is ready
      connectRef.current();
    }
    init();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const sendWs = useCallback((data: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }, []);

  const connect = useCallback(() => {
    let domain: string | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      domain = window.location.host;
    } else {
      domain = process.env.EXPO_PUBLIC_DOMAIN;
    }
    if (!domain || wsRef.current) return;
    setStatus("connecting");
    const ws = new WebSocket(`wss://${domain}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      ws.send(JSON.stringify({ type: "join", name: nameRef.current }));
      if (authTokenRef.current) {
        ws.send(JSON.stringify({ type: "auth", token: authTokenRef.current }));
      }
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === "joined") {
        setYourId(msg.yourId);
      } else if (msg.type === "chat" || msg.type === "system") {
        setMessages((prev) => [...prev, {
          id: msg.id,
          senderId: msg.senderId ?? "system",
          senderName: msg.senderName ?? "",
          text: msg.text,
          ts: msg.ts,
          type: msg.type,
        }].slice(-200));
      } else if (msg.type === "ah_update") {
        setListings(msg.listings ?? []);
      } else if (msg.type === "bo_update") {
        setBuyOrders(msg.orders ?? []);
      } else if (msg.type === "ah_bought" && msg.listing) {
        setAhEvents((prev) => [...prev, { id: `ahev-${Date.now()}-${Math.random()}`, kind: "bought", listing: msg.listing }]);
      } else if (msg.type === "ah_sale" && msg.listing) {
        setAhEvents((prev) => [...prev, { id: `ahev-${Date.now()}-${Math.random()}`, kind: "sale", listing: msg.listing, buyerName: msg.buyerName }]);
      } else if (msg.type === "ah_cancelled" && msg.listing) {
        setAhEvents((prev) => [...prev, { id: `ahev-${Date.now()}-${Math.random()}`, kind: "cancelled", listing: msg.listing }]);
      } else if (msg.type === "bo_sold") {
        setAhEvents((prev) => [...prev, {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "bo_sold",
          boOrderId: msg.orderId,
          boCount: msg.count,
          boGoldEarned: msg.goldEarned,
        }]);
      } else if (msg.type === "bo_received") {
        setAhEvents((prev) => [...prev, {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "bo_received",
          boOrderId: msg.orderId,
          boCount: msg.count,
          boMaterial: msg.material,
        }]);
      } else if (msg.type === "bo_cancelled") {
        setAhEvents((prev) => [...prev, {
          id: `ahev-${Date.now()}-${Math.random()}`,
          kind: "bo_cancelled",
          boOrderId: msg.orderId,
          boGoldReturn: msg.goldReturn,
        }]);
      } else if (msg.type === "auth_ok") {
        setIsAuthenticated(true);
        setAuthUsername(msg.username);
        setAuthError(null);
        setAuthPending(false);
        setPlayerNameState(msg.username);
        nameRef.current = msg.username;
        AsyncStorage.setItem(AUTH_TOKEN_KEY, msg.token);
        AsyncStorage.setItem(AUTH_USER_KEY, msg.username);
        authTokenRef.current = msg.token;
        if (msg.yourId) setYourId(msg.yourId);
        if (msg.gameState) setServerGameState(msg.gameState);
      } else if (msg.type === "auth_fail") {
        setAuthError(msg.reason ?? "Authentication failed.");
        setAuthPending(false);
        // Clear bad token
        authTokenRef.current = null;
        AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(() => { if (mountedRef.current) connect(); }, 3000);
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  // Store connect in ref so init() can call it without adding it as dep
  connectRef.current = connect;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const setPlayerName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20) || "Wanderer";
    setPlayerNameState(trimmed);
    nameRef.current = trimmed;
    AsyncStorage.setItem(NAME_KEY, trimmed);
    sendWs({ type: "join", name: trimmed });
  }, [sendWs]);

  const sendChat = useCallback((text: string) => { sendWs({ type: "chat", text }); }, [sendWs]);

  const listAhItem = useCallback((material: Material, count: number, price: number) => {
    sendWs({ type: "ah_list", material, count, price });
  }, [sendWs]);

  const buyAhItem = useCallback((listingId: string) => { sendWs({ type: "ah_buy", listingId }); }, [sendWs]);
  const cancelAhListing = useCallback((listingId: string) => { sendWs({ type: "ah_cancel", listingId }); }, [sendWs]);
  const refreshListings = useCallback(() => { sendWs({ type: "ah_get" }); }, [sendWs]);

  const createBuyOrder = useCallback((material: { type: string; rarity: string; version: number | null }, count: number, pricePerUnit: number) => {
    sendWs({ type: "bo_create", material, count, pricePerUnit });
  }, [sendWs]);

  const cancelBuyOrder = useCallback((orderId: string) => { sendWs({ type: "bo_cancel", orderId }); }, [sendWs]);

  const fillBuyOrder = useCallback((orderId: string, count: number, version: number) => {
    sendWs({ type: "bo_fill", orderId, count, version });
  }, [sendWs]);

  const consumeAhEvent = useCallback((id: string) => {
    setAhEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const register = useCallback((username: string, password: string, gameState: unknown) => {
    setAuthPending(true);
    setAuthError(null);
    sendWs({ type: "register", username, password, gameState });
  }, [sendWs]);

  const login = useCallback((username: string, password: string) => {
    setAuthPending(true);
    setAuthError(null);
    sendWs({ type: "login", username, password });
  }, [sendWs]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAuthUsername(null);
    authTokenRef.current = null;
    AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    AsyncStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const saveGameState = useCallback((state: unknown) => {
    sendWs({ type: "save_state", gameState: state });
  }, [sendWs]);

  const clearServerGameState = useCallback(() => {
    setServerGameState(null);
  }, []);

  return (
    <MultiplayerContext.Provider value={{
      status, yourId, playerName, setPlayerName,
      messages, sendChat,
      listings, listAhItem, buyAhItem, cancelAhListing, refreshListings,
      buyOrders, createBuyOrder, cancelBuyOrder, fillBuyOrder,
      ahEvents, consumeAhEvent,
      isAuthenticated, authUsername, authError, authPending,
      serverGameState, clearServerGameState,
      register, login, logout, saveGameState,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer(): MultiplayerContextType {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error("useMultiplayer must be used within MultiplayerProvider");
  return ctx;
}
