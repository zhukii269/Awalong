import { useMemo, useState } from 'react'
import { initialConfig, roleSetupForCount } from '../game/roles.js'

function shuffle(arr){
  const a = arr.slice()
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]]
  }
  return a
}

export default function SetupScreen({ state, setState }){
  const [count, setCount] = useState(state.config.playerCount || 5)
  const [include, setInclude] = useState(state.config.include || initialConfig().include)
  const [customRules, setCustomRules] = useState(state.config.customRules || false)
  const [opts, setOpts] = useState(state.options || { ladyOfTheLake:false, lancelot:false })
  const [names, setNames] = useState(() => {
    if (state.players?.length) return state.players.map(p=>p.name).join('\n')
    return Array.from({length:count}, (_,i)=>`${i+1}号玩家`).join('\n')
  })

  const roles = useMemo(()=>roleSetupForCount(count, include),[count, include])

  const assignRoles = () => {
    const list = names.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    if (list.length !== count) {
      alert(`玩家名字数量需要与人数一致（当前 ${list.length} ≠ ${count}）`)
      return
    }
    const shuffled = shuffle(roles)
    const players = list.map((name, idx)=>({ id: idx, name, role: shuffled[idx] }))
    setState(s=>({
      ...s,
      config: { playerCount: count, include, customRules },
      players,
      leaderIndex: 0,
      round: 1,
      proposalsRejected: 0,
      score: [],
      team: [],
      options: { ...s.options, ...opts },
      phase: 'night'
    }))
  }

  return (
    <div className="grid">
      <div>
        <div className="title">对局设置</div>
        <div className="grid cols-3">
          <div className="col">
            <label className="small muted">人数</label>
            <select value={count} onChange={e=>setCount(parseInt(e.target.value))}>
              {[5,6,7,8,9,10].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="col">
            <label className="small muted">包含 莫德雷德</label>
            <input type="checkbox" checked={include.mordred} onChange={e=>setInclude(v=>({...v,mordred:e.target.checked}))} />
          </div>
          <div className="col">
            <label className="small muted">包含 奥伯伦</label>
            <input type="checkbox" checked={include.oberon} onChange={e=>setInclude(v=>({...v,oberon:e.target.checked}))} />
          </div>
          <div className="col">
            <label className="small muted">包含 爪牙</label>
            <input type="checkbox" checked={include.minion} onChange={e=>setInclude(v=>({...v,minion:e.target.checked}))} />
          </div>
        </div>
        <div className="row">
          <label className="small muted">自定义规则开关</label>
          <input type="checkbox" checked={customRules} onChange={e=>setCustomRules(e.target.checked)} />
        </div>
        {customRules && (
          <div className="grid cols-3">
            <div className="col">
              <label className="small muted">湖上夫人</label>
              <input type="checkbox" checked={opts.ladyOfTheLake} onChange={e=>setOpts(v=>({...v,ladyOfTheLake:e.target.checked}))} />
            </div>
            <div className="col">
              <label className="small muted">兰斯洛特</label>
              <input type="checkbox" checked={opts.lancelot} onChange={e=>setOpts(v=>({...v,lancelot:e.target.checked}))} />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="title">玩家命名（每行一个）</div>
        <textarea className="input" rows={Math.max(6,count)} value={names} onChange={e=>setNames(e.target.value)} />
      </div>

      <div>
        <div className="title">本局角色</div>
        <div className="chips">
          {roles.map((r,i)=> <span key={i} className="chip">{r.name}</span>)}
        </div>
        <div className="subtitle muted">开局仅主持可见身份分配，请勿展示给玩家。</div>
      </div>

      <div className="float-actions">
        <button className="btn primary block" onClick={assignRoles}>开始夜晚引导</button>
      </div>
    </div>
  )
}

