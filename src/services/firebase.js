import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, update, push, serverTimestamp, get } from 'firebase/database'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

// 将以下配置替换为你的 Firebase 项目配置（README 有说明）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || '',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FB_DB_URL || '',
  projectId: import.meta.env.VITE_FB_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FB_STORAGE || '',
  messagingSenderId: import.meta.env.VITE_FB_MSG || '',
  appId: import.meta.env.VITE_FB_APP_ID || ''
}

let app, db, auth
export function ensureFirebase(){
  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getDatabase(app)
    auth = getAuth(app)
  }
  return { app, db, auth }
}

export async function ensureAnonAuth(){
  const { auth } = ensureFirebase()
  if (auth.currentUser) return auth.currentUser
  await signInAnonymously(auth)
  return new Promise(resolve=> onAuthStateChanged(auth, u=> u && resolve(u)))
}

export function roomRef(roomId){
  const { db } = ensureFirebase()
  return ref(db, `rooms/${roomId}`)
}

export async function createRoom(hostName){
  const { db } = ensureFirebase()
  const rid = Math.random().toString(36).slice(2, 8)
  const r = ref(db, `rooms/${rid}`)
  await set(r, {
    createdAt: serverTimestamp(),
    phase: 'lobby',
    players: {},
    host: null,
    actions: {},
    round: 1,
    leaderIndex: 0,
    score: [],
    team: [],
    proposalsRejected: 0,
    subphase: 'team'
  })
  return rid
}

export async function joinRoom(roomId, uid, displayName){
  const r = roomRef(roomId)
  const snap = await get(r)
  if (!snap.exists()) throw new Error('房间不存在')
  const pRef = ref(r.database, `rooms/${roomId}/players/${uid}`)
  await update(pRef, { name: displayName || '玩家', joinedAt: serverTimestamp() })
}

export async function setHost(roomId, uid){
  await update(roomRef(roomId), { host: uid })
}

export function onRoom(roomId, cb){
  return onValue(roomRef(roomId), s=> cb(s.val()))
}

export async function updateRoom(roomId, patch){
  await update(roomRef(roomId), patch)
}

export async function pushAction(roomId, action){
  const { db } = ensureFirebase()
  const aRef = ref(db, `rooms/${roomId}/actions`)
  const node = push(aRef)
  await set(node, { ...action, at: serverTimestamp() })
}

// 分发身份：根据当前玩家数量生成角色列表，并随机分配到 playersRoles[uid]，仅本人可见（客户端读取时按 uid 过滤展示）。
export async function assignRoles(roomId, roleList){
  // roleList: [{id,name,side}] 长度需与玩家人数一致
  const r = roomRef(roomId)
  const snap = await get(ref(r.database, `rooms/${roomId}/players`))
  const players = snap.val() || {}
  const uids = Object.keys(players)
  if (uids.length !== roleList.length) throw new Error('人数与角色数不一致')
  // 随机打乱
  const shuffled = roleList.slice().sort(()=>Math.random()-0.5)
  const mapping = {}
  uids.forEach((uid, i)=>{ mapping[uid] = shuffled[i] })
  await update(ref(r.database, `rooms/${roomId}`), { playersRoles: mapping, phase: 'night', subphase: 'night_intro', ready: {} })
}

// 发言队列与控制
export async function requestSpeak(roomId, uid){
  const r = roomRef(roomId)
  const reqRef = ref(r.database, `rooms/${roomId}/speakRequests/${uid}`)
  await set(reqRef, { at: serverTimestamp() })
}
export async function approveSpeak(roomId, uid){
  await update(roomRef(roomId), { speakerUid: uid })
}
export async function endSpeak(roomId){
  await update(roomRef(roomId), { speakerUid: null })
}

