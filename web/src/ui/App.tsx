import React, { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

type LobbyState = {
  code: string;
  hostId: string;
  players: Array<{ playerId: string; nickname: string; avatarUrl?: string; ready: boolean }>;
  inGame: boolean;
  settings: { maxPlayers: number; mode: string; visibility: 'public' | 'private' };
};

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || '';

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
  const [serverUrl, setServerUrl] = useState<string>(SERVER_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const socket: Socket | null = useMemo(() => {
    if (!roomCode || !playerId || !serverUrl) return null;
    const s = io(serverUrl, { transports: ['websocket'], autoConnect: true, reconnection: true });
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
  }, [roomCode, playerId, serverUrl]);

  // Auto restore
  useEffect(() => {
    const saved = localStorage.getItem('avalon_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setRoomCode(s.roomCode || '');
        setPlayerId(s.playerId || '');
        setIsHost(!!s.isHost);
        if (s.serverUrl) setServerUrl(s.serverUrl);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (roomCode && playerId) {
      localStorage.setItem('avalon_session', JSON.stringify({ roomCode, playerId, isHost, serverUrl }));
    }
  }, [roomCode, playerId, isHost, serverUrl]);

  const handleCreate = async () => {
    setError('');
    if (!serverUrl) return setError('服务器地址未配置');
    if (!nickname) return setError('请输入昵称');
    setLoading(true);
    try {
      const res = await axios.post(`${serverUrl}/rooms`, {
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
    } catch (e: any) {
      setError(e?.response?.data?.error || '创建房间失败，请检查服务器可用性');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    if (!serverUrl) return setError('服务器地址未配置');
    if (!nickname || !roomCode) return setError('请输入房间号和昵称');
    setLoading(true);
    try {
      const res = await axios.post(`${serverUrl}/rooms/join`, {
        code: roomCode,
        password: roomPassword || undefined,
        nickname,
        avatarUrl
      });
      setRoomCode(res.data.code);
      setPlayerId(res.data.playerId);
      setIsHost(res.data.host);
    } catch (e: any) {
      setError(e?.response?.data?.error || '加入房间失败，请检查房间号/密码与服务器可用性');
    } finally {
      setLoading(false);
    }
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

  const onPickAvatar = async (file: File) => {
    if (!file) return;
    if (!serverUrl) return setError('服务器地址未配置，无法上传头像');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await axios.post(`${serverUrl}/upload/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarUrl(res.data.url);
    } catch {
      setError('上传头像失败');
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16, color: '#f5e6c8', background: 'linear-gradient(180deg, #0b0a0a, #171311)', minHeight: '100vh', fontFamily: 'Cinzel, ui-serif, Georgia, serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>卡美洛特：Avalon Online</h2>
        <div style={{ fontFamily: 'ui-sans-serif', fontSize: 12, color: '#c8b68a' }}>服务器：
          <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://你的服务器" style={{ marginLeft: 8, width: 280 }} />
        </div>
      </div>
      {!!error && <div style={{ background: '#5b1a1a', color: '#ffe3e3', padding: 8, borderRadius: 8, marginBottom: 12 }}>{error}</div>}
      {!roomCode || !playerId ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label>昵称</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例如：兰斯洛特" />
          </div>
          <div>
            <label>头像（可选）</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://... 或上传" />
              <input type="file" accept="image/*" onChange={(e) => e.target.files && onPickAvatar(e.target.files[0])} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleCreate} style={{ background: '#8b5a2b', border: '1px solid #d4b483', color: '#fff', padding: '8px 12px', borderRadius: 6 }} disabled={loading}>
              {loading ? '创建中…' : '创建房间'}
            </button>
            <span>或</span>
            <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="房间号" />
            <input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="密码（可选）" />
            <button onClick={handleJoin} style={{ background: '#3a5f0b', border: '1px solid #a3d977', color: '#fff', padding: '8px 12px', borderRadius: 6 }} disabled={loading}>
              加入房间
            </button>
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
                <button onClick={toggleReady} style={{ background: ready ? '#2ecc71' : '#555', borderRadius: 6, padding: '8px 12px' }}>
                  {ready ? '已准备' : '准备'}
                </button>
              )}
              {isHost && !lobby?.inGame && (
                <button onClick={startGame} style={{ marginLeft: 8, background: '#7f1d1d', color: '#fff', borderRadius: 6, padding: '8px 12px' }}>
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
                      <li key={p.playerId} style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="avatar" width={28} height={28} style={{ borderRadius: '50%' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#333' }} />}
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
                <button onClick={sendChat} style={{ background: '#2b6cb0', color: '#fff', borderRadius: 6, padding: '6px 10px' }}>发送</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


