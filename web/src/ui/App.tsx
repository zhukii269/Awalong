import React, { useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

type LobbyState = {
  code: string;
  hostId: string;
  players: Array<{ playerId: string; nickname: string; avatarUrl?: string; ready: boolean }>;
  inGame: boolean;
  settings: { maxPlayers: number; mode: string; visibility: 'public' | 'private' };
};

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:4000';

export function App() {
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [ready, setReady] = useState(false);
  const [chat, setChat] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ at: number; nickname: string; message: string }>>([]);

  const socket: Socket | null = useMemo(() => {
    if (!roomCode || !playerId) return null;
    const s = io(SERVER_URL, { transports: ['websocket'] });
    s.on('connect', () => {
      s.emit('lobby_join', { code: roomCode, playerId });
    });
    s.on('lobby_state', (state: LobbyState) => setLobby(state));
    s.on('chat_message', (payload: { playerId: string; nickname: string; message: string; at: number }) => {
      setMessages((prev) => [...prev, { at: payload.at, nickname: payload.nickname, message: payload.message }]);
    });
    s.on('error_msg', (e: { message: string }) => alert(e.message));
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerId]);

  const handleCreate = async () => {
    if (!nickname) return alert('请输入昵称');
    const res = await axios.post(`${SERVER_URL}/rooms`, {
      nickname,
      avatarUrl,
      maxPlayers: 5,
      mode: 'classic',
      visibility: roomPassword ? 'private' : 'public',
      password: roomPassword || undefined
    });
    setRoomCode(res.data.code);
    setPlayerId(res.data.playerId);
    setIsHost(true);
  };

  const handleJoin = async () => {
    if (!nickname || !roomCode) return alert('请输入房间号和昵称');
    const res = await axios.post(`${SERVER_URL}/rooms/join`, {
      code: roomCode,
      password: roomPassword || undefined,
      nickname,
      avatarUrl
    });
    setRoomCode(res.data.code);
    setPlayerId(res.data.playerId);
    setIsHost(res.data.host);
  };

  const toggleReady = () => {
    if (!socket) return;
    socket.emit('lobby_set_ready', { ready: !ready });
    setReady((r) => !r);
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit('lobby_start');
  };

  const sendChat = () => {
    if (!socket || !chat.trim()) return;
    socket.emit('chat_message', { message: chat.trim() });
    setChat('');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, color: '#eee', background: '#111', minHeight: '100vh', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h2>卡美洛特：Avalon Online（MVP）</h2>
      {!roomCode || !playerId ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label>昵称</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例如：兰斯洛特" />
          </div>
          <div>
            <label>头像URL（可选）</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleCreate}>创建房间</button>
            <span>或</span>
            <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="房间号" />
            <input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="密码（可选）" />
            <button onClick={handleJoin}>加入房间</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div>房间号：<strong>{roomCode}</strong></div>
              <div>我是{isHost ? '房主' : '玩家'}</div>
            </div>
            <div>
              {!lobby?.inGame && (
                <button onClick={toggleReady} style={{ background: ready ? '#2ecc71' : '#555' }}>
                  {ready ? '已准备' : '准备'}
                </button>
              )}
              {isHost && !lobby?.inGame && (
                <button onClick={startGame} style={{ marginLeft: 8 }}>
                  开始游戏
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ background: '#1a1a1a', padding: 12, borderRadius: 8 }}>
              <h3>大厅</h3>
              {lobby ? (
                <>
                  <div>模式：{lobby.settings.mode} ｜ 可见性：{lobby.settings.visibility} ｜ 上限：{lobby.settings.maxPlayers}</div>
                  <ul>
                    {lobby.players.map((p) => (
                      <li key={p.playerId} style={{ margin: '8px 0' }}>
                        <span style={{ marginRight: 8 }}>{p.nickname}</span>
                        {p.ready ? <span style={{ color: '#2ecc71' }}>已准备</span> : <span style={{ color: '#e67e22' }}>未准备</span>}
                        {lobby.hostId === p.playerId && <span style={{ marginLeft: 8, color: '#3498db' }}>房主</span>}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div>等待同步房间信息…</div>
              )}
            </div>
            <div style={{ background: '#1a1a1a', padding: 12, borderRadius: 8 }}>
              <h3>聊天</h3>
              <div style={{ height: 200, overflow: 'auto', background: '#0f0f0f', padding: 8 }}>
                {messages.map((m, i) => (
                  <div key={i}>
                    <strong>{m.nickname}：</strong>{m.message}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="输入消息" />
                <button onClick={sendChat}>发送</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


