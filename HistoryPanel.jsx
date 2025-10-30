export default function HistoryPanel({ state }){
  if (!state.history?.length) return null
  return (
    <div className="card">
      <div className="title">历史记录</div>
      <div className="list small">
        {state.history.map((h,idx)=> (
          <div key={idx} className="pill">
            第 {h.round} 轮 · 队伍：{h.team?.map(id=>state.players.find(p=>p.id===id)?.name).join('，') || '-'} · {h.approval!=null?`赞成${h.approval}/反对${h.reject}`:'未记录投票'} · {h.forced?'强制执行 · ':''}{h.missionOutcome?`结果：${h.missionOutcome==='success'?'成功':'失败'}`:''}{h.failCards!=null?`（失败牌：${h.failCards}${h.protectedRound?'，保护轮':''}）`:''}
          </div>
        ))}
      </div>
    </div>
  )
}



