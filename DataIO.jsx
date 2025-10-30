export default function DataIO({ state, setState }){
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avalon-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const importJson = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { setState(JSON.parse(reader.result)) } catch { alert('导入失败：JSON 格式不正确') }
    }
    reader.readAsText(file)
  }
  return (
    <div className="row">
      <button className="btn" onClick={exportJson}>导出对局</button>
      <label className="btn">
        导入对局
        <input type="file" accept="application/json" style={{display:'none'}} onChange={e=>importJson(e.target.files?.[0])} />
      </label>
    </div>
  )
}



