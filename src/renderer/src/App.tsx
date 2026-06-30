import { useCallback, useEffect, useState } from 'react'
import { useRobot } from './kinematics/useRobot'
import { movableJointNames, solveIK, toolWorldPose } from './kinematics/ik'
import { initReplay, stepReplay } from './kinematics/replay'
import { computeTcpPose } from './kinematics/tcp'
import { useStore } from './state/store'
import RobotViewport from './viewport/RobotViewport'
import JogPanel from './panels/JogPanel'
import ProgramPanel from './panels/ProgramPanel'

export default function App() {
  const { robot, error } = useRobot()

  // one shared re-render signal: jog sliders and IK drag both mutate the same
  // robot object; bumping this refreshes the panel's angle + TCP readouts.
  const [, setTick] = useState(0)
  const onChange = useCallback(() => setTick((t) => t + 1), [])

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
        useStore
      }
  }, [robot])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RobotViewport robot={robot} error={error} onChange={onChange} />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          zIndex: 10,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
          opacity: 0.7,
          pointerEvents: 'none'
        }}
      >
        OpenArm — UR5e
      </div>

      {robot && <JogPanel robot={robot} onChange={onChange} />}
      {robot && <ProgramPanel robot={robot} />}
    </div>
  )
}
