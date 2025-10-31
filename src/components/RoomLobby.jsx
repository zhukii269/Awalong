import { useEffect, useState } from 'react'
import { ensureAnonAuth, createRoom, joinRoom, onRoom, setHost, updateRoom } from '../services/firebase.js'

export default function RoomLobby(){
  const [uid, setUid] = useState('')
  const [name, setName] = useState('房主')
  const [roomId, setRoomId] = useState('')
  const [room, setRoom] = useState(null)
  const [joinCode, setJoinCode] = useState('')

  useEffect(()=>{ ensureAnonAuth().then(u=> setUid(u.uid)) },[])
  useEffect(()=>{
    const rid = new URLSearchParams(location.search).get('r')
    if (rid) setRoomId(rid)
  },[])
  useEffect(()=>{
    if (!roomId) return
    const off = onRoom(roomId, setRoom)
    return ()=> off && off()
  },[roomId])

  const handleCreate = async () => {
    const rid = await createRoom()
    await ensureAnonAuth()
    setRoomId(rid)
    await joinRoom(rid, uid, name)
    await setHost(rid, uid)
  }

  const handleJoin = async () => {
    if (!joinCode) return
    const u = await ensureAnonAuth()
    await joinRoom(joinCode, u.uid, name || '玩家')
    setRoomId(joinCode)
  }

  const startGame = async () => {
    if (!roomId) return
    await updateRoom(roomId, { phase: 'night' })
  }

  return (
    <div className="grid">
      <div className="title">在线房间（实验版）</div>
      {!room && (
        <>
          <div className="card">
            <div className="title">创建房间（你是房主）</div>
            <div className="row">
              <input className="input" placeholder="你的昵称" value={name} onChange={e=>setName(e.target.value)} />
              <button className="btn primary" onClick={handleCreate}>创建</button>
            </div>
          </div>
          <div className="card">
            <div className="title">加入房间</div>
            <div className="row">
              <input className="input" placeholder="你的昵称" value={name} onChange={e=>setName(e.target.value)} />
              <input className="input" placeholder="房间码（6位）" value={joinCode} onChange={e=>setJoinCode(e.target.value.trim())} />
              <button className="btn" onClick={handleJoin}>加入</button>
            </div>
          </div>
        </>
      )}

      {room && (
        <div className="card">
          <div className="title">房间 {roomId}</div>
          <div className="subtitle small">分享链接：{location.origin + location.pathname}?r={roomId}</div>
          <div className="chips" style={{marginTop:8}}>
            {room.players && Object.entries(room.players).map(([id,p])=> (
              <span key={id} className="chip">{p.name || '玩家'}</span>
            ))}
          </div>
          <div className="row" style={{marginTop:8}}>
            {room.host===uid && room.phase==='lobby' && (
              <button className="btn primary" onClick={startGame}>开始游戏</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

