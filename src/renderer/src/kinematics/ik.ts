import { Quaternion, Vector3 } from 'three'
import type { URDFRobot } from 'urdf-loader'
import { tcpFrame } from './tool'

// Numerical inverse kinematics by damped least squares, run directly on
// urdf-loader's forward kinematics — no DH derivation, no frame mapping, no
// extra dependency. Works in three.js world space (same frame as the gizmo).
// ponytail: numeric DLS for any serial arm; analytic UR IK (8 configs) is the
// upgrade when program targets need deterministic configuration selection.

export function movableJointNames(robot: URDFRobot): string[] {
  return Object.entries(robot.joints)
    .filter(([, j]) => j.jointType === 'revolute' || j.jointType === 'continuous')
    .map(([name]) => name)
}

const _pos = new Vector3()
const _quat = new Quaternion()
const _inv = new Quaternion()
const _d = new Quaternion()

function toolWorld(robot: URDFRobot, pos: Vector3, quat: Quaternion): void {
  robot.updateMatrixWorld(true)
  const t = tcpFrame(robot)
  t.getWorldPosition(pos)
  t.getWorldQuaternion(quat)
}

export function toolWorldPose(robot: URDFRobot): { pos: Vector3; quat: Quaternion } {
  const pos = new Vector3()
  const quat = new Quaternion()
  toolWorld(robot, pos, quat)
  return { pos, quat }
}

// rotation vector (axis*angle, shortest) taking qFrom -> qTo, written into out[off..off+2]
function rotVecInto(qFrom: Quaternion, qTo: Quaternion, out: number[], off: number): void {
  _d.copy(qTo).multiply(_inv.copy(qFrom).invert())
  if (_d.w < 0) {
    _d.x = -_d.x
    _d.y = -_d.y
    _d.z = -_d.z
    _d.w = -_d.w
  }
  const w = Math.min(1, Math.max(-1, _d.w))
  const angle = 2 * Math.acos(w)
  const s = Math.sqrt(1 - w * w)
  const k = s < 1e-6 ? 0 : angle / s
  out[off] = _d.x * k
  out[off + 1] = _d.y * k
  out[off + 2] = _d.z * k
}

// Solve 6x6 A x = b by Gaussian elimination with partial pivoting.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    ;[M[col], M[piv]] = [M[piv], M[col]]
    const d = M[col][col] || 1e-12
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col] / d
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]
    }
  }
  return M.map((row, i) => row[n] / (M[i][i] || 1e-12))
}

export interface IKResult {
  converged: boolean
  error: number
  iters: number
}

const _cur = new Vector3()
const _curQ = new Quaternion()
const _per = new Vector3()
const _perQ = new Quaternion()

export function solveIK(
  robot: URDFRobot,
  jointNames: string[],
  targetPos: Vector3,
  targetQuat: Quaternion,
  opts: { maxIters?: number; tol?: number; lambda?: number } = {}
): IKResult {
  const n = jointNames.length
  const maxIters = opts.maxIters ?? 60
  const tol = opts.tol ?? 1e-4
  const lambda = opts.lambda ?? 0.08
  const h = 1e-4

  const q = jointNames.map((nm) => Number(robot.joints[nm].angle))
  const apply = (qv: number[]): void => {
    for (let i = 0; i < n; i++) robot.setJointValue(jointNames[i], qv[i])
  }

  const e = new Array(6).fill(0)
  const J: number[][] = Array.from({ length: 6 }, () => new Array(n).fill(0))
  const rv = [0, 0, 0]

  let err = Infinity
  let iter = 0
  for (; iter < maxIters; iter++) {
    apply(q)
    toolWorld(robot, _cur, _curQ)
    e[0] = targetPos.x - _cur.x
    e[1] = targetPos.y - _cur.y
    e[2] = targetPos.z - _cur.z
    rotVecInto(_curQ, targetQuat, e, 3)
    err = Math.hypot(...e)
    if (err < tol) break

    for (let i = 0; i < n; i++) {
      const save = q[i]
      q[i] = save + h
      apply(q)
      toolWorld(robot, _per, _perQ)
      q[i] = save
      J[0][i] = (_per.x - _cur.x) / h
      J[1][i] = (_per.y - _cur.y) / h
      J[2][i] = (_per.z - _cur.z) / h
      rotVecInto(_curQ, _perQ, rv, 0)
      J[3][i] = rv[0] / h
      J[4][i] = rv[1] / h
      J[5][i] = rv[2] / h
    }

    // A = J Jᵀ + λ²I  (6x6);  y = A⁻¹ e;  dq = Jᵀ y
    const A: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0))
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        let s = 0
        for (let k = 0; k < n; k++) s += J[r][k] * J[c][k]
        A[r][c] = s
      }
      A[r][r] += lambda * lambda
    }
    const y = solveLinear(A, e)
    for (let i = 0; i < n; i++) {
      let s = 0
      for (let r = 0; r < 6; r++) s += J[r][i] * y[r]
      q[i] += s
      const lim = robot.joints[jointNames[i]].limit
      const lo = Number(lim.lower)
      const hi = Number(lim.upper)
      if (hi > lo) q[i] = Math.min(hi, Math.max(lo, q[i]))
    }
  }

  apply(q)
  robot.updateMatrixWorld(true)
  return { converged: err < tol, error: err, iters: iter }
}
