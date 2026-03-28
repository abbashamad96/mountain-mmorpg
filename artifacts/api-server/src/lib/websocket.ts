import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { logger } from "./logger";

interface Player {
  id: string;
  name: string;
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

const players = new Map<string, Player>();
const auctionListings = new Map<string, AuctionListing>();
let counter = 0;

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data: object, excludeId?: string) {
  for (const [id, player] of players) {
    if (id !== excludeId) {
      send(player.ws, data);
    }
  }
}

function broadcastAll(data: object) {
  for (const player of players.values()) {
    send(player.ws, data);
  }
}

function broadcastAhUpdate() {
  broadcastAll({
    type: "ah_update",
    listings: Array.from(auctionListings.values()),
  });
}

function handleMessage(player: Player, raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (msg.type === "join") {
    const name = String(msg.name || `Wanderer`).slice(0, 20);
    const oldName = player.name;
    player.name = name;

    send(player.ws, { type: "joined", yourId: player.id });

    // Send current AH listings to the newly joined player
    send(player.ws, {
      type: "ah_update",
      listings: Array.from(auctionListings.values()),
    });

    if (oldName !== name && oldName) {
      broadcastAll({
        type: "system",
        text: `${name} entered the mountain road.`,
        id: `sys-${Date.now()}`,
        ts: Date.now(),
      });
    } else if (!oldName) {
      broadcastAll({
        type: "system",
        text: `${name} entered the mountain road.`,
        id: `sys-${Date.now()}`,
        ts: Date.now(),
      });
    }
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

  } else if (msg.type === "ah_get") {
    send(player.ws, {
      type: "ah_update",
      listings: Array.from(auctionListings.values()),
    });

  } else if (msg.type === "ah_list") {
    const material = msg.material;
    if (!material || !material.type || !material.rarity) return;
    const count = Math.max(1, parseInt(msg.count) || 1);
    const price = Math.max(1, parseInt(msg.price) || 1);
    const id = `ah-${Date.now()}-${player.id}`;
    const listing: AuctionListing = {
      id,
      sellerId: player.id,
      sellerName: player.name,
      material: {
        type: String(material.type).slice(0, 20),
        rarity: String(material.rarity).slice(0, 20),
        version: parseInt(material.version) || 0,
      },
      count,
      price,
      ts: Date.now(),
    };
    auctionListings.set(id, listing);
    broadcastAhUpdate();

  } else if (msg.type === "ah_cancel") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing || listing.sellerId !== player.id) return;
    auctionListings.delete(listing.id);
    // Tell the canceller to get their items back
    send(player.ws, {
      type: "ah_cancelled",
      listing,
    });
    broadcastAhUpdate();

  } else if (msg.type === "ah_buy") {
    const listing = auctionListings.get(String(msg.listingId));
    if (!listing) {
      send(player.ws, { type: "ah_buy_fail", reason: "Listing no longer available." });
      return;
    }
    if (listing.sellerId === player.id) return; // can't buy own
    auctionListings.delete(listing.id);

    // Notify buyer
    send(player.ws, {
      type: "ah_bought",
      listing,
    });

    // Notify seller
    const seller = players.get(listing.sellerId);
    if (seller) {
      send(seller.ws, {
        type: "ah_sale",
        listing,
        buyerName: player.name,
      });
    }

    broadcastAhUpdate();
  }
}

function handleClose(player: Player) {
  players.delete(player.id);
  if (player.name) {
    broadcast({
      type: "system",
      text: `${player.name} left the mountain road.`,
      id: `sys-${Date.now()}`,
      ts: Date.now(),
    });
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    counter++;
    const player: Player = { id: `p${counter}`, name: "", ws };
    players.set(player.id, player);

    logger.info({ playerId: player.id }, "WebSocket client connected");

    ws.on("message", (raw) => handleMessage(player, raw.toString()));
    ws.on("close", () => {
      handleClose(player);
      logger.info({ playerId: player.id }, "WebSocket client disconnected");
    });
    ws.on("error", (err) => {
      logger.error({ err, playerId: player.id }, "WebSocket error");
    });
  });

  logger.info("WebSocket server attached at /api/ws");
}
