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
  const [serverUrl] = useState<string>(SERVER_URL);
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, color: '#f5e6c8', background: `#0b0a0a url(/images/bg-camelot.jpg) center/cover no-repeat fixed`, minHeight: '100vh', fontFamily: 'Cinzel, ui-serif, Georgia, serif', backdropFilter: 'blur(1px)' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-block', padding: '6px 14px', border: '1px solid #c9a14a', background: 'rgba(20,16,10,0.7)', boxShadow: '0 0 12px rgba(201,161,74,0.3)' }}>
          <h1 style={{ margin: 0, color: '#c9a14a', letterSpacing: 1 }}>卡美洛特：Avalon Online</h1>
        </div>
      </div>
      {!!error && <div style={{ background: '#5b1a1a', color: '#ffe3e3', padding: 8, borderRadius: 8, marginBottom: 12 }}>{error}</div>}
      {!roomCode || !playerId ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'start', gap: 16 }}>
          {/* 创建房间 */}
          <div style={{ background: 'rgba(20,16,10,0.78)', border: '1px solid #6b5b3e', padding: 16, borderRadius: 10, boxShadow: '0 0 16px rgba(0,0,0,0.4)' }}>
            <h3 style={{ marginTop: 0, color: '#c9a14a' }}>创建房间</h3>
            {!!error && (
              <div style={{ background: '#5b1a1a', color: '#ffe3e3', padding: 8, borderRadius: 8, marginBottom: 8 }}>⚠️ {error}</div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#c8b68a', marginBottom: 4 }}>昵称</div>
                <div style={{ background: '#f0e6d2', border: '2px solid #6b5b3e', padding: '6px 8px', borderRadius: 8 }}>
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例如：兰斯洛特" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#111' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#c8b68a', marginBottom: 4 }}>头像（可选）</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid #6b5b3e', background: '#222' }}>
                    {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src="/icons/helmet.svg" alt="default" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." style={{ width: 220 }} />
                    <label style={{ display: 'inline-block', padding: '6px 10px', border: '1px solid #c9a14a', background: '#8b5a2b', color: '#fff', borderRadius: 8, cursor: 'pointer' }}>
                      上传<input type="file" accept="image/*" onChange={(e) => e.target.files && onPickAvatar(e.target.files[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <button onClick={handleCreate} disabled={loading} style={{
                  color: '#fff', border: '1px solid #d4b483', background: 'linear-gradient(#8b5a2b,#5e3e1d)', padding: '12px 18px', cursor: 'pointer',
                  clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)'
                }}>
                  {loading ? '创建中…' : '创建房间'}
                </button>
              </div>
            </div>
          </div>

          {/* 中间分隔徽章 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <img src="/icons/separator-emblem.svg" alt="emblem" style={{ width: 40, opacity: 0.8 }} />
          </div>

          {/* 加入房间 */}
          <div style={{ background: 'rgba(20,16,10,0.78)', border: '1px solid #6b5b3e', padding: 16, borderRadius: 10, boxShadow: '0 0 16px rgba(0,0,0,0.4)' }}>
            <h3 style={{ marginTop: 0, color: '#c9a14a' }}>加入房间</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#c8b68a', marginBottom: 4 }}>房间号</div>
                <div style={{ background: '#f0e6d2', border: '2px solid #6b5b3e', padding: '6px 8px', borderRadius: 8 }}>
                  <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="例如：ABCD12" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#111' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#c8b68a', marginBottom: 4 }}>密码（可选）</div>
                <div style={{ background: '#f0e6d2', border: '2px solid #6b5b3e', padding: '6px 8px', borderRadius: 8 }}>
                  <input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="如果房间设置了密码" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#111' }} />
                </div>
              </div>
              <div>
                <button onClick={handleJoin} disabled={loading} style={{
                  color: '#fff', border: '1px solid #a3d977', background: 'linear-gradient(#3a5f0b,#254205)', padding: '12px 18px', cursor: 'pointer',
                  clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)'
                }}>
                  加入房间
                </button>
              </div>
            </div>
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


