import { useEffect, useMemo, useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import NightPhase from './components/NightPhase.jsx'
import HostDashboard from './components/HostDashboard.jsx'
import Assassination from './components/Assassination.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import { initialConfig } from './game/roles.js'
import RoomLobby from './components/RoomLobby.jsx'
import TTS from './components/TTS.jsx'
import RoomGame from './components/RoomGame.jsx'
import DataIO from './components/DataIO.jsx'

const STORAGE_KEY = 'avalon_host_v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export default function App() {
  const [state, setState] = useState(() => loadState() || {
    phase: 'setup',
    config: initialConfig(),
    players: [], // { id, name, role }
    leaderIndex: 0,
    round: 1,
    proposalsRejected: 0,
    score: [], // 'success' | 'fail'
    team: [],
    history: [],
    options: { ladyOfTheLake: false, lancelot: false }
  })

  useEffect(() => { saveState(state) }, [state])

  const resetAll = () => {
    setState({
      phase: 'setup',
      config: initialConfig(),
      players: [],
      leaderIndex: 0,
      round: 1,
      proposalsRejected: 0,
      score: [],
      team: [],
      history: [],
      options: { ladyOfTheLake: false, lancelot: false }
    })
  }

  const blueWins = useMemo(() => state.score.filter(s => s === 'success').length >= 3, [state.score])
  const redWins = useMemo(() => state.score.filter(s => s === 'fail').length >= 3, [state.score])

  return (
    <div className="container">
      <div className="card">
        <div className="title">阿瓦隆主持</div>
        <div className="subtitle">手机网页即可主持全流程（数据本地保存）</div>

        {state.phase === 'setup' && (
          <SetupScreen state={state} setState={setState} />
        )}

        {state.phase === 'night' && (
          <NightPhase state={state} setState={setState} />)
        }

        {state.phase === 'day' && !blueWins && !redWins && (
          <HostDashboard state={state} setState={setState} />
        )}

        {state.phase === 'assassination' && (
          <Assassination state={state} setState={setState} />
        )}

        {(blueWins || redWins) && state.phase !== 'assassination' && (
          <div className="section">
            <div className="title">比赛结束</div>
            <div className="subtitle">
              {redWins ? '任务失败 3 次，红方胜利' : '任务成功 3 次，进入刺杀阶段'}
            </div>
          </div>
        )}

        <div className="divider"></div>
        <RoomLobby />
        {new URLSearchParams(location.search).get('r') && (
          <div className="section">
            <RoomGame roomId={new URLSearchParams(location.search).get('r')} />
          </div>
        )}
        <div className="section"><TTS /></div>
        <HistoryPanel state={state} />
        <div className="row">
          <button className="btn" onClick={() => setState(s => ({...s, phase: 'setup'}))}>返回设置</button>
          <button className="btn" onClick={() => setState(s => ({...s, phase: 'night'}))}>夜晚引导</button>
          <button className="btn" onClick={() => setState(s => ({...s, phase: 'day'}))}>白天流程</button>
          <button className="btn danger" onClick={resetAll}>重置对局</button>
        </div>
        <div className="section">
          <DataIO state={state} setState={setState} />
        </div>
      </div>
    </div>
  )
}

