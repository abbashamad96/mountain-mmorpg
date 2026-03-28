import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { logger } from "./logger";

interface PlayerStats {
  strength: number;
  health: number;
  defence: number;
  speed: number;
}

interface Player {
  id: string;
  name: string;
  level: number;
  stats: PlayerStats;
  ws: WebSocket;
}

interface Room {
  code: string;
  players: Map<string, Player>;
}

const rooms = new Map<string, Room>();
let playerCounter = 0;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room: Room, data: object, excludeId?: string) {
  for (const [id, player] of room.players) {
    if (id !== excludeId) {
      send(player.ws, data);
    }
  }
}

function roomPlayers(room: Room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    level: p.level,
    stats: p.stats,
  }));
}

function resolveBattle(
  attacker: Player,
  defender: Player
): { attackerHp: number; defenderHp: number; log: string[] } {
  let attackerHp = attacker.stats.health;
  let defenderHp = defender.stats.health;
  const log: string[] = [];

  const rounds = 5;
  for (let i = 0; i < rounds; i++) {
    const atk1 =
      attacker.stats.strength + Math.floor(Math.random() * attacker.stats.speed);
    const def1 =
      defender.stats.defence + Math.floor(Math.random() * defender.stats.defence);
    const dmg1 = Math.max(1, atk1 - def1);
    defenderHp -= dmg1;
    log.push(`${attacker.name} deals ${dmg1} damage`);

    if (defenderHp <= 0) break;

    const atk2 =
      defender.stats.strength + Math.floor(Math.random() * defender.stats.speed);
    const def2 =
      attacker.stats.defence + Math.floor(Math.random() * attacker.stats.defence);
    const dmg2 = Math.max(1, atk2 - def2);
    attackerHp -= dmg2;
    log.push(`${defender.name} deals ${dmg2} damage`);

    if (attackerHp <= 0) break;
  }

  return { attackerHp, defenderHp, log };
}

function handleMessage(player: Player, raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  const { type } = msg;

  if (type === "join") {
    const { name, roomCode, level, stats } = msg;
    player.name = name || `Player${player.id}`;
    player.level = level ?? 0;
    player.stats = stats ?? {
      strength: 1,
      health: 10,
      defence: 1,
      speed: 1,
    };

    let code = roomCode?.toUpperCase().trim();
    let room: Room;

    if (code && rooms.has(code)) {
      room = rooms.get(code)!;
    } else {
      code = generateRoomCode();
      room = { code, players: new Map() };
      rooms.set(code, room);
    }

    room.players.set(player.id, player);
    (player as any).roomCode = code;

    send(player.ws, {
      type: "room_joined",
      roomCode: code,
      players: roomPlayers(room),
      yourId: player.id,
    });

    broadcast(room, {
      type: "player_joined",
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        stats: player.stats,
      },
    }, player.id);

    logger.info({ playerId: player.id, roomCode: code }, "Player joined room");
  } else if (type === "sync_stats") {
    const code: string = (player as any).roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code)!;
    player.level = msg.level ?? player.level;
    player.stats = msg.stats ?? player.stats;

    broadcast(room, {
      type: "player_updated",
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        stats: player.stats,
      },
    }, player.id);
  } else if (type === "co_op_event") {
    const code: string = (player as any).roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code)!;

    broadcast(room, {
      type: "co_op_event",
      event: msg.event,
      triggeredBy: player.name,
      triggeredById: player.id,
    }, player.id);
  } else if (type === "challenge") {
    const code: string = (player as any).roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code)!;
    const target = room.players.get(msg.targetId);
    if (!target) return;

    send(target.ws, {
      type: "battle_challenge",
      fromId: player.id,
      fromName: player.name,
      fromStats: player.stats,
      fromLevel: player.level,
    });
  } else if (type === "accept_battle") {
    const code: string = (player as any).roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code)!;
    const challenger = room.players.get(msg.challengerId);
    if (!challenger) return;

    const speedA = player.stats.speed;
    const speedB = challenger.stats.speed;
    let attacker = player;
    let defender = challenger;
    if (speedB > speedA || (speedB === speedA && Math.random() > 0.5)) {
      attacker = challenger;
      defender = player;
    }

    const result = resolveBattle(attacker, defender);
    const challengerWon = attacker === challenger
      ? result.attackerHp > result.defenderHp
      : result.defenderHp > result.attackerHp;
    const acceptorWon = !challengerWon;

    send(player.ws, {
      type: "battle_result",
      won: acceptorWon,
      opponentName: challenger.name,
      opponentLevel: challenger.level,
      log: result.log,
      hpRemaining: acceptorWon
        ? (attacker === player ? result.attackerHp : result.defenderHp)
        : 0,
    });

    send(challenger.ws, {
      type: "battle_result",
      won: challengerWon,
      opponentName: player.name,
      opponentLevel: player.level,
      log: result.log,
      hpRemaining: challengerWon
        ? (attacker === challenger ? result.attackerHp : result.defenderHp)
        : 0,
    });

    logger.info(
      { player: player.name, challenger: challenger.name, challengerWon },
      "Battle resolved"
    );
  } else if (type === "decline_battle") {
    const code: string = (player as any).roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code)!;
    const challenger = room.players.get(msg.challengerId);
    if (challenger) {
      send(challenger.ws, {
        type: "battle_declined",
        byName: player.name,
      });
    }
  }
}

function handleClose(player: Player) {
  const code: string = (player as any).roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  room.players.delete(player.id);
  broadcast(room, {
    type: "player_left",
    playerId: player.id,
    playerName: player.name,
  });

  if (room.players.size === 0) {
    rooms.delete(code);
    logger.info({ code }, "Room closed (empty)");
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    playerCounter++;
    const player: Player = {
      id: `p${playerCounter}`,
      name: "",
      level: 0,
      stats: { strength: 1, health: 10, defence: 1, speed: 1 },
      ws,
    };

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
