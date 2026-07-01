import { useRef, useState } from 'react'
import type { URDFRobot } from 'urdf-loader'
import type { Instruction } from '@shared/domain/program'
import { getPost, postProcessors } from '@shared/post'
import { parseProject, serializeProject } from '@shared/domain/project'
import { computeTcpPose } from '../kinematics/tcp'
import { movableJointNames } from '../kinematics/ik'
import { useStore } from '../state/store'

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function label(ins: Instruction, targetName: (id: string) => string): string {
  switch (ins.kind) {
    case 'move':
      return `${ins.move} → ${targetName(ins.targetId)}  @${ins.speed}`
    case 'wait':
      return `Wait ${ins.seconds}s`
    case 'setdo':
      return `DO[${ins.pin}] = ${ins.value ? 'on' : 'off'}`
    case 'comment':
      return `// ${ins.text}`
  }
}

export default function ProgramPanel({ robot }: { robot: URDFRobot }) {
  const targets = useStore((s) => s.targets)
  const program = useStore((s) => s.program)
  const selected = useStore((s) => s.selected)
  const playing = useStore((s) => s.playing)
  const tool = useStore((s) => s.tool)
  const {
    addTarget,
    removeTarget,
    addMove,
    addWait,
    addComment,
    removeInstruction,
    reorderInstruction,
    updateInstruction,
    select,
    play,
    stop,
    loadProject,
    setTool,
    setProgramName
  } = useStore.getState()

  const sel = program.instructions.find((i) => i.id === selected)

  const [showCode, setShowCode] = useState(false)
  const [showTool, setShowTool] = useState(false)
  const [postId, setPostId] = useState('urscript')
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState(30002)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const post = getPost(postId)
  const code = post.generate(program, targets, tool)

  async function send() {
    if (!window.openarm) return setStatus('desktop only')
    setStatus('sending…')
    // the UR bridge speaks URScript regardless of which vendor the code view shows
    const script = getPost('urscript').generate(program, targets, tool)
    const r = await window.openarm.ur.sendScript({ host, port, script })
    setStatus(r.ok ? `sent ${r.bytes} bytes` : `error: ${r.error}`)
  }
  async function stopRobot() {
    if (!window.openarm) return setStatus('desktop only')
    const r = await window.openarm.ur.stop({ host })
    setStatus(r.ok ? 'stop sent' : `error: ${r.error}`)
  }

  const nameOf = (id: string) => targets.find((t) => t.id === id)?.name ?? '??'

  function copyCode() {
    navigator.clipboard?.writeText(code)
  }
  function saveCode() {
    downloadText(code, `${program.name || 'program'}.${post.extension}`)
  }
  function saveProject() {
    downloadText(
      serializeProject(program.name, targets, program, tool),
      `${program.name || 'project'}.openarm.json`
    )
  }
  async function loadProjectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-loading the same file
    if (!file) return
    const r = parseProject(await file.text())
    if (r.ok) {
      loadProject(r.project)
      setStatus(`loaded ${file.name}`)
    } else {
      setStatus(`load error: ${r.error}`)
    }
  }

  function teach() {
    const names = movableJointNames(robot)
    const joints = names.map((n) => Number(robot.joints[n].angle))
    addTarget(`P${targets.length + 1}`, joints, computeTcpPose(robot))
  }

  return (
    <div style={panel}>
      <div style={rowBetween}>
        <button onClick={() => setShowTool((v) => !v)} style={smallBtn}>
          {showTool ? '▾' : '▸'} Tool: {tool.name}
        </button>
      </div>
      {showTool && (
        <div style={{ marginBottom: 12 }}>
          <input
            value={tool.name}
            onChange={(e) => setTool({ name: e.target.value })}
            style={{ ...numInp, marginBottom: 6 }}
            placeholder="tool name"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {(['x', 'y', 'z'] as const).map((k) => (
              <label key={k} style={fld}>
                {k} (m)
                <input
                  type="number"
                  step={0.005}
                  value={tool[k]}
                  onChange={(e) => setTool({ [k]: Number(e.target.value) })}
                  style={numInp}
                />
              </label>
            ))}
            {(['rx', 'ry', 'rz'] as const).map((k) => (
              <label key={k} style={fld}>
                {k}
                <input
                  type="number"
                  step={0.05}
                  value={tool[k]}
                  onChange={(e) => setTool({ [k]: Number(e.target.value) })}
                  style={numInp}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={rowBetween}>
        <div style={head}>Targets</div>
        <button onClick={teach} style={smallBtn}>
          + Teach
        </button>
      </div>
      {targets.length === 0 && <div style={hint}>Jog/IK the arm, then Teach a point.</div>}
      {targets.map((t) => (
        <div key={t.id} style={targetRow}>
          <span>{t.name}</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => addMove(t.id, 'MoveJ')} style={tag}>
              J
            </button>
            <button onClick={() => addMove(t.id, 'MoveL')} style={tag}>
              L
            </button>
            <button onClick={() => removeTarget(t.id)} style={del}>
              ×
            </button>
          </span>
        </div>
      ))}

      <div style={rowBetween}>
        <div style={head}>Program</div>
        <span style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => addWait(1)} style={smallBtn}>
            + Wait
          </button>
          <button onClick={() => addComment('note')} style={smallBtn}>
            + //
          </button>
        </span>
      </div>
      {program.instructions.length === 0 && <div style={hint}>Add a MoveJ/MoveL from a target.</div>}
      <ol style={list}>
        {program.instructions.map((ins, i) => (
          <li
            key={ins.id}
            onClick={() => select(ins.id)}
            style={{ ...instrRow, ...(selected === ins.id ? selRow : null) }}
          >
            <span style={{ opacity: 0.5, width: 18 }}>{i + 1}</span>
            <span style={{ flex: 1 }}>{label(ins, nameOf)}</span>
            <button onClick={(e) => (e.stopPropagation(), reorderInstruction(ins.id, -1))} style={tag}>
              ↑
            </button>
            <button onClick={(e) => (e.stopPropagation(), reorderInstruction(ins.id, 1))} style={tag}>
              ↓
            </button>
            <button onClick={(e) => (e.stopPropagation(), removeInstruction(ins.id))} style={del}>
              ×
            </button>
          </li>
        ))}
      </ol>

      {sel && (
        <div style={inspector}>
          {sel.kind === 'move' && (
            <>
              <label style={fld}>
                v
                <input
                  type="number"
                  step={0.05}
                  value={sel.speed}
                  onChange={(e) => updateInstruction(sel.id, { speed: Number(e.target.value) })}
                  style={numInp}
                />
              </label>
              <label style={fld}>
                blend
                <input
                  type="number"
                  step={0.005}
                  value={sel.blend}
                  onChange={(e) => updateInstruction(sel.id, { blend: Number(e.target.value) })}
                  style={numInp}
                />
              </label>
            </>
          )}
          {sel.kind === 'wait' && (
            <label style={fld}>
              seconds
              <input
                type="number"
                step={0.1}
                value={sel.seconds}
                onChange={(e) => updateInstruction(sel.id, { seconds: Number(e.target.value) })}
                style={numInp}
              />
            </label>
          )}
          {sel.kind === 'comment' && (
            <input
              value={sel.text}
              onChange={(e) => updateInstruction(sel.id, { text: e.target.value })}
              style={{ ...numInp, width: '100%' }}
            />
          )}
        </div>
      )}

      <button onClick={playing ? stop : play} style={{ ...playBtn, background: playing ? '#7a2a2a' : '#2a5a2a' }}>
        {playing ? '■ Stop' : '▶ Play'}
      </button>

      <div style={rowBetween}>
        <button onClick={() => setShowCode((v) => !v)} style={smallBtn}>
          {showCode ? '▾' : '▸'} Code
        </button>
        <select value={postId} onChange={(e) => setPostId(e.target.value)} style={vendorSel}>
          {postProcessors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {showCode && (
        <>
          <textarea readOnly value={code} style={codeArea} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copyCode} style={{ ...smallBtn, flex: 1 }}>
              Copy
            </button>
            <button onClick={saveCode} style={{ ...smallBtn, flex: 1 }}>
              Save .{post.extension}
            </button>
          </div>
        </>
      )}

      <div style={head}>Robot / URSim</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input value={host} onChange={(e) => setHost(e.target.value)} style={inp} placeholder="host" />
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
          style={{ ...inp, width: 70 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={send} style={{ ...smallBtn, flex: 1 }}>
          Send to robot
        </button>
        <button onClick={stopRobot} style={{ ...smallBtn, color: '#e88' }}>
          Stop
        </button>
      </div>
      {status && <div style={{ ...hint, marginTop: 6 }}>{status}</div>}

      <div style={head}>Project</div>
      <input
        value={program.name}
        onChange={(e) => setProgramName(e.target.value)}
        style={{ ...inp, marginBottom: 6 }}
        placeholder="project name"
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={saveProject} style={{ ...smallBtn, flex: 1 }}>
          Save project
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ ...smallBtn, flex: 1 }}>
          Load project
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={loadProjectFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

const panel: React.CSSProperties = {
  position: 'absolute',
  top: 56,
  right: 14,
  width: 260,
  maxHeight: 'calc(100% - 74px)',
  overflowY: 'auto',
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
  margin: '8px 0 8px'
}
const hint: React.CSSProperties = { opacity: 0.45, fontSize: 11, marginBottom: 8 }
const targetRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0'
}
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const instrRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 4px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, Consolas, monospace'
}
const selRow: React.CSSProperties = { background: 'rgba(120,150,255,0.18)' }
const smallBtn: React.CSSProperties = {
  padding: '3px 8px',
  background: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 11
}
const tag: React.CSSProperties = {
  padding: '1px 6px',
  background: '#333',
  color: '#ddd',
  border: '1px solid #484848',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11
}
const del: React.CSSProperties = { ...tag, color: '#e88', borderColor: '#5a3a3a' }
const inp: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '5px 8px',
  background: '#141414',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 5,
  fontSize: 12
}
const inspector: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 8,
  padding: '8px',
  background: 'rgba(120,150,255,0.10)',
  border: '1px solid #3a4a6a',
  borderRadius: 6
}
const fld: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontSize: 11,
  opacity: 0.85,
  flex: 1
}
const numInp: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  background: '#141414',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 5,
  fontSize: 12
}
const vendorSel: React.CSSProperties = {
  background: '#141414',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 5,
  fontSize: 11,
  padding: '3px 6px'
}
const codeArea: React.CSSProperties = {
  width: '100%',
  height: 150,
  marginTop: 6,
  background: '#141414',
  color: '#cfe',
  border: '1px solid #333',
  borderRadius: 6,
  padding: 8,
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: 11,
  resize: 'vertical',
  whiteSpace: 'pre'
}
const playBtn: React.CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '8px 0',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600
}
