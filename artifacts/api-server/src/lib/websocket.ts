import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { logger } from "./logger";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
}

const players = new Map<string, Player>();
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
