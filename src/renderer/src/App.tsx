import { useCallback, useEffect, useState } from 'react'
import { useRobot } from './kinematics/useRobot'
import { movableJointNames, solveIK, toolWorldPose } from './kinematics/ik'
import { initReplay, stepReplay } from './kinematics/replay'
import { computeTcpPose } from './kinematics/tcp'
import { importCad, occtReady } from './cad/import'
import { ensureBVH, robotCollisions } from './collision'
import { applyTool } from './kinematics/tool'
import { useStore } from './state/store'
import RobotViewport from './viewport/RobotViewport'
import AppBar from './panels/AppBar'
import JogPanel from './panels/JogPanel'
import ProgramPanel from './panels/ProgramPanel'
import PartsPanel from './panels/PartsPanel'

export default function App() {
  const { robot, error } = useRobot()
  const tool = useStore((s) => s.tool)

  // keep the mounted TCP frame in sync with the configured tool offset
  useEffect(() => {
    if (robot) applyTool(robot, tool)
  }, [robot, tool])

  // one shared re-render signal: jog sliders and IK drag both mutate the same
  // robot object; bumping this refreshes the panel's angle + TCP readouts.
  const [, setTick] = useState(0)
  const onChange = useCallback(() => setTick((t) => t + 1), [])

  // keyboard shortcuts (ignored while typing in a field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = useStore.getState()
      if (e.key === ' ') {
        e.preventDefault()
        s.playing ? s.stop() : s.play()
      } else if (e.key === 'Escape') {
        s.select(null)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selected) {
          e.preventDefault()
          s.removeInstruction(s.selected)
        }
      } else if (e.key === 'h' || e.key === 'Home') {
        if (robot) {
          for (const n of movableJointNames(robot)) robot.setJointValue(n, 0)
          onChange()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [robot, onChange])

  // dev console handle for poking the robot / kinematics
  // ponytail: handy debug aid in alpha; gate behind import.meta.env.DEV at hardening.
  useEffect(() => {
    if (robot)
      (window as unknown as Record<string, unknown>).__oa = {
        robot,
        solveIK,
        movableJointNames,
        toolWorldPose,
        computeTcpPose,
        initReplay,
        stepReplay,
        useStore,
        importCad,
        occtReady,
        ensureBVH,
        robotCollisions
      }
  }, [robot])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RobotViewport robot={robot} error={error} onChange={onChange} />

      <AppBar />

      {!robot && (
        <div style={overlay}>{error ? `Failed to load robot: ${error}` : 'Loading UR5e…'}</div>
      )}

      {robot && <JogPanel robot={robot} onChange={onChange} />}
      {robot && <ProgramPanel robot={robot} />}
      <PartsPanel />
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 15,
  padding: '10px 18px',
  background: 'rgba(28,28,28,0.9)',
  border: '1px solid #333',
  borderRadius: 8,
  fontSize: 13,
  opacity: 0.85,
  pointerEvents: 'none'
}
