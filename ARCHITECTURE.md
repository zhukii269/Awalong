## Avalon Online (Server Authoritative) — Architecture

This document outlines the MVP architecture implemented in this repo.

### Overview
- Lobby and room management (create/join, ready, host start)
- In-memory authoritative state, Socket.IO sync
- Web client (Vite + React) for lobby/roster/chat

### Packages
- `server`: Express + Socket.IO + TypeScript
- `web`: Vite + React + TypeScript

### Running Locally
```bash
npm install
npm run dev
```
- Server: `http://localhost:4000`
- Web: `http://localhost:5173`

`web` reads server URL from `VITE_SERVER_URL` (default `http://localhost:4000`).

### Deploy

Frontend (GitHub Pages):
- This repo contains `.github/workflows/deploy-web.yml` that builds `web` and publishes to Pages.
- Set repository → Settings → Pages → Source: GitHub Actions.
- Add repository secret `VITE_SERVER_URL` pointing to your deployed server URL.

Backend (Server authoritative API):
- Deploy `server` to any Node host (e.g., Render, Railway, Fly.io, VPS):
  - `npm ci && npm run build && npm start`
  - Expose port 4000 (or set `PORT` env)
- Update the `VITE_SERVER_URL` secret to the server's public URL (e.g., `https://api.example.com`).

### Server
REST endpoints:
- `POST /rooms` — create room (returns `{ code, playerId, host }`)
- `POST /rooms/join` — join room by `code` (returns `{ code, playerId, host }`)
- `GET /health`

Socket events:
- client → server
  - `lobby_join { code, playerId }`
  - `lobby_set_ready { ready }`
  - `lobby_start`
  - `chat_message { message }`
- server → client
  - `lobby_state { code, hostId, players[], inGame, settings }`
  - `chat_message { playerId, nickname, message, at }`
  - `error_msg { message }`

Game state scaffold (`server/src/game/*`):
- Role assignment with mode toggles
- Mission team sizes by player count
- Initial phase `night_intro`

### Roadmap
1. Night sequence private info (Merlin, Percival, Evil)
2. Day phases: leader rotation, team proposal, global vote (5 rejects → evil)
3. Mission execution and reveal (with 2-fail requirement on mission 4 for 7+)
4. Assassination and endgame reveal
5. Persistence (Redis/DB), scaling (Socket.IO adapter)
6. Voice chat (WebRTC, SFU), role-scoped channels
7. Immersive UI/UX (animations, audio, medieval theme)


