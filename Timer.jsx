import { useEffect, useRef, useState } from 'react'

export default function Timer({ defaultSeconds = 60 }){
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)

  useEffect(()=>{
    if (!running) return
    timerRef.current = setInterval(()=>{
      setSeconds(s=>{
        if (s <= 1){
          clearInterval(timerRef.current)
          setRunning(false)
          try { navigator.vibrate && navigator.vibrate([120,60,120]) } catch {}
          try {
            const ctx = new (window.AudioContext||window.webkitAudioContext)()
            const o = ctx.createOscillator(); const g = ctx.createGain()
            o.frequency.setValueAtTime(880, ctx.currentTime)
            g.gain.setValueAtTime(0.0001, ctx.currentTime)
            g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime+0.01)
            o.connect(g); g.connect(ctx.destination); o.start()
            setTimeout(()=>{ o.stop(); ctx.close() }, 400)
          } catch {}
          return 0
        }
        return s-1
      })
    }, 1000)
    return ()=> clearInterval(timerRef.current)
  }, [running])

  const reset = () => { setSeconds(defaultSeconds); setRunning(false) }

  return (
    <div className="row" style={{alignItems:'center'}}>
      <div className="badge">计时：{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</div>
      <button className="btn" onClick={()=>setRunning(r=>!r)}>{running?'暂停':'开始'}</button>
      <button className="btn" onClick={reset}>重置</button>
    </div>
  )
}



