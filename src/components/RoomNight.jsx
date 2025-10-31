import { useMemo } from 'react'
import { roleSetupForCount } from '../game/roles.js'
import { assignRoles, updateRoom, roomRef } from '../services/firebase.js'
import { ref, update } from 'firebase/database'

export default function RoomNight({ room, roomId, uid }){
  const count = Object.keys(room.players||{}).length
  const roles = useMemo(()=> roleSetupForCount(Math.min(Math.max(count,5),10), {}), [count])
  const myRole = room.playersRoles?.[uid]
  const ready = room.ready || {}
  const allReady = Object.keys(room.players||{}).every(id=> ready[id])
  const step = room.nightStep || 0
  const steps = [
    '所有人闭眼',
    '梅林睁眼，查看除莫德雷德外的所有坏人',
    '红方（除奥伯伦）互认',
    '派西维尔睁眼，看到梅林与莫甘娜',
    '奥伯伦睁眼示意存在（不互认）',
    '所有人睁眼，准备进入白天'
  ]

  const visibilityText = useMemo(()=>{
    if (!room.playersRoles || !myRole) return ''
    const entries = Object.entries(room.playersRoles)
    const nameById = (rid)=> room.players?.[rid]?.name || '玩家'
    if (myRole.id === 'merlin'){
      const seen = entries.filter(([pid,r])=> (r.side==='red' && r.id!=='mordred')).map(([pid])=> nameById(pid))
      return `你是梅林，你看到的坏人有：${seen.join('、') || '（无人）'}（注意：看不到莫德雷德）`
    }
    if (myRole.id === 'percival'){
      const cands = entries.filter(([pid,r])=> r.id==='merlin' || r.id==='morgana').map(([pid])=> nameById(pid))
      return `你是派西维尔，你看到两位举手者：${cands.join('、') || '（无人）'}（其中一位为真梅林）`
    }
    if (myRole.side === 'red' && myRole.id !== 'oberon'){
      const others = entries.filter(([pid,r])=> r.side==='red' && r.id!=='oberon' && pid!==uid).map(([pid])=> nameById(pid))
      return `你是坏人，你互认到的同伴：${others.join('、') || '（无人）'}（奥伯伦不互认）`
    }
    if (myRole.id === 'oberon'){
      return '你是奥伯伦：你不与坏人互认，但梅林能看到你'
    }
    return '你是忠臣：请在白天协助找出坏人'
  },[room.playersRoles, myRole, room.players, uid])

  const doAssign = async ()=> { await assignRoles(roomId, roles) }
  const setReady = async ()=> {
    const r = roomRef(roomId)
    await update(ref(r.database, `rooms/${roomId}/ready/${uid}`), true)
  }
  const nextToDay = async ()=> { await updateRoom(roomId, { phase: 'day', subphase: 'team', ready: null, nightStep: 0 }) }
  const nextStep = async ()=> { await updateRoom(roomId, { nightStep: step+1, ready: {} }) }

  return (
    <div className="card">
      <div className="title">夜晚阶段</div>
      {!room.playersRoles && (
        <>
          <div className="subtitle">房主点击分发身份，玩家将各自看到自己的角色。</div>
          {room.host===uid && (<button className="btn primary" onClick={doAssign}>分发身份并开始夜晚</button>)}
        </>
      )}
      {room.playersRoles && (
        <>
          <div className="subtitle">你的身份：{myRole?`${myRole.name}`:'等待分发...'}</div>
          <div className="small muted" style={{margin:'6px 0 10px'}}>{visibilityText}</div>
          <div className="badge">夜晚步骤：{step+1}/{steps.length} · {steps[step]}</div>
          <div className="row">
            <button className="btn" onClick={()=>window.__ttsSpeak && window.__ttsSpeak('请按规则闭眼互认')}>播放主持语音</button>
            <button className="btn success" onClick={setReady} disabled={!!ready[uid]}>我已准备</button>
          </div>
          {room.host===uid && (
            <div className="row">
              {step < steps.length-1 ? (
                <button className="btn primary" disabled={!allReady} onClick={nextStep}>全员已准备，下一步</button>
              ) : (
                <button className="btn primary" disabled={!allReady} onClick={nextToDay}>全员已准备，进入白天</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

