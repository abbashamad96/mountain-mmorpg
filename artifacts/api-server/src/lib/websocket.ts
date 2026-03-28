import crypto from "crypto";
import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  auctionListingsTable,
  buyOrdersTable,
  pendingDeliveriesTable,
} from "@workspace/db";
import { logger } from "./logger";

// ─── Server-side types ────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  username: string | null;
  ws: WebSocket;
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

// ─── Runtime state (connections + caches) ─────────────────────────────────────

const players = new Map<string, Player>();
const userIdMap = new Map<string, string>();         // usernameLower → playerId
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

/** Returns a stable, persistent ID for a player (username if authenticated, ephemeral id otherwise). */
function stableId(player: Player): string {
  return player.username ?? player.id;
}

/** Reassign any in-memory listings/orders that used oldId to newId (e.g. after auth). */
function reassignOwnedEntries(oldId: string, newId: string) {
  for (const listing of auctionListings.values()) {
    if (listing.sellerId === oldId) listing.sellerId = newId;
  }
  for (const order of buyOrders.values()) {
    if (order.buyerId === oldId) order.buyerId = newId;
  }
}

/** Find a connected player by their stable ID (username or ephemeral id). */
function getPlayerByStableId(id: string): Player | undefined {
  // Try direct lookup (ephemeral id)
  const direct = players.get(id);
  if (direct) return direct;
  // Try username lookup
  const pid = userIdMap.get(id.toLowerCase());
  return pid ? players.get(pid) : undefined;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function dbGetUser(usernameLower: string) {
  const rows = await db.select().from(usersTable).where(eq(usersTable.usernameLower, usernameLower));
  return rows[0] ?? null;
}

async function dbUserExists(usernameLower: string): Promise<boolean> {
  const rows = await db.select({ u: usersTable.usernameLower }).from(usersTable).where(eq(usersTable.usernameLower, usernameLower));
  return rows.length > 0;
}

async function dbCreateUser(username: string, passwordHash: string, gameState: unknown) {
  await db.insert(usersTable).values({
    usernameLower: username.toLowerCase(),
    username,
    passwordHash,
    gameState: gameState ?? null,
  });
}

async function dbUpdateGameState(usernameLower: string, gameState: unknown) {
  await db.update(usersTable).set({ gameState }).where(eq(usersTable.usernameLower, usernameLower));
}

async function dbCreateSession(token: string, usernameLower: string) {
  await db.insert(sessionsTable).values({ token, usernameLower });
}

async function dbGetSession(token: string) {
  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  return rows[0] ?? null;
}

async function dbDeleteSession(token: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

async function dbDeleteSessionsByUser(usernameLower: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.usernameLower, usernameLower));
}

async function dbSaveAhListing(listing: AuctionListing) {
  await db.insert(auctionListingsTable).values({
    id: listing.id,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    material: listing.material,
    count: listing.count,
    price: listing.price,
    createdAt: listing.ts,
  }).onConflictDoUpdate({
    target: auctionListingsTable.id,
    set: { count: listing.count, price: listing.price },
  });
}

async function dbDeleteAhListing(id: string) {
  await db.delete(auctionListingsTable).where(eq(auctionListingsTable.id, id));
}

async function dbSaveBuyOrder(order: BuyOrder) {
  await db.insert(buyOrdersTable).values({
    id: order.id,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    material: order.material,
    count: order.count,
    filled: order.filled,
    pricePerUnit: order.pricePerUnit,
    createdAt: order.ts,
  }).onConflictDoUpdate({
    target: buyOrdersTable.id,
    set: { filled: order.filled },
  });
}

async function dbDeleteBuyOrder(id: string) {
  await db.delete(buyOrdersTable).where(eq(buyOrdersTable.id, id));
}

async function dbQueueDelivery(usernameLower: string, deliveryType: string, payload: Record<string, unknown>) {
  await db.insert(pendingDeliveriesTable).values({ usernameLower, deliveryType, payload });
}

async function dbFlushDeliveries(usernameLower: string) {
  const rows = await db.select().from(pendingDeliveriesTable).where(eq(pendingDeliveriesTable.usernameLower, usernameLower));
  if (rows.length > 0) {
    await db.delete(pendingDeliveriesTable).where(eq(pendingDeliveriesTable.usernameLower, usernameLower));
  }
  return rows;
}

// ─── Startup: load AH data from DB ───────────────────────────────────────────

