export default function HistoryView({ room }){
  if (!room?.history?.length) return null
  return (
    <div className="card">
      <div className="title">对局历史（多人）</div>
      <div className="list small">
        {room.history.map((h, i)=> (
          <div key={i} className="pill">
            第 {h.round} 轮 · 队伍：{(h.team||[]).map(id=> room.players?.[id]?.name).join('，')} · 结果：{h.missionOutcome==='success'?'成功':'失败'} · 失败牌：{h.failCards ?? 0}{h.protectedRound?' · 保护轮':''}
          </div>
        ))}
      </div>
    </div>
  )
}

