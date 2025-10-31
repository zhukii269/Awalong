import { useEffect, useRef, useState } from 'react'
import { roomRef } from '../services/firebase.js'
import { onValue, push, set, ref } from 'firebase/database'

export default function ChatBox({ roomId, uid, name }){
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const endRef = useRef(null)
  useEffect(()=>{
    const r = roomRef(roomId)
    const chatRef = ref(r.database, `${r.toJSON().path.pieces_.join('/')}/chat`)
    return onValue(chatRef, s=>{
      const v = s.val()||{}
      setList(Object.values(v))
    })
  },[roomId])
  useEffect(()=>{ endRef.current && endRef.current.scrollIntoView({behavior:'smooth'}) },[list])

  const send = async () => {
    if (!text.trim()) return
    const r = roomRef(roomId)
    const chatRef = ref(r.database, `${r.toJSON().path.pieces_.join('/')}/chat`)
    const node = push(chatRef)
    await set(node, { uid, name, text: text.trim(), at: Date.now() })
    setText('')
  }

  return (
    <div className="card">
      <div className="title">聊天</div>
      <div style={{maxHeight:160,overflow:'auto',padding:8,background:'#0f172a',borderRadius:8,border:'1px solid #293041'}}>
        {list.map((m,i)=> (
          <div key={i} className="small"><b>{m.name||'玩家'}：</b>{m.text}</div>
        ))}
        <div ref={endRef}></div>
      </div>
      <div className="row" style={{marginTop:8}}>
        <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="输入消息..." />
        <button className="btn" onClick={send}>发送</button>
      </div>
    </div>
  )
}

