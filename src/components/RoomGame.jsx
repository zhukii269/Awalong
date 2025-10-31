import { useEffect, useMemo, useState } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import { updateRoom } from '../services/firebase.js'
import ChatBox from './ChatBox.jsx'
import HistoryView from './HistoryView.jsx'
import SpeakPanel from './SpeakPanel.jsx'
import { teamSizeForRound, isProtectedRound } from '../game/roles.js'
import Timer from './Timer.jsx'
import RoomNight from './RoomNight.jsx'

export default function RoomGame({ roomId }){
  const { uid, room, join, setSubphase, setTeam, setVote, setMissionVote, clearVotes, clearMission } = useRoom(roomId)
  const [displayName, setDisplayName] = useState('')

  useEffect(()=>{
    const params = new URLSearchParams(location.search)
    const n = params.get('n'); if (n) setDisplayName(n)
  },[])

  if (!room) {
    return (
      <div className="card">
        <div className="title">加入房间</div>
        <div className="row">
          <input className="input" placeholder="你的昵称" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          <button className="btn primary" onClick={()=>join(displayName||'玩家')}>加入</button>
        </div>
      </div>
    )
  }

  const isHost = uid && room.host === uid
  const count = Object.keys(room.players||{}).length
  const sizes = teamSizeForRound(Math.min(Math.max(count,5),10))
  const teamSize = sizes[(room.round||1)-1]
  const protectedRound = isProtectedRound(count, (room.round||1)-1)
  const votes = room.votesTeam || {}
  const mission = room.mission || {}
  const team = room.team || []
  const sub = room.subphase || 'team'

  if (room.phase === 'night') {
    return <RoomNight room={room} roomId={roomId} uid={uid} />
  }

  const approveNum = Object.values(votes).filter(x=>x?.v==='approve').length
  const rejectNum = Object.values(votes).filter(x=>x?.v==='reject').length

  const canOpenVote = isHost && team.length === teamSize
  const handleOpenVote = async () => { await clearVotes(); await setSubphase('team_vote') }
  const handleVote = async (v) => { await setVote(uid, { v }) }
  const handleOpenMission = async () => { await clearMission(); await setSubphase('mission_vote') }
  const handleMission = async (v) => { if (team.includes(uid)) await setMissionVote(uid, { v }) }

  const publishMission = async () => {
    const failCards = Object.values(mission).filter(x=>x?.v==='fail').length
    const outcome = failCards >= (protectedRound?2:1) ? 'fail' : 'success'
    const score = [...(room.score||[]), outcome]
    const blue3 = score.filter(s=>s==='success').length>=3
    const red3 = score.filter(s=>s==='fail').length>=3
    const historyItem = { round: room.round||1, team, missionOutcome: outcome, failCards, protectedRound }
    const nextHistory = [...(room.history||[]), historyItem]
    await updateRoom(roomId, {
      score,
      round: blue3||red3 ? room.round : (room.round||1)+1,
      subphase: 'team',
      team: [],
      votesTeam: null,
      mission: null,
      proposalsRejected: 0,
      leaderIndex: ((room.leaderIndex||0)+1) % count,
      history: nextHistory
    })
  }

  const toggleMember = async (pid) => {
    if (!isHost || sub!=='team') return
    const s = new Set(team)
    s.has(pid) ? s.delete(pid) : s.add(pid)
    await setTeam(Array.from(s))
  }

  return (
    <div className="card">
      <div className="title">在线对局 · 第{room.round||1}轮 · 队长：{Object.values(room.players||{})[room.leaderIndex||0]?.name||'—'}</div>
      <div className="subtitle">人数 {count} · 本轮需 {teamSize} 人{sub==='team'?'（组队中）': sub==='team_vote'?'（公投中）': '（任务中）'} · 否决计数 {room.proposalsRejected||0}</div>

      <div className="row"><Timer defaultSeconds={120} /></div>
      <div className="small muted" style={{margin:'6px 0 10px'}}>分享链接：{location.origin + location.pathname}?r={roomId}</div>

      <div className="chips" style={{marginTop:8}}>
        {Object.entries(room.players||{}).map(([id,p])=> (
          <button key={id} className="chip" style={{outline: team.includes(id)?'2px solid var(--accent)':'none'}} onClick={()=>toggleMember(id)}>
            {p.name||'玩家'}
          </button>
        ))}
      </div>
      <div className="subtitle small">已选 {team.length}/{teamSize}</div>

      {sub==='team' && (
        <div className="row">
          <button className="btn" disabled={!canOpenVote} onClick={handleOpenVote}>发起全员公投</button>
        </div>
      )}

      {sub==='team_vote' && (
        <div className="grid">
          <div className="row">
            <button className="btn success" onClick={()=>handleVote('approve')}>赞成</button>
            <button className="btn danger" onClick={()=>handleVote('reject')}>反对</button>
          </div>
          <div className="badge">当前票型：赞成 {approveNum} / 反对 {rejectNum}</div>
          {isHost && (
            <AutoVoteDecider room={room} count={count} approveNum={approveNum} rejectNum={rejectNum} onPass={handleOpenMission} />
          )}
        </div>
      )}

      {sub==='mission_vote' && (
        <div className="grid">
          <div className="subtitle small">仅入队成员可提交。{protectedRound?'本轮为保护轮，需要2张失败票才失败。':''}</div>
          <div className="row">
            <button className="btn success" onClick={()=>handleMission('success')}>投成功</button>
            <button className="btn danger" onClick={()=>handleMission('fail')}>投失败</button>
          </div>
          {isHost && (
            <div className="row">
              <button className="btn primary" onClick={publishMission}>公布任务结果</button>
            </div>
          )}
        </div>
      )}
      <div className="section"><SpeakPanel roomId={roomId} room={room} uid={uid} /></div>
      <div className="section"><ChatBox roomId={roomId} uid={uid} name={displayName||'玩家'} /></div>
      <div className="section"><HistoryView room={room} /></div>
    </div>
  )
}

function AutoVoteDecider({ room, count, approveNum, rejectNum, onPass }){
  // 多数通过：赞成 > count/2；所有人都已投票后自动判定；
  // 否决则 proposalsRejected+1，队长轮换；连续5次否决后强制执行当前队伍（进入任务投票，清零否决计数）
  const allVoted = (approveNum + rejectNum) >= count
  const majority = Math.floor(count/2) + 1

  const decide = async () => {
    if (!allVoted) return
    if (approveNum >= majority) {
      await onPass()
      await updateRoom(room.id||room.roomId, {})
    } else {
      const nextRejected = (room.proposalsRejected||0) + 1
      const force = nextRejected >= 5
      await updateRoom(room.id||room.roomId, {
        proposalsRejected: force ? 0 : nextRejected,
        leaderIndex: ((room.leaderIndex||0)+1) % (Object.keys(room.players||{}).length||1),
        subphase: force ? 'mission_vote' : 'team',
        votesTeam: null,
        // 若否决，清空队伍；若强制执行则保留队伍并进入任务
        team: force ? (room.team||[]) : []
      })
    }
  }

  return (
    <div className="row">
      <button className="btn primary" onClick={decide}>主持判定（自动）</button>
    </div>
  )
}

