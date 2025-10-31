import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { createInitialGameState } from './game/state.js';
import type { GameState, ModeConfig } from './game/types.js';

type Player = {
  id: string; // socket id
  playerId: string; // per-room stable id
  nickname: string;
  avatarUrl?: string;
  ready: boolean;
};

type RoomVisibility = 'public' | 'private';

type Room = {
  code: string;
  hostId: string; // playerId of host
  password?: string;
  visibility: RoomVisibility;
  maxPlayers: number; // 5-10
  mode: 'classic' | 'mordred' | 'custom';
  createdAt: number;
  players: Map<string, Player>; // key: playerId
  inGame: boolean;
  rejectsInRow: number;
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// In-memory store (replace with DB/Redis later)
const rooms: Map<string, Room> = new Map();
const gameStates: Map<string, GameState> = new Map();

function generateRoomCode(): string {
  // 6-char alpha
  return nanoid(6).toUpperCase();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/rooms', (req, res) => {
  const { nickname, avatarUrl, maxPlayers, mode, visibility, password } = req.body ?? {};
  if (!nickname || typeof nickname !== 'string') {
    return res.status(400).json({ error: 'nickname required' });
  }
  const mp = Number(maxPlayers) || 5;
  if (mp < 5 || mp > 10) {
    return res.status(400).json({ error: 'maxPlayers must be 5-10' });
  }
  const code = generateRoomCode();
  const playerId = nanoid();
  const now = Date.now();
  const room: Room = {
    code,
    createdAt: now,
    hostId: playerId,
    password: password ? String(password) : undefined,
    visibility: visibility === 'private' ? 'private' : 'public',
    maxPlayers: mp,
    mode: ['classic', 'mordred', 'custom'].includes(mode) ? mode : 'classic',
    players: new Map(),
    inGame: false,
    rejectsInRow: 0
  };
  const hostPlayer: Player = {
    id: '', // socket id unknown until ws connects
    playerId,
    nickname,
    avatarUrl,
    ready: false
  };
  room.players.set(playerId, hostPlayer);
  rooms.set(code, room);
  res.json({ code, playerId, host: true });
});

app.post('/rooms/join', (req, res) => {
  const { code, password, nickname, avatarUrl } = req.body ?? {};
  if (!code || !nickname) {
    return res.status(400).json({ error: 'code and nickname required' });
  }
  const room = rooms.get(String(code).toUpperCase());
  if (!room) return res.status(404).json({ error: 'room not found' });
  if (room.password && room.password !== password) {
    return res.status(403).json({ error: 'invalid password' });
  }
  if (room.players.size >= room.maxPlayers) {
    return res.status(409).json({ error: 'room full' });
  }
  if (room.inGame) {
    return res.status(409).json({ error: 'game already started' });
  }
  const playerId = nanoid();
  room.players.set(playerId, {
    id: '',
    playerId,
    nickname,
    avatarUrl,
    ready: false
  });
  res.json({ code: room.code, playerId, host: false });
});

type ClientToServerEvents = {
  lobby_join: (payload: { code: string; playerId: string }) => void;
  lobby_set_ready: (payload: { ready: boolean }) => void;
  lobby_start: () => void;
  chat_message: (payload: { message: string }) => void;
};

type ServerToClientEvents = {
  lobby_state: (payload: {
    code: string;
    hostId: string;
    players: Array<{ playerId: string; nickname: string; avatarUrl?: string; ready: boolean }>;
    inGame: boolean;
    settings: { maxPlayers: number; mode: string; visibility: RoomVisibility };
  }) => void;
  chat_message: (payload: { playerId: string; nickname: string; message: string; at: number }) => void;
  error_msg: (payload: { message: string }) => void;
};

// Socket auth context per connection
const socketRoomById = new Map<string, { code: string; playerId: string }>();

io.on('connection', (socket) => {
  const safeEmitError = (message: string) => socket.emit('error_msg', { message });

  const emitLobbyState = (room: Room) => {
    io.to(room.code).emit('lobby_state', {
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()).map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        ready: p.ready
      })),
      inGame: room.inGame,
      settings: { maxPlayers: room.maxPlayers, mode: room.mode, visibility: room.visibility }
    });
  };

  socket.on('lobby_join', ({ code, playerId }) => {
    const room = rooms.get(String(code).toUpperCase());
    if (!room) return safeEmitError('Room not found');
    const player = room.players.get(playerId);
    if (!player) return safeEmitError('Player not in room');
    player.id = socket.id;
    socketRoomById.set(socket.id, { code: room.code, playerId });
    socket.join(room.code);
    emitLobbyState(room);
  });

  socket.on('lobby_set_ready', ({ ready }) => {
    const ctx = socketRoomById.get(socket.id);
    if (!ctx) return;
    const room = rooms.get(ctx.code);
    if (!room) return;
    const player = room.players.get(ctx.playerId);
    if (!player) return;
    player.ready = !!ready;
    emitLobbyState(room);
  });

  socket.on('lobby_start', () => {
    const ctx = socketRoomById.get(socket.id);
    if (!ctx) return;
    const room = rooms.get(ctx.code);
    if (!room) return;
    if (room.hostId !== ctx.playerId) return safeEmitError('Only host can start');
    if (room.players.size < 5) return safeEmitError('Need at least 5 players');
    const allReady = Array.from(room.players.values()).every((p) => p.ready);
    if (!allReady) return safeEmitError('All players must be ready');
    // Transition to inGame and reset lobby specifics
    room.inGame = true;
    room.rejectsInRow = 0;
    // role assignment and game state init
    const modeConfig: ModeConfig = {
      includeMordred: room.mode !== 'classic' && room.mode !== 'custom' ? true : room.mode === 'mordred',
      includeMorgana: true,
      includePercival: true,
      includeOberon: false
    };
    const playerIds = Array.from(room.players.keys());
    const state = createInitialGameState(room.code, playerIds, modeConfig);
    gameStates.set(room.code, state);
    emitLobbyState(room);
  });

  socket.on('chat_message', ({ message }) => {
    const ctx = socketRoomById.get(socket.id);
    if (!ctx) return;
    const room = rooms.get(ctx.code);
    if (!room) return;
    const player = room.players.get(ctx.playerId);
    if (!player) return;
    const at = Date.now();
    io.to(room.code).emit('chat_message', {
      playerId: player.playerId,
      nickname: player.nickname,
      message: String(message).slice(0, 500),
      at
    });
  });

  socket.on('disconnect', () => {
    const ctx = socketRoomById.get(socket.id);
    if (!ctx) return;
    const room = rooms.get(ctx.code);
    socketRoomById.delete(socket.id);
    if (!room) return;
    const player = room.players.get(ctx.playerId);
    if (player) player.id = '';
    // If host disconnected and no players remain connected, keep room but do nothing.
    // Future: room cleanup TTL.
    // Notify others that someone left (lobby state updates avatar online not tracked yet)
    // For now just emit lobby state
    // If room becomes empty, schedule deletion
    emitLobbyState(room);
  });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});


