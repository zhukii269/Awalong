import { useMemo, useState } from 'react'

export default function NightPhase({ state, setState }){
  const [step, setStep] = useState(0)

  const has = useMemo(()=>{
    const ids = new Set(state.players.map(p=>p.role.id))
    return {
      merlin: ids.has('merlin'),
      percival: ids.has('percival'),
      morgana: ids.has('morgana'),
      assassin: ids.has('assassin'),
      mordred: ids.has('mordred'),
      oberon: ids.has('oberon')
    }
  },[state.players])

  const steps = useMemo(()=>{
    const arr = []
    arr.push({ title: '所有人闭眼', desc: '请确认所有玩家安静并闭上眼睛。' })
    if (has.merlin) arr.push({ title: '梅林睁眼', desc: '梅林睁眼，查看除莫德雷德外的所有坏人（奥伯伦可见）。' })
    arr.push({ title: '坏人互认', desc: '红方（除奥伯伦）睁眼互认，随后闭眼。' })
    if (has.percival && has.morgana) arr.push({ title: '派西维尔睁眼', desc: '派西维尔睁眼，看到两位举手者（梅林与莫甘娜），无法分辨谁是真梅林。' })
    if (has.oberon) arr.push({ title: '奥伯伦睁眼', desc: '若有奥伯伦，他单独睁眼示意存在（不与红方互认）。' })
    arr.push({ title: '所有人睁眼', desc: '进入白天，开始组队与发言讨论。' })
    return arr
  },[has])

  const next = () => {
    if (step < steps.length - 1) setStep(step+1)
    else setState(s=>({ ...s, phase: 'day' }))
  }

  return (
    <div className="grid">
      <div className="title">夜晚闭眼引导</div>
      <div className="card">
        <div className="subtitle">步骤 {step+1} / {steps.length}</div>
        <div className="section">
          <div className="title">{steps[step].title}</div>
          <div className="subtitle">{steps[step].desc}</div>
        </div>
        <div className="float-actions">
          <button className="btn primary block" onClick={next}>{step < steps.length-1 ? '下一步' : '进入白天'}</button>
        </div>
      </div>

      <div className="card">
        <div className="title">主持提示</div>
        <ul className="list small">
          <li>用低沉语气，避免透露任何额外信息。</li>
          <li>按顺序：梅林 → 红方互认 → 派西维尔 → 奥伯伦 → 全员睁眼。</li>
        </ul>
      </div>
    </div>
  )
}



