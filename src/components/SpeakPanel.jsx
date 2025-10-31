import { requestSpeak, approveSpeak, endSpeak } from '../services/firebase.js'

export default function SpeakPanel({ roomId, room, uid }){
  const isHost = room.host === uid
  const requests = room.speakRequests || {}
  const speaker = room.speakerUid

  const announce = (t)=> window.__ttsSpeak && window.__ttsSpeak(t)

  return (
    <div className="card">
      <div className="title">发言控制</div>
      <div className="subtitle small">当前发言者：{speaker ? (room.players?.[speaker]?.name || '玩家') : '无'}</div>
      {!speaker && (
        <div className="row">
          <button className="btn" onClick={()=>{ requestSpeak(roomId, uid); announce('已申请发言，等待房主批准') }}>申请发言</button>
        </div>
      )}
      {isHost && !speaker && (
        <div className="section">
          <div className="subtitle">待批准：</div>
          <div className="chips">
            {Object.keys(requests).length===0 && <span className="muted small">暂无</span>}
            {Object.keys(requests).map(id=> (
              <button key={id} className="chip" onClick={()=>{ approveSpeak(roomId, id); announce(`${room.players?.[id]?.name||'玩家'} 开始发言`) }}>
                允许 {room.players?.[id]?.name || '玩家'}
              </button>
            ))}
          </div>
        </div>
      )}
      {isHost && speaker && (
        <div className="row">
          <button className="btn" onClick={()=>{ endSpeak(roomId); announce('发言结束') }}>结束当前发言</button>
        </div>
      )}
    </div>
  )
}






