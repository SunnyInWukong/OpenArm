import { Quaternion, Vector3 } from 'three'
import type { URDFRobot } from 'urdf-loader'
import type { Instruction, Target } from '@shared/domain/program'
import { movableJointNames, solveIK, toolWorldPose } from './ik'

// Compiles a program into timed segments and animates the robot through them.
// MoveJ interpolates joint space; MoveL interpolates the TCP line (lerp + slerp)
// and re-solves IK each frame. Wait holds. Comment/SetDO are no-ops in sim.

type Seg =
  | { type: 'movej'; dur: number; start: number[]; end: number[] }
  | {
      type: 'movel'
      dur: number
      startPos: Vector3
      startQuat: Quaternion
      endPos: Vector3
      endQuat: Quaternion
    }
  | { type: 'wait'; dur: number; hold: number[] }

export interface ReplayState {
  names: string[]
  segs: Seg[]
  clock: number
  total: number
}

const MIN_DUR = 0.15

function readJoints(robot: URDFRobot, names: string[]): number[] {
  return names.map((n) => Number(robot.joints[n].angle))
}

function applyJoints(robot: URDFRobot, names: string[], q: number[]): void {
  for (let i = 0; i < names.length; i++) robot.setJointValue(names[i], q[i])
}

function fkWorld(robot: URDFRobot, names: string[], q: number[]) {
  applyJoints(robot, names, q)
  return toolWorldPose(robot)
}

export function initReplay(
  robot: URDFRobot,
  instructions: Instruction[],
  targets: Target[]
): ReplayState {
  const names = movableJointNames(robot)
  const startJoints = readJoints(robot, names)
  const byId = new Map(targets.map((t) => [t.id, t]))

  const segs: Seg[] = []
  let cursor = startJoints

  for (const ins of instructions) {
    if (ins.kind === 'move') {
      const tgt = byId.get(ins.targetId)
      if (!tgt) continue
      const end = tgt.joints
      if (ins.move === 'MoveJ') {
        const maxDelta = Math.max(...end.map((v, i) => Math.abs(v - cursor[i])), 0)
        segs.push({ type: 'movej', dur: Math.max(maxDelta / ins.speed, MIN_DUR), start: cursor, end })
      } else {
        const a = fkWorld(robot, names, cursor)
        const b = fkWorld(robot, names, end)
        const dist = a.pos.distanceTo(b.pos)
        segs.push({
          type: 'movel',
          dur: Math.max(dist / ins.speed, MIN_DUR),
          startPos: a.pos,
          startQuat: a.quat,
          endPos: b.pos,
          endQuat: b.quat
        })
      }
      cursor = end
    } else if (ins.kind === 'wait') {
      segs.push({ type: 'wait', dur: Math.max(ins.seconds, 0), hold: cursor })
    }
    // comment / setdo: nothing to animate
  }

  // restore the arm to where it started; the first frame takes over from here
  applyJoints(robot, names, startJoints)
  robot.updateMatrixWorld(true)

  const total = segs.reduce((s, seg) => s + seg.dur, 0)
  return { names, segs, clock: 0, total }
}

const _p = new Vector3()
const _q = new Quaternion()

/** Advance the replay by dt seconds, mutating the robot. Calls onDone at the end. */
export function stepReplay(
  st: ReplayState,
  robot: URDFRobot,
  dt: number,
  onDone: () => void
): void {
  if (st.segs.length === 0) {
    onDone()
    return
  }
  st.clock += dt

  // locate the active segment; past the end, clamp to the final pose
  let t = st.clock
  let seg: Seg | undefined
  let u = 1
  for (const s of st.segs) {
    if (t < s.dur) {
      seg = s
      u = s.dur > 0 ? Math.min(1, Math.max(0, t / s.dur)) : 1
      break
    }
    t -= s.dur
  }
  if (!seg) {
    seg = st.segs[st.segs.length - 1]
    u = 1
  }

  if (seg.type === 'movej') {
    const q = seg.start.map((v, i) => v + (seg.end[i] - v) * u)
    applyJoints(robot, st.names, q)
    robot.updateMatrixWorld(true)
  } else if (seg.type === 'movel') {
    _p.copy(seg.startPos).lerp(seg.endPos, u)
    _q.copy(seg.startQuat).slerp(seg.endQuat, u)
    solveIK(robot, st.names, _p, _q, { maxIters: 30 })
  }
  // wait: hold pose, nothing to do

  if (st.clock >= st.total) onDone()
}
