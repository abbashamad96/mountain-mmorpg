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
  accountSwitched: boolean;
  consumeAccountSwitch: () => void;
  forgotPasswordSent: boolean;
  forgotPasswordError: string | null;
  register: (username: string, password: string, gameState: unknown, email: string) => void;
  login: (username: string, password: string) => void;
  logout: () => void;
  saveGameState: (state: unknown) => void;
  forgotPassword: (email: string) => Promise<void>;
  clearForgotState: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

const NAME_KEY = "@mountain_player_name";
const AUTH_TOKEN_KEY = "@mountain_auth_token_v1";
const AUTH_USER_KEY = "@mountain_auth_user_v1";

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
  const [accountSwitched, setAccountSwitched] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(playerName);
  nameRef.current = playerName;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const authTokenRef = useRef<string | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const prevAuthUsernameRef = useRef<string | null>(null);

  // ── Load from storage, then connect ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [savedName, savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(NAME_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ]);
      if (cancelled) return;

      // Track the last known authenticated user for account-switch detection
      if (savedUser) prevAuthUsernameRef.current = savedUser.toLowerCase();

      // Resolve player name
      const usable = savedName && savedName !== "Wanderer" ? savedName : null;
      const name = usable ?? "Traveler";
      setPlayerNameState(name);
      nameRef.current = name;

      if (savedToken) authTokenRef.current = savedToken;

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
        const newUserLower = msg.username.toLowerCase();
        const switched = prevAuthUsernameRef.current !== null &&
                         prevAuthUsernameRef.current !== newUserLower;
        prevAuthUsernameRef.current = newUserLower;

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

        if (switched) setAccountSwitched(true);

        // Always push server state on auth — use {} sentinel for new accounts on switch
        if (msg.gameState) {
          setServerGameState(msg.gameState);
        } else if (switched) {
          setServerGameState({}); // trigger fresh-start reset
        }
      } else if (msg.type === "auth_fail") {
        setAuthError(msg.reason ?? "Authentication failed.");
        setAuthPending(false);
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

  connectRef.current = connect;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const setPlayerName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20) || "Traveler";
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

  const consumeAccountSwitch = useCallback(() => {
    setAccountSwitched(false);
  }, []);

  const register = useCallback((username: string, password: string, gameState: unknown, email: string) => {
    setAuthPending(true);
    setAuthError(null);
    sendWs({ type: "register", username, password, email, gameState });
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
    prevAuthUsernameRef.current = null;
    AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    AsyncStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const saveGameState = useCallback((state: unknown) => {
    sendWs({ type: "save_state", gameState: state });
  }, [sendWs]);

  const clearServerGameState = useCallback(() => {
    setServerGameState(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setForgotPasswordSent(false);
    setForgotPasswordError(null);
    try {
      let domain: string;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        domain = window.location.host;
      } else {
        domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";
      }
      const protocol = Platform.OS === "web" ? window.location.protocol : "https:";
      const res = await fetch(`${protocol}//${domain}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setForgotPasswordSent(true);
      } else {
        setForgotPasswordError(data.reason ?? "Failed to send reset email.");
      }
    } catch {
      setForgotPasswordError("Network error. Please try again.");
    }
  }, []);

  const clearForgotState = useCallback(() => {
    setForgotPasswordSent(false);
    setForgotPasswordError(null);
    setAuthError(null);
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
      accountSwitched, consumeAccountSwitch,
      forgotPasswordSent, forgotPasswordError,
      register, login, logout, saveGameState,
      forgotPassword, clearForgotState,
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
