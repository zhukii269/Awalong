import { useEffect, useRef, useState } from 'react'

export default function TTS(){
  const [enabled, setEnabled] = useState(true)
  const [rate, setRate] = useState(1)
  const speakRef = useRef((text)=>{
    if (!enabled || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'; u.rate = rate
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
  useEffect(()=>{ speakRef.current = (t)=>{
    if (!enabled || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(t)
    u.lang = 'zh-CN'; u.rate = rate
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
  } }, [enabled, rate])

  // 暴露在 window 便于其它组件触发
  useEffect(()=>{ window.__ttsSpeak = (t)=> speakRef.current(t) },[])

  return (
    <div className="row">
      <label className="badge">主持配音</label>
      <button className="btn" onClick={()=>setEnabled(e=>!e)}>{enabled?'关闭':'开启'}</button>
      <input className="input" type="range" min="0.6" max="1.4" step="0.1" value={rate} onChange={e=>setRate(parseFloat(e.target.value))} />
    </div>
  )
}

