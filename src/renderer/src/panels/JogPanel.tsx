import { useMemo, useState } from 'react'
import type { URDFJoint, URDFRobot } from 'urdf-loader'
import { computeTcpPose } from '../kinematics/tcp'
import { movableJointNames, toolWorldPose } from '../kinematics/ik'
import { classifyConfig, configLabel, enumerateIK, jointDist } from '../kinematics/ik-config'

const DEG = 180 / Math.PI
const TWO_PI = Math.PI * 2

function range(j: URDFJoint): [number, number] {
  const lo = Number(j.limit.lower)
  const hi = Number(j.limit.upper)
  // continuous joints report lower == upper (== 0); give them a full turn each way
  return hi > lo ? [lo, hi] : [-TWO_PI, TWO_PI]
}

export default function JogPanel({ robot, onChange }: { robot: URDFRobot; onChange: () => void }) {
  const joints = useMemo(
    () =>
      Object.entries(robot.joints).filter(
        ([, j]) => j.jointType === 'revolute' || j.jointType === 'continuous'
      ) as [string, URDFJoint][],
    [robot]
  )

  // recomputed every render; App's tick re-renders us after jog or IK drag
  const tcp = computeTcpPose(robot)
  const [configTxt, setConfigTxt] = useState('')

  function flipConfig() {
    const names = movableJointNames(robot)
    const cur = toolWorldPose(robot)
    const sols = enumerateIK(robot, names, cur.pos, cur.quat)
    const curJoints = names.map((n) => Number(robot.joints[n].angle))
    if (sols.length <= 1) {
      setConfigTxt(`1 reachable config · ${configLabel(classifyConfig(curJoints))}`)
      return
    }
    let idx = sols.findIndex((s) => jointDist(s, curJoints) < 0.05)
    if (idx < 0) idx = 0
    const next = (idx + 1) % sols.length
    for (let i = 0; i < names.length; i++) robot.setJointValue(names[i], sols[next][i])
    onChange()
    setConfigTxt(`config ${next + 1}/${sols.length} · ${configLabel(classifyConfig(sols[next]))}`)
  }

  function setJoint(name: string, valueRad: number) {
    robot.setJointValue(name, valueRad)
    onChange()
  }

  function home() {
    for (const [name] of joints) robot.setJointValue(name, 0)
    onChange()
  }

  return (
    <div style={panel}>
      <div style={head}>Joints</div>
      {joints.map(([name, j]) => {
        const [lo, hi] = range(j)
        const angle = Number(j.angle)
        return (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={rowLabel}>
              <span>{name.replace(/_joint$/, '')}</span>
              <span style={{ opacity: 0.8 }}>{(angle * DEG).toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min={lo * DEG}
              max={hi * DEG}
              step={0.5}
              value={angle * DEG}
              onChange={(e) => setJoint(name, Number(e.target.value) / DEG)}
              style={{ width: '100%' }}
            />
          </div>
        )
      })}

      <button onClick={home} style={btn}>
        Home (all 0)
      </button>

      <button onClick={flipConfig} style={btn}>
        Flip config →
      </button>
      {configTxt && (
        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10, fontFamily: 'ui-monospace, monospace' }}>
          {configTxt}
        </div>
      )}

      <div style={head}>TCP — base frame</div>
      <div style={mono}>
        <div>X {tcp.x.toFixed(4)} m</div>
        <div>Y {tcp.y.toFixed(4)} m</div>
        <div>Z {tcp.z.toFixed(4)} m</div>
        <div style={{ marginTop: 4 }}>Rx {tcp.rx.toFixed(4)}</div>
        <div>Ry {tcp.ry.toFixed(4)}</div>
        <div>Rz {tcp.rz.toFixed(4)}</div>
      </div>
    </div>
  )
}

const panel: React.CSSProperties = {
  position: 'absolute',
  top: 56,
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
  margin: '6px 0 10px',
  opacity: 0.7,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontSize: 11
}
const rowLabel: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 3
}
const btn: React.CSSProperties = {
  width: '100%',
  margin: '4px 0 14px',
  padding: '6px 0',
  background: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer'
}
const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  lineHeight: 1.5,
  opacity: 0.9
}
