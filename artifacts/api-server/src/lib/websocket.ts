import crypto from "crypto";
import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { logger } from "./logger";

// ─── Server-side types ────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  username: string | null;
  ws: WebSocket;
}

interface User {
  username: string;
  passwordHash: string;
  gameState: unknown;
}

interface AuctionListing {
  id: string;
  sellerId: string;
  sellerName: string;
  material: { type: string; rarity: string; version: number };
  count: number;
  price: number;
  ts: number;
}

interface BuyOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  material: { type: string; rarity: string; version: number | null };
  count: number;
  filled: number;
  pricePerUnit: number;
  ts: number;
}

// ─── In-memory stores ─────────────────────────────────────────────────────────

const players = new Map<string, Player>();
const users = new Map<string, User>();          // lowercaseName → User
const sessions = new Map<string, string>();     // token → lowercaseName
const userIdMap = new Map<string, string>();    // lowercaseName → playerId (active)
const auctionListings = new Map<string, AuctionListing>();
const buyOrders = new Map<string, BuyOrder>();
let counter = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update("mountain_salt_2025:" + pw).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastAll(data: object) {
  for (const p of players.values()) send(p.ws, data);
}

function broadcastAhUpdate() {
  broadcastAll({ type: "ah_update", listings: Array.from(auctionListings.values()) });
}

function broadcastBoUpdate() {
  broadcastAll({ type: "bo_update", orders: Array.from(buyOrders.values()) });
}

function sysMsg(text: string) {
  broadcastAll({ type: "system", text, id: `sys-${Date.now()}`, ts: Date.now() });
}

// ─── Message handler ──────────────────────────────────────────────────────────

