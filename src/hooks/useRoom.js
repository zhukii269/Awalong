import { useEffect, useState } from 'react'
import { ensureAnonAuth, joinRoom, onRoom, roomRef, updateRoom } from '../services/firebase.js'
import { ref, update, remove } from 'firebase/database'

export function useRoom(roomId){
  const [uid, setUid] = useState(null)
  const [name, setName] = useState('玩家')
  const [room, setRoom] = useState(null)

  useEffect(()=>{ ensureAnonAuth().then(u=> setUid(u.uid)) },[])
  useEffect(()=>{
    if (!roomId) return
    const off = onRoom(roomId, setRoom)
    return ()=> off && off()
  },[roomId])

  const join = async (displayName) => {
    const u = await ensureAnonAuth()
    await joinRoom(roomId, u.uid, displayName || name)
    setName(displayName || name)
  }

  const setSubphase = async (sub) => updateRoom(roomId, { subphase: sub })
  const setTeam = async (team) => updateRoom(roomId, { team })
  const setVote = async (uid, v) => {
    const r = roomRef(roomId)
    await update(ref(r.database, `${r.toJSON().path.pieces_.join('/')}/votesTeam/${uid}`), v?{v}:null)
  }
  const setMissionVote = async (uid, v) => {
    const r = roomRef(roomId)
    await update(ref(r.database, `${r.toJSON().path.pieces_.join('/')}/mission/${uid}`), v?{v}:null)
  }
  const clearVotes = async () => {
    const r = roomRef(roomId)
    await remove(ref(r.database, `${r.toJSON().path.pieces_.join('/')}/votesTeam`))
  }
  const clearMission = async () => {
    const r = roomRef(roomId)
    await remove(ref(r.database, `${r.toJSON().path.pieces_.join('/')}/mission`))
  }

  return { uid, name, room, join, setSubphase, setTeam, setVote, setMissionVote, clearVotes, clearMission }
}

