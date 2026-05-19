import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Material, RARITY_COLORS, useGame } from "./GameContext";

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

export interface NotificationEntry {
  id: string;
  kind: AhEvent["kind"];
  title: string;
  body: string;
  ts: number;
  read: boolean;
}

interface MultiplayerContextType {
  status: ConnectionStatus;
  isOnline: boolean;
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
  notifications: NotificationEntry[];
  unreadCount: number;
  markNotificationsRead: () => void;
  isAuthenticated: boolean;
  authUsername: string | null;
  authError: string | null;
  authPending: boolean;
  serverGameState: unknown | null;
  clearServerGameState: () => void;
  accountSwitched: boolean;
  consumeAccountSwitch: () => void;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
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
  const game = useGame();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isOnline, setIsOnline] = useState(true);
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(playerName);
  nameRef.current = playerName;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const authTokenRef = useRef<string | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const prevAuthUsernameRef = useRef<string | null>(null);
  const restoringSessionRef = useRef(false);
  // Last gold amount the server confirmed in a state_saved ack.
  const lastConfirmedGoldRef = useRef<number>(0);
  // ── Heartbeat ──
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPongRef = useRef<number>(0);
  const HEARTBEAT_INTERVAL_MS = 6_000;
  const HEARTBEAT_DEADLINE_MS = 18_000; // 3 missed pings before force close

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
      lastPongRef.current = Date.now();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        const wsNow = wsRef.current;
        if (!wsNow || wsNow.readyState !== WebSocket.OPEN) return;
        if (Date.now() - lastPongRef.current > HEARTBEAT_DEADLINE_MS) {
          wsNow.close();
          return;
        }
        wsNow.send(JSON.stringify({ type: "ping" }));
      }, HEARTBEAT_INTERVAL_MS);
      ws.send(JSON.stringify({ type: "join", name: nameRef.current }));
      if (authTokenRef.current) {
        restoringSessionRef.current = true;
        ws.send(JSON.stringify({ type: "auth", token: authTokenRef.current }));
      }
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === "pong") {
        lastPongRef.current = Date.now();
      } else if (msg.type === "joined") {
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
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "bought" as const, listing: msg.listing };
        setAhEvents((prev) => [...prev, entry]);
        setNotifications((prev) => [...prev, {
          id: entry.id, kind: "bought",
          title: "Auction Purchase",
          body: `Bought \u00d7${msg.listing.count} ${msg.listing.material.rarity} ${msg.listing.material.type}`,
          ts: Date.now(), read: false,
        }]);
      } else if (msg.type === "ah_sale" && msg.listing) {
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "sale" as const, listing: msg.listing, buyerName: msg.buyerName };
        setAhEvents((prev) => [...prev, entry]);
        setNotifications((prev) => [...prev, {
          id: entry.id, kind: "sale",
          title: "Listing Sold",
          body: `Your ${msg.listing.material.rarity} ${msg.listing.material.type} sold for ${msg.listing.price.toLocaleString()}G${msg.buyerName ? ` to ${msg.buyerName}` : ""}`,
          ts: Date.now(), read: false,
        }]);
      } else if (msg.type === "ah_cancelled" && msg.listing) {
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "cancelled" as const, listing: msg.listing };
        setAhEvents((prev) => [...prev, entry]);
        setNotifications((prev) => [...prev, {
          id: entry.id, kind: "cancelled",
          title: "Listing Cancelled",
          body: `Returned \u00d7${msg.listing.count} ${msg.listing.material.rarity} ${msg.listing.material.type} to inventory`,
          ts: Date.now(), read: false,
        }]);
      } else if (msg.type === "bo_sold") {
        // Safely deduct materials from local inventory.  If the player filled
        // the order via the UI the client already removed them; this is a
        // safety-net for offline sellers (delivery re-sent on reconnect).
        if (msg.material && msg.count > 0) {
          const key = `${msg.material.type}|${msg.material.rarity}|${msg.material.version}`;
          const existing = game.gameState.character.materials.find((e) => e.key === key);
          if (existing && existing.count >= msg.count) {
            game.removeMaterial(key, msg.count);
          }
        }
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "bo_sold" as const, boOrderId: msg.orderId, boCount: msg.count, boGoldEarned: msg.goldEarned };
        setAhEvents((prev) => [...prev, entry]);
      } else if (msg.type === "bo_received") {
        if (msg.material && msg.count > 0) {
          game.addMaterialCount(msg.material, msg.count);
        }
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "bo_received" as const, boOrderId: msg.orderId, boCount: msg.count, boMaterial: msg.material };
        setAhEvents((prev) => [...prev, entry]);
      } else if (msg.type === "bo_cancelled") {
        const entry = { id: `ahev-${Date.now()}-${Math.random()}`, kind: "bo_cancelled" as const, boOrderId: msg.orderId, boGoldReturn: msg.goldReturn };
        setAhEvents((prev) => [...prev, entry]);
      } else if (msg.type === "state_saved") {
        // Server confirmed the save and echoes back the gold it actually stored.
        // Record this as the new baseline for the next save's delta check.
        if (msg.confirmedGold !== undefined) {
          lastConfirmedGoldRef.current = Number(msg.confirmedGold);
        }
      } else if (msg.type === "auth_ok") {
        const newUserLower = msg.username.toLowerCase();
        const switched = prevAuthUsernameRef.current !== null &&
                         prevAuthUsernameRef.current !== newUserLower;
        prevAuthUsernameRef.current = newUserLower;

        restoringSessionRef.current = false;
        setSessionExpired(false);
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

        // Seed lastConfirmedGold from the server state received at login
        // so the very first save has a correct baseline.
        const loginGold = (msg.gameState as Record<string,unknown> | null)?.character;
        if (loginGold && typeof loginGold === "object") {
          lastConfirmedGoldRef.current = Math.max(0, Number((loginGold as Record<string,unknown>).gold ?? 0));
        }

        // Always push server state — overwrites any stale local data
        setServerGameState(msg.gameState ?? {});
      } else if (msg.type === "auth_fail") {
        const wasRestoring = restoringSessionRef.current;
        restoringSessionRef.current = false;
        setIsAuthenticated(false);
        setAuthUsername(null);
        setAuthError(msg.reason ?? "Authentication failed.");
        setAuthPending(false);
        authTokenRef.current = null;
        AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        AsyncStorage.removeItem("@mountain_auth_user_v1");
        if (wasRestoring) setSessionExpired(true);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(() => { if (mountedRef.current) connect(); }, 3000);
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  connectRef.current = connect;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mountedRef.current) return;
      setIsOnline(state.isConnected !== false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
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

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const consumeAccountSwitch = useCallback(() => {
    setAccountSwitched(false);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
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
    AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    AsyncStorage.removeItem(AUTH_USER_KEY);
    // Wipe local game state immediately so the next login sees a clean slate
    game.resetGameState();
    setServerGameState(null);
  }, [game]);

  const saveGameState = useCallback((state: unknown) => {
    sendWs({ type: "save_state", gameState: state, baselineGold: lastConfirmedGoldRef.current });
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
      status, isOnline, yourId, playerName, setPlayerName,
      messages, sendChat,
      listings, listAhItem, buyAhItem, cancelAhListing, refreshListings,
      buyOrders, createBuyOrder, cancelBuyOrder, fillBuyOrder,
      ahEvents, consumeAhEvent,
      notifications, unreadCount: notifications.filter((n) => !n.read).length, markNotificationsRead,
      isAuthenticated, authUsername, authError, authPending,
      serverGameState, clearServerGameState,
      accountSwitched, consumeAccountSwitch,
      sessionExpired, clearSessionExpired,
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
