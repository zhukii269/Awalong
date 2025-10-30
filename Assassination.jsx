import { useMemo, useState } from 'react'

export default function Assassination({ state, setState }){
  const [targetId, setTargetId] = useState(null)
  const merlinId = useMemo(()=> state.players.find(p=>p.role.id==='merlin')?.id, [state.players])
  const confirm = () => {
    if (targetId == null) return
    const merlinKilled = targetId === merlinId
    setState(s=>({ ...s, result: merlinKilled ? 'red' : 'blue', phase: 'result' }))
  }

  return (
    <div className="grid">
      <div className="title">刺杀阶段</div>
      <div className="subtitle">由刺客选择一名玩家进行刺杀。若命中梅林，红方立即胜利；否则蓝方胜利。</div>

      <div className="card">
        <div className="title">选择刺杀目标</div>
        <div className="chips">
          {state.players.map(p=> (
            <button key={p.id} className="chip" style={{outline: targetId===p.id?'2px solid var(--danger)':'none'}} onClick={()=>setTargetId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="float-actions">
          <button className="btn danger block" onClick={confirm} disabled={targetId==null}>确认刺杀</button>
        </div>
      </div>

      {state.phase==='result' && (
        <div className="card">
          <div className="title">结果</div>
          <div className="subtitle">{state.result==='red' ? '刺中梅林，红方胜利' : '未命中梅林，蓝方胜利'}</div>
        </div>
      )}
    </div>
  )
}



