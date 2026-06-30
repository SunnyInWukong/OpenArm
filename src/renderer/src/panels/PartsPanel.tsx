import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { importCad } from '../cad/import'

export default function PartsPanel() {
  const parts = useStore((s) => s.parts)
  const { addPart, removePart } = useStore.getState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const f of files) {
      setStatus(`importing ${f.name}…`)
      try {
        addPart(f.name, await importCad(f.name, await f.arrayBuffer()))
        setStatus(`imported ${f.name}`)
      } catch (err) {
        setStatus(`error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return (
    <div style={panel}>
      <div style={rowBetween}>
        <div style={head}>Parts</div>
        <button onClick={() => fileRef.current?.click()} style={smallBtn}>
          + Import CAD
        </button>
      </div>
      {parts.length === 0 && <div style={hint}>STL / STEP / IGES fixtures & workpieces.</div>}
      {parts.map((p) => (
        <div key={p.id} style={row}>
          <span style={nameCell}>{p.name}</span>
          <button onClick={() => removePart(p.id)} style={del}>
            ×
          </button>
        </div>
      ))}
      {status && <div style={{ ...hint, marginTop: 6 }}>{status}</div>}
      <input
        ref={fileRef}
        type="file"
        accept=".stl,.step,.stp,.iges,.igs"
        multiple
        onChange={onFiles}
        style={{ display: 'none' }}
      />
    </div>
  )
}

const panel: React.CSSProperties = {
  position: 'absolute',
  bottom: 14,
  left: 14,
  width: 240,
  padding: 14,
  background: 'rgba(28,28,28,0.92)',
  border: '1px solid #333',
  borderRadius: 8,
  fontSize: 12,
  zIndex: 10
}
const head: React.CSSProperties = {
  fontWeight: 600,
  opacity: 0.7,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontSize: 11
}
const rowBetween: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8
}
const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 6,
  padding: '3px 0'
}
const nameCell: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}
const hint: React.CSSProperties = { opacity: 0.45, fontSize: 11 }
const smallBtn: React.CSSProperties = {
  padding: '3px 8px',
  background: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 11
}
const del: React.CSSProperties = {
  padding: '1px 6px',
  background: '#333',
  color: '#e88',
  border: '1px solid #5a3a3a',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11
}