function handleMessage(player: Player, raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  // ── join ────────────────────────────────────────────────────────────────────
  if (msg.type === "join") {
    const name = String(msg.name || "Wanderer").slice(0, 20);
    const oldName = player.name;
    player.name = name;

    send(player.ws, { type: "joined", yourId: player.id });
    send(player.ws, { type: "ah_update", listings: Array.from(auctionListings.values()) });
    send(player.ws, { type: "bo_update", orders: Array.from(buyOrders.values()) });

    if (oldName !== name) {
      sysMsg(`${name} entered the mountain road.`);
    }

  // ── register ────────────────────────────────────────────────────────────────
  } else if (msg.type === "register") {
    const username = String(msg.username || "").trim().slice(0, 20);
    const password = String(msg.password || "");

    if (username.length < 3) {
      send(player.ws, { type: "auth_fail", reason: "Username must be at least 3 characters." });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      send(player.ws, { type: "auth_fail", reason: "Only letters, numbers, and underscores allowed." });
      return;
    }
    if (password.length < 4) {
      send(player.ws, { type: "auth_fail", reason: "Password must be at least 4 characters." });
      return;
    }
    if (users.has(username.toLowerCase())) {
      send(player.ws, { type: "auth_fail", reason: "Username is already taken." });
      return;
    }

    const token = generateToken();
    users.set(username.toLowerCase(), {
      username,
      passwordHash: hashPassword(password),
      gameState: msg.gameState ?? null,
    });
    sessions.set(token, username.toLowerCase());

    player.username = username;
    player.name = username;
    userIdMap.set(username.toLowerCase(), player.id);

    send(player.ws, { type: "auth_ok", username, token, gameState: null });
    sysMsg(`${username} joined the mountain.`);

  // ── login ───────────────────────────────────────────────────────────────────
  } else if (msg.type === "login") {
    const uname = String(msg.username || "").trim().toLowerCase();
    const password = String(msg.password || "");
    const user = users.get(uname);

    if (!user || user.passwordHash !== hashPassword(password)) {
      send(player.ws, { type: "auth_fail", reason: "Invalid username or password." });
      return;
    }

    for (const [tok, u] of sessions) {
      if (u === uname) sessions.delete(tok);
    }
    const token = generateToken();
    sessions.set(token, uname);

    player.username = user.username;
    player.name = user.username;
    userIdMap.set(uname, player.id);

    send(player.ws, { type: "auth_ok", username: user.username, token, gameState: user.gameState });

  // ── auth (session restore) ──────────────────────────────────────────────────
  } else if (msg.type === "auth") {
    const token = String(msg.token || "");
    const uname = sessions.get(token);
    if (!uname) { send(player.ws, { type: "auth_fail", reason: "Session expired. Please log in again." }); return; }
    const user = users.get(uname);
    if (!user) { sessions.delete(token); send(player.ws, { type: "auth_fail", reason: "Account not found." }); return; }

    sessions.delete(token);
    const newToken = generateToken();
    sessions.set(newToken, uname);

    player.username = user.username;
    player.name = user.username;
    userIdMap.set(uname, player.id);

    send(player.ws, { type: "auth_ok", username: user.username, token: newToken, gameState: user.gameState });

  // ── save_state ──────────────────────────────────────────────────────────────
  } else if (msg.type === "save_state") {
    if (!player.username) return;
    const user = users.get(player.username.toLowerCase());
    if (user) {
      user.gameState = msg.gameState;
      send(player.ws, { type: "state_saved" });
    }

  // ── chat ────────────────────────────────────────────────────────────────────
  } else if (msg.type === "chat") {
    const text = String(msg.text || "").trim().slice(0, 300);
    if (!text || !player.name) return;
    broadcastAll({
      type: "chat",
      id: `msg-${Date.now()}-${player.id}`,
      senderId: player.id,
      senderName: player.name,
      text,
      ts: Date.now(),
    });

  // ── ah_get ──────────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_get") {
    send(player.ws, { type: "ah_update", listings: Array.from(auctionListings.values()) });

  // ── ah_list ─────────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_list") {
    const mat = msg.material;
    if (!mat?.type || !mat?.rarity) return;
    const count = Math.max(1, parseInt(msg.count) || 1);
    const price = Math.max(1, parseInt(msg.price) || 1);
    const listing: AuctionListing = {
      id: `ah-${Date.now()}-${player.id}`,
      sellerId: player.id,
      sellerName: player.name,
      material: { type: String(mat.type).slice(0, 20), rarity: String(mat.rarity).slice(0, 20), version: parseInt(mat.version) || 0 },
      count,
      price,
      ts: Date.now(),
    };
    auctionListings.set(listing.id, listing);
    broadcastAhUpdate();

  // ── ah_cancel ───────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_cancel") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing || listing.sellerId !== player.id) return;
    auctionListings.delete(listing.id);
    send(player.ws, { type: "ah_cancelled", listing });
    broadcastAhUpdate();

  // ── ah_buy ──────────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_buy") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing) { send(player.ws, { type: "ah_buy_fail", reason: "Listing no longer available." }); return; }
    if (listing.sellerId === player.id) return;
    auctionListings.delete(listing.id);
    send(player.ws, { type: "ah_bought", listing });
    const seller = players.get(listing.sellerId);
    if (seller) send(seller.ws, { type: "ah_sale", listing, buyerName: player.name });
    broadcastAhUpdate();

  // ── bo_get ──────────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_get") {
    send(player.ws, { type: "bo_update", orders: Array.from(buyOrders.values()) });

  // ── bo_create ───────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_create") {
    const mat = msg.material;
    if (!mat?.type || !mat?.rarity) return;
    const count = Math.max(1, parseInt(msg.count) || 1);
    const pricePerUnit = Math.max(1, parseInt(msg.pricePerUnit) || 1);
    const version = (msg.material.version === null || msg.material.version === undefined) ? null : (parseInt(msg.material.version) || 0);
    const order: BuyOrder = {
      id: `bo-${Date.now()}-${player.id}`,
      buyerId: player.id,
      buyerName: player.name,
      material: { type: String(mat.type).slice(0, 20), rarity: String(mat.rarity).slice(0, 20), version },
      count,
      filled: 0,
      pricePerUnit,
      ts: Date.now(),
    };
    buyOrders.set(order.id, order);
    broadcastBoUpdate();

  // ── bo_cancel ───────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_cancel") {
    const order = buyOrders.get(String(msg.orderId));
    if (!order || order.buyerId !== player.id) return;
    const goldReturn = (order.count - order.filled) * order.pricePerUnit;
    buyOrders.delete(order.id);
    send(player.ws, { type: "bo_cancelled", orderId: order.id, goldReturn });
    broadcastBoUpdate();

  // ── bo_fill ─────────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_fill") {
    const order = buyOrders.get(String(msg.orderId));
    if (!order) { send(player.ws, { type: "bo_fill_fail", reason: "Buy order no longer available." }); return; }
    if (order.buyerId === player.id) return;

    const remaining = order.count - order.filled;
    const count = Math.max(1, Math.min(parseInt(msg.count) || 1, remaining));
    const actualVersion = (msg.version !== null && msg.version !== undefined)
      ? parseInt(msg.version)
      : (order.material.version ?? 0);
    const goldEarned = count * order.pricePerUnit;

    order.filled += count;
    if (order.filled >= order.count) {
      buyOrders.delete(order.id);
    }

    send(player.ws, { type: "bo_sold", orderId: order.id, count, goldEarned });

    const buyer = players.get(order.buyerId);
    if (buyer) {
      send(buyer.ws, {
        type: "bo_received",
        orderId: order.id,
        count,
        material: { type: order.material.type, rarity: order.material.rarity, version: actualVersion },
      });
    }

    broadcastBoUpdate();
  }
}

// ─── Connection lifecycle ─────────────────────────────────────────────────────

function handleClose(player: Player) {
  if (player.username) userIdMap.delete(player.username.toLowerCase());
  players.delete(player.id);
  if (player.name) {
    for (const p of players.values()) {
      send(p.ws, { type: "system", text: `${player.name} left the mountain road.`, id: `sys-${Date.now()}`, ts: Date.now() });
    }
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    counter++;
    const player: Player = { id: `p${counter}`, name: "", username: null, ws };
    players.set(player.id, player);
    logger.info({ playerId: player.id }, "WebSocket client connected");

    ws.on("message", (raw) => handleMessage(player, raw.toString()));
    ws.on("close", () => { handleClose(player); logger.info({ playerId: player.id }, "WebSocket client disconnected"); });
    ws.on("error", (err) => { logger.error({ err, playerId: player.id }, "WebSocket error"); ws.close(); });
  });

  logger.info("WebSocket server attached at /api/ws");
}