async function loadFromDb() {
  const [listingRows, orderRows] = await Promise.all([
    db.select().from(auctionListingsTable),
    db.select().from(buyOrdersTable),
  ]);

  for (const row of listingRows) {
    auctionListings.set(row.id, {
      id: row.id,
      sellerId: row.sellerId,
      sellerName: row.sellerName,
      material: row.material as { type: string; rarity: string; version: number },
      count: row.count,
      price: row.price,
      ts: Number(row.createdAt),
    });
  }

  for (const row of orderRows) {
    buyOrders.set(row.id, {
      id: row.id,
      buyerId: row.buyerId,
      buyerName: row.buyerName,
      material: row.material as { type: string; rarity: string; version: number | null },
      count: row.count,
      filled: row.filled,
      pricePerUnit: row.pricePerUnit,
      ts: Number(row.createdAt),
    });
  }

  logger.info(`Loaded ${auctionListings.size} AH listings and ${buyOrders.size} buy orders from DB`);
}

// ─── Message handler ──────────────────────────────────────────────────────────

async function handleMessage(player: Player, raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  // ── join ────────────────────────────────────────────────────────────────────
  if (msg.type === "join") {
    const name = String(msg.name || "Wanderer").slice(0, 20);
    const oldName = player.name;
    player.name = name;

    send(player.ws, { type: "joined", yourId: stableId(player) });
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
      send(player.ws, { type: "auth_fail", reason: "Username must be at least 3 characters." }); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      send(player.ws, { type: "auth_fail", reason: "Only letters, numbers, and underscores allowed." }); return;
    }
    if (password.length < 4) {
      send(player.ws, { type: "auth_fail", reason: "Password must be at least 4 characters." }); return;
    }

    const exists = await dbUserExists(username.toLowerCase());
    if (exists) {
      send(player.ws, { type: "auth_fail", reason: "Username is already taken." }); return;
    }

    const token = generateToken();
    await dbCreateUser(username, hashPassword(password), msg.gameState ?? null);
    await dbCreateSession(token, username.toLowerCase());

    reassignOwnedEntries(player.id, username);
    player.username = username;
    player.name = username;
    userIdMap.set(username.toLowerCase(), player.id);

    send(player.ws, { type: "auth_ok", username, token, gameState: null, yourId: username });
    sysMsg(`${username} joined the mountain.`);

  // ── login ───────────────────────────────────────────────────────────────────
  } else if (msg.type === "login") {
    const uname = String(msg.username || "").trim().toLowerCase();
    const password = String(msg.password || "");
    const user = await dbGetUser(uname);

    if (!user || user.passwordHash !== hashPassword(password)) {
      send(player.ws, { type: "auth_fail", reason: "Invalid username or password." }); return;
    }

    await dbDeleteSessionsByUser(uname);
    const token = generateToken();
    await dbCreateSession(token, uname);

    reassignOwnedEntries(player.id, user.username);
    player.username = user.username;
    player.name = user.username;
    userIdMap.set(uname, player.id);

    // Flush pending deliveries for this user
    const pending = await dbFlushDeliveries(uname);
    const ws = player.ws;
    send(ws, { type: "auth_ok", username: user.username, token, gameState: user.gameState, yourId: user.username });
    for (const d of pending) {
      send(ws, { type: d.deliveryType, ...d.payload });
    }

  // ── auth (session restore) ──────────────────────────────────────────────────
  } else if (msg.type === "auth") {
    const token = String(msg.token || "");
    const session = await dbGetSession(token);
    if (!session) {
      send(player.ws, { type: "auth_fail", reason: "Session expired. Please log in again." }); return;
    }
    const user = await dbGetUser(session.usernameLower);
    if (!user) {
      await dbDeleteSession(token);
      send(player.ws, { type: "auth_fail", reason: "Account not found." }); return;
    }

    await dbDeleteSession(token);
    const newToken = generateToken();
    await dbCreateSession(newToken, session.usernameLower);

    reassignOwnedEntries(player.id, user.username);
    player.username = user.username;
    player.name = user.username;
    userIdMap.set(session.usernameLower, player.id);

    // Flush pending deliveries
    const pending = await dbFlushDeliveries(session.usernameLower);
    const ws = player.ws;
    send(ws, { type: "auth_ok", username: user.username, token: newToken, gameState: user.gameState, yourId: user.username });
    for (const d of pending) {
      send(ws, { type: d.deliveryType, ...d.payload });
    }

  // ── save_state ──────────────────────────────────────────────────────────────
  } else if (msg.type === "save_state") {
    if (!player.username) return;
    await dbUpdateGameState(player.username.toLowerCase(), msg.gameState);
    send(player.ws, { type: "state_saved" });

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
      sellerId: stableId(player),
      sellerName: player.name,
      material: { type: String(mat.type).slice(0, 20), rarity: String(mat.rarity).slice(0, 20), version: parseInt(mat.version) || 0 },
      count,
      price,
      ts: Date.now(),
    };
    auctionListings.set(listing.id, listing);
    await dbSaveAhListing(listing);
    broadcastAhUpdate();

  // ── ah_cancel ───────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_cancel") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing || listing.sellerId !== stableId(player)) return;
    auctionListings.delete(listing.id);
    await dbDeleteAhListing(listing.id);
    send(player.ws, { type: "ah_cancelled", listing });
    broadcastAhUpdate();

  // ── ah_buy ──────────────────────────────────────────────────────────────────
  } else if (msg.type === "ah_buy") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing) { send(player.ws, { type: "ah_buy_fail", reason: "Listing no longer available." }); return; }
    if (listing.sellerId === stableId(player)) { send(player.ws, { type: "ah_buy_fail", reason: "You cannot buy your own listing." }); return; }
    auctionListings.delete(listing.id);
    await dbDeleteAhListing(listing.id);
    send(player.ws, { type: "ah_bought", listing });

    // Notify seller (if online) or queue delivery
    const seller = getPlayerByStableId(listing.sellerId);
    if (seller) {
      send(seller.ws, { type: "ah_sale", listing, buyerName: player.name });
    } else {
      // Queue gold notification for offline seller (authenticated players only)
      const sellerUname = listing.sellerId.toLowerCase();
      const sellerUser = await dbGetUser(sellerUname);
      if (sellerUser) {
        await dbQueueDelivery(sellerUname, "ah_sale", { listing, buyerName: player.name });
      }
    }
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
    const version = (msg.material.version === null || msg.material.version === undefined)
      ? null : (parseInt(msg.material.version) || 0);
    const order: BuyOrder = {
      id: `bo-${Date.now()}-${player.id}`,
      buyerId: stableId(player),
      buyerName: player.name,
      material: { type: String(mat.type).slice(0, 20), rarity: String(mat.rarity).slice(0, 20), version },
      count,
      filled: 0,
      pricePerUnit,
      ts: Date.now(),
    };
    buyOrders.set(order.id, order);
    await dbSaveBuyOrder(order);
    broadcastBoUpdate();

  // ── bo_cancel ───────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_cancel") {
    const order = buyOrders.get(String(msg.orderId));
    if (!order || order.buyerId !== stableId(player)) return;
    const goldReturn = (order.count - order.filled) * order.pricePerUnit;
    buyOrders.delete(order.id);
    await dbDeleteBuyOrder(order.id);
    send(player.ws, { type: "bo_cancelled", orderId: order.id, goldReturn });
    broadcastBoUpdate();

  // ── bo_fill ─────────────────────────────────────────────────────────────────
  } else if (msg.type === "bo_fill") {
    const order = buyOrders.get(String(msg.orderId));
    if (!order) { send(player.ws, { type: "bo_fill_fail", reason: "Buy order no longer available." }); return; }
    if (order.buyerId === stableId(player)) return;

    const remaining = order.count - order.filled;
    const count = Math.max(1, Math.min(parseInt(msg.count) || 1, remaining));
    const actualVersion = (msg.version !== null && msg.version !== undefined)
      ? parseInt(msg.version) : (order.material.version ?? 0);
    const goldEarned = count * order.pricePerUnit;

    order.filled += count;
    if (order.filled >= order.count) {
      buyOrders.delete(order.id);
      await dbDeleteBuyOrder(order.id);
    } else {
      await dbSaveBuyOrder(order);
    }

    send(player.ws, { type: "bo_sold", orderId: order.id, count, goldEarned });

    // Notify buyer (if online) or queue delivery
    const buyerPlayer = getPlayerByStableId(order.buyerId);
    const receivedPayload = {
      orderId: order.id,
      count,
      material: { type: order.material.type, rarity: order.material.rarity, version: actualVersion },
    };
    if (buyerPlayer) {
      send(buyerPlayer.ws, { type: "bo_received", ...receivedPayload });
    } else {
      // Queue for offline buyer (authenticated players only)
      const buyerUname = order.buyerId.toLowerCase();
      const buyerUser = await dbGetUser(buyerUname);
      if (buyerUser) {
        await dbQueueDelivery(buyerUname, "bo_received", receivedPayload as Record<string, unknown>);
      }
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

  // Load persisted AH data before accepting connections
  loadFromDb().catch(err => logger.error({ err }, "Failed to load data from DB"));

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    counter++;
    const player: Player = { id: `p${counter}`, name: "", username: null, ws };
    players.set(player.id, player);
    logger.info({ playerId: player.id }, "WebSocket client connected");

    ws.on("message", (raw) => {
      handleMessage(player, raw.toString()).catch(err => {
        logger.error({ err, playerId: player.id }, "Error handling WebSocket message");
      });
    });
    ws.on("close", () => { handleClose(player); logger.info({ playerId: player.id }, "WebSocket client disconnected"); });
    ws.on("error", (err) => { logger.error({ err, playerId: player.id }, "WebSocket error"); ws.close(); });
  });

  logger.info("WebSocket server attached at /api/ws");
}
