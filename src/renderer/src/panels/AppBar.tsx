import { useStore } from '../state/store'

export default function AppBar() {
  const ikMode = useStore((s) => s.ikMode)
  const setIkMode = useStore((s) => s.setIkMode)
  const reachable = useStore((s) => s.reachable)
  const colliding = useStore((s) => s.colliding)

  return (
    <div style={bar}>
      <div style={brand}>
        <span style={dot} />
        <span style={{ fontWeight: 700, letterSpacing: 0.3, fontSize: 14 }}>OpenArm</span>
        <span style={chip}>UR5e</span>
      </div>

      <div style={right}>
        {colliding && <span style={collide}>⚠ COLLISION</span>}
        {!reachable && <span style={warn}>unreachable</span>}
        <div style={seg}>
          <button onClick={() => setIkMode('translate')} style={segBtn(ikMode === 'translate')}>
            Move
          </button>
          <button onClick={() => setIkMode('rotate')} style={segBtn(ikMode === 'rotate')}>
            Rotate
          </button>
        </div>
      </div>
    </div>
  )
}

const bar: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 44,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 14px',
  background: 'linear-gradient(#232323, #1c1c1c)',
  borderBottom: '1px solid #303030'
}
const brand: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 9 }
const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 4,
  background: '#39d353',
  boxShadow: '0 0 6px #39d353'
}
const chip: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#bcd',
  background: '#243',
  border: '1px solid #2f5a3f',
  borderRadius: 4,
  padding: '2px 7px'
}
const right: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const collide: React.CSSProperties = {
  color: '#fff',
  background: '#b22',
  padding: '3px 9px',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 700
}
const warn: React.CSSProperties = { color: '#ff9b3b', fontSize: 12, fontWeight: 600 }
const seg: React.CSSProperties = {
  display: 'flex',
  border: '1px solid #3a3a3a',
  borderRadius: 6,
  overflow: 'hidden'
}
function segBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#3a5a8a' : '#262626',
    color: active ? '#fff' : '#bbb'
  }
}
