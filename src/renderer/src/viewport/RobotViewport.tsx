import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls, TransformControls } from '@react-three/drei'
import type { Mesh } from 'three'
import type { URDFRobot } from 'urdf-loader'
import { movableJointNames, solveIK, toolWorldPose } from '../kinematics/ik'
import { initReplay, stepReplay, type ReplayState } from '../kinematics/replay'
import { useStore } from '../state/store'

function Fallback({ error }: { error: string | null }) {
  return (
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color={error ? '#aa4444' : '#4488cc'} />
    </mesh>
  )
}

// Orange handle = the IK target. Dragging it solves the arm to reach it.
function IKGizmo({
  robot,
  mode,
  onChange,
  onReach
}: {
  robot: URDFRobot
  mode: 'translate' | 'rotate'
  onChange: () => void
  onReach: (reachable: boolean) => void
}) {
  const targetRef = useRef<Mesh>(null)
  const names = useMemo(() => movableJointNames(robot), [robot])

  useEffect(() => {
    const t = targetRef.current
    if (!t) return
    const pose = toolWorldPose(robot)
    t.position.copy(pose.pos)
    t.quaternion.copy(pose.quat)
  }, [robot])

  const onObjectChange = () => {
    const t = targetRef.current
    if (!t) return
    const r = solveIK(robot, names, t.position, t.quaternion)
    onReach(r.converged)
  }

  return (
    <TransformControls mode={mode} onObjectChange={onObjectChange} onMouseUp={() => onChange()}>
      <mesh ref={targetRef}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
    </TransformControls>
  )
}

// Drives the arm through the program when playing (lives inside the Canvas for useFrame).
function ReplayRunner({ robot, onChange }: { robot: URDFRobot; onChange: () => void }) {
  const playing = useStore((s) => s.playing)
  const stop = useStore((s) => s.stop)
  const stateRef = useRef<ReplayState | null>(null)

  useEffect(() => {
    if (playing) {
      const { program, targets } = useStore.getState()
      stateRef.current = initReplay(robot, program.instructions, targets)
    } else {
      stateRef.current = null
    }
  }, [playing, robot])

  useFrame((_, dt) => {
    const st = stateRef.current
    if (!st) return
    stepReplay(st, robot, dt, () => {
      stop()
      onChange()
    })
  })

  return null
}

export default function RobotViewport({
  robot,
  error,
  onChange
}: {
  robot: URDFRobot | null
  error: string | null
  onChange: () => void
}) {
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate')
  const [reachable, setReachable] = useState(true)

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [1.4, 1.1, 1.4], fov: 45, near: 0.01, far: 100 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />

        {robot ? (
          <>
            <primitive object={robot} />
            <IKGizmo robot={robot} mode={mode} onChange={onChange} onReach={setReachable} />
            <ReplayRunner robot={robot} onChange={onChange} />
          </>
        ) : (
          <Fallback error={error} />
        )}

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#444"
          cellColor="#2a2a2a"
          fadeDistance={12}
          infiniteGrid
        />
        <OrbitControls target={[0, 0.3, 0]} enableDamping makeDefault />
      </Canvas>

      {robot && (
        <div style={toolbar}>
          <button onClick={() => setMode((m) => (m === 'translate' ? 'rotate' : 'translate'))} style={btn}>
            IK: {mode}
          </button>
          {!reachable && <span style={{ color: '#ff6b6b', fontSize: 12 }}>unreachable</span>}
        </div>
      )}
    </>
  )
}

const toolbar: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 14,
  zIndex: 10,
  display: 'flex',
  gap: 10,
  alignItems: 'center'
}
const btn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  textTransform: 'capitalize'
}
