import { teamSizeForRound, isProtectedRound } from '../game/roles.js'
import { useMemo, useState } from 'react'
import Timer from './Timer.jsx'

export default function HostDashboard({ state, setState }){
  const count = state.players.length
  const sizes = teamSizeForRound(count)
  const teamSize = sizes[state.round - 1]
  const protectedRound = isProtectedRound(count, state.round - 1)
  const [voteResult, setVoteResult] = useState(null) // 'approved' | 'rejected'
  const [failCards, setFailCards] = useState(0)
  const [approveCount, setApproveCount] = useState(null)
  const [rejectCount, setRejectCount] = useState(null)

  const nextLeaderIndex = (state.leaderIndex + 1) % count

  const scoreGood = state.score.filter(s=>s==='success').length
  const scoreBad = state.score.filter(s=>s==='fail').length

  const advanceRound = (missionOutcome) => {
    setState(s=>{
      const newScore = [...s.score, missionOutcome]
      const blue3 = newScore.filter(x=>x==='success').length >= 3
      const red3 = newScore.filter(x=>x==='fail').length >= 3
      const next = {
        ...s,
        score: newScore,
        history: [...s.history, { round: s.round, team: s.team, missionOutcome, approval: approveCount, reject: rejectCount, forced: s.proposalsRejected>=5, failCards, protectedRound }],
        round: blue3 || red3 ? s.round : s.round + 1,
        proposalsRejected: 0,
        team: [],
        leaderIndex: nextLeaderIndex,
        phase: blue3 ? 'assassination' : (red3 ? 'day' : 'day')
      }
      return next
    })
  }

  const toggleMember = (pid) => {
    setState(s=>{
      const set = new Set(s.team)
      if (set.has(pid)) set.delete(pid); else set.add(pid)
      return { ...s, team: Array.from(set) }
    })
  }

  const submitTeamVote = (approved) => {
    if (!approved) {
      setState(s=>{
        const rejected = s.proposalsRejected + 1
        const forced = rejected >= 5
        if (forced) {
          // 第5次被否决则强制执行当前队伍
          return { ...s, proposalsRejected: rejected, }
        }
        return { ...s, proposalsRejected: rejected, leaderIndex: (s.leaderIndex + 1) % s.players.length, team: [] }
      })
      setVoteResult('rejected')
      return
    }
    setVoteResult('approved')
  }

  const missionCanSubmit = state.team.length === teamSize
  const evaluateMission = () => {
    const failsNeeded = protectedRound ? 2 : 1
    const outcome = failCards >= failsNeeded ? 'fail' : 'success'
    advanceRound(outcome)
    setVoteResult(null)
    setFailCards(0)
  }

  const canProceed = useMemo(()=>{
    return state.team.length === teamSize
  },[state.team, teamSize])

  return (
    <div className="grid">
      <div className="title">白天主持台</div>
      <div className="subtitle">第 {state.round} 轮 · 队长：{state.players[state.leaderIndex]?.name} · 本轮需 {teamSize} 人</div>
      <Timer defaultSeconds={120} />

      <div className="score">
        {Array.from({length:5}).map((_,i)=>{
          const v = state.score[i]
          return <div key={i} className={`s ${v==='success'?'ok': v==='fail'?'bad':''}`}></div>
        })}
      </div>

      <div className="card">
        <div className="title">选择出任务的玩家</div>
        <div className="chips">
          {state.players.map(p=>{
            const selected = state.team.includes(p.id)
            return (
              <button key={p.id} className="chip" style={{outline: selected?'2px solid var(--accent)':'none'}} onClick={()=>toggleMember(p.id)}>
                {p.name}
              </button>
            )
          })}
        </div>
        <div className="subtitle small">已选 {state.team.length} / {teamSize}</div>
        <div className="row">
          <button className="btn" onClick={()=>setState(s=>({...s, team: []}))}>清空选择</button>
          <button className="btn primary" disabled={!canProceed} onClick={()=>submitTeamVote(true)}>全员表决：通过</button>
          <button className="btn" onClick={()=>submitTeamVote(false)}>全员表决：否决</button>
        </div>
        <div className="subtitle small">若连续否决 5 次，第 5 次队伍将被强制执行。</div>
        <div className="subtitle small">已否决次数：{state.proposalsRejected}</div>
        <div className="grid cols-3">
          <div className="col">
            <label className="small muted">赞成票数</label>
            <input className="input" type="number" min="0" max={state.players.length} value={approveCount??''} onChange={e=>setApproveCount(e.target.value===''?null:+e.target.value)} />
          </div>
          <div className="col">
            <label className="small muted">反对票数</label>
            <input className="input" type="number" min="0" max={state.players.length} value={rejectCount??''} onChange={e=>setRejectCount(e.target.value===''?null:+e.target.value)} />
          </div>
        </div>
      </div>

      {voteResult === 'approved' && (
        <div className="card">
          <div className="title">任务投票</div>
          <div className="subtitle">蓝方必须投成功；红方可投成功或失败。</div>
          <div className="row">
            <div className="col">
              <label className="small muted">失败票数量{protectedRound?'（本轮需 2 张失败票才算失败）':''}</label>
              <input className="input" type="number" min="0" max={state.team.length} value={failCards} onChange={e=>setFailCards(+e.target.value)} />
            </div>
          </div>
          <div className="float-actions">
            <button className="btn success block" disabled={!missionCanSubmit} onClick={evaluateMission}>公布任务结果</button>
          </div>
        </div>
      )}

      {voteResult === 'rejected' && (
        <div className="card">
          <div className="title">队伍被否决</div>
          <div className="subtitle">队长移交至左侧玩家，继续选择队伍。</div>
          <div className="row">
            <button className="btn" onClick={()=>setVoteResult(null)}>继续</button>
          </div>
        </div>
      )}

      {(scoreGood>=3) && (
        <div className="card">
          <div className="title">进入刺杀阶段</div>
          <div className="subtitle">蓝方已完成 3 次任务，现在由刺客选择刺杀对象。</div>
          <button className="btn danger" onClick={()=>setState(s=>({...s, phase:'assassination'}))}>前往刺杀</button>
        </div>
      )}

      {(scoreBad>=3) && (
        <div className="card">
          <div className="title">红方胜利</div>
          <div className="subtitle">任务累计失败 3 次，红方获胜。</div>
        </div>
      )}
    </div>
  )
}

