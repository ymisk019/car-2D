// سيرفر ريلاي بسيط لغرف أونلاين
// شغله محلياً: npm install && npm start
// أو استضفه مجاناً على Render.com (شوف README.md)

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS_PER_ROOM = 4;

// rooms: code -> { players: Map(id -> {ws, name}), hostId: string }
const rooms = new Map();

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون أحرف متشابهة
  let code;
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function roomPlayerList(room) {
  return Array.from(room.players.entries()).map(([id, p]) => ({
    id,
    name: p.name,
    host: id === room.hostId,
  }));
}

function broadcast(room, obj, excludeId = null) {
  for (const [id, p] of room.players.entries()) {
    if (id !== excludeId) send(p.ws, obj);
  }
}

function removePlayer(ws) {
  const { roomCode, playerId } = ws._meta || {};
  if (!roomCode || !rooms.has(roomCode)) return;
  const room = rooms.get(roomCode);
  room.players.delete(playerId);

  if (room.players.size === 0) {
    rooms.delete(roomCode);
    return;
  }

  // إذا المضيف طلع، عيّن مضيف جديد
  if (room.hostId === playerId) {
    const nextHostId = room.players.keys().next().value;
    room.hostId = nextHostId;
  }

  broadcast(room, { type: "player_left", player_id: playerId, players: roomPlayerList(room), host_id: room.hostId });
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  ws._meta = {};

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    switch (msg.type) {
      case "create_room": {
        const code = makeRoomCode();
        const playerId = makeId();
        const room = { players: new Map(), hostId: playerId };
        room.players.set(playerId, { ws, name: String(msg.name || "لاعب").slice(0, 20) });
        rooms.set(code, room);
        ws._meta = { roomCode: code, playerId };
        send(ws, {
          type: "room_created",
          code,
          player_id: playerId,
          host_id: playerId,
          players: roomPlayerList(room),
        });
        break;
      }

      case "join_room": {
        const code = String(msg.code || "").toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: "room_error", message: "الغرفة مش موجودة" });
          return;
        }
        if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
          send(ws, { type: "room_error", message: "الغرفة مليانة" });
          return;
        }
        const playerId = makeId();
        room.players.set(playerId, { ws, name: String(msg.name || "لاعب").slice(0, 20) });
        ws._meta = { roomCode: code, playerId };

        send(ws, {
          type: "room_joined",
          code,
          player_id: playerId,
          host_id: room.hostId,
          players: roomPlayerList(room),
        });

        broadcast(room, { type: "player_joined", players: roomPlayerList(room), host_id: room.hostId }, playerId);
        break;
      }

      case "start_game": {
        const { roomCode, playerId } = ws._meta;
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== playerId) return; // بس المضيف يقدر يبدأ
        broadcast(room, { type: "game_started" });
        break;
      }

      // رسائل اللعب أثناء الماتش: input (من اللاعب للمضيف) و state/match_over (من المضيف للكل)
      case "input": {
        const { roomCode, playerId } = ws._meta;
        const room = rooms.get(roomCode);
        if (!room) return;
        const hostEntry = room.players.get(room.hostId);
        if (hostEntry) {
          send(hostEntry.ws, { type: "input", player_id: playerId, throttle: msg.throttle, steer: msg.steer });
        }
        break;
      }

      case "state":
      case "match_over": {
        const { roomCode, playerId } = ws._meta;
        const room = rooms.get(roomCode);
        if (!room || room.hostId !== playerId) return; // بس المضيف يبعت هاي
        broadcast(room, { ...msg }, playerId);
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => removePlayer(ws));
  ws.on("error", () => removePlayer(ws));
});

console.log(`car-combat relay server listening on port ${PORT}`);
