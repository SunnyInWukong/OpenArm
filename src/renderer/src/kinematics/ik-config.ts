import type { Quaternion, Vector3 } from 'three'
import type { URDFRobot } from 'urdf-loader'
import { movableJointNames, solveIK } from './ik'

// Enumerate the distinct joint configurations that reach a given TCP pose, so
// the user can flip between them (elbow up/down, wrist flip, shoulder L/R) —
// the deterministic-configuration feature, built on the trusted numerical
// solver by seeding it across the configuration space and de-duplicating.
// ponytail: multi-seed enumeration; a closed-form UR solver would guarantee all
// 8 and be faster, but this is robust and needs no DH/frame calibration.

const TWO_PI = Math.PI * 2

export function angDist(a: number, b: number): number {
  const d = Math.abs(a - b) % TWO_PI
  return Math.min(d, TWO_PI - d)
}

export function jointDist(a: number[], b: number[]): number {
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, angDist(a[i], b[i]))
  return m
}

// Seeds spanning shoulder (θ1), elbow (θ3), wrist (θ5) branches.
function seeds(n: number): number[][] {
  if (n !== 6) return [new Array(n).fill(0)]
  const out: number[][] = []
  for (const s1 of [0, Math.PI]) {
    for (const s3 of [1.4, -1.4]) {
      for (const s5 of [1.4, -1.4]) {
        out.push([s1, -1.0, s3, -1.0, s5, 0])
      }
    }
  }
  return out
}

export function enumerateIK(
  robot: URDFRobot,
  jointNames: string[],
  pos: Vector3,
  quat: Quaternion
): number[][] {
  const saved = jointNames.map((name) => Number(robot.joints[name].angle))
  const sols: number[][] = []

  for (const seed of seeds(jointNames.length)) {
    for (let i = 0; i < jointNames.length; i++) robot.setJointValue(jointNames[i], seed[i])
    const r = solveIK(robot, jointNames, pos, quat, { maxIters: 80 })
    if (!r.converged) continue
    const q = jointNames.map((name) => Number(robot.joints[name].angle))
    if (!sols.some((s) => jointDist(s, q) < 0.05)) sols.push(q)
  }

  for (let i = 0; i < jointNames.length; i++) robot.setJointValue(jointNames[i], saved[i])
  robot.updateMatrixWorld(true)
  return sols
}

export interface Config {
  elbow: 'up' | 'down'
  wrist: 'flip' | 'no-flip'
  shoulder: 'left' | 'right'
}

/** Classify a UR joint vector into its arm configuration (joints in chain order). */
export function classifyConfig(joints: number[]): Config {
  return {
    elbow: joints[2] >= 0 ? 'up' : 'down',
    wrist: joints[4] >= 0 ? 'flip' : 'no-flip',
    shoulder: angDist(joints[0], 0) <= Math.PI / 2 ? 'right' : 'left'
  }
}

export function configLabel(c: Config): string {
  const e = c.elbow === 'up' ? 'E↑' : 'E↓'
  const w = c.wrist === 'flip' ? 'W↺' : 'W·'
  const s = c.shoulder === 'right' ? 'S→' : 'S←'
  return `${s} ${e} ${w}`
}

export { movableJointNames }
