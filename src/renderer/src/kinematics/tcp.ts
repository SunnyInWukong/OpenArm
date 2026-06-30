import { Matrix4, Quaternion, Vector3 } from 'three'
import type { URDFRobot } from 'urdf-loader'

// TCP pose in the UR controller 'base' frame, in URScript format:
// position in metres, orientation as a rotation vector (axis * angle, radians) —
// exactly what movel(p[...]) and the teach pendant report.
export interface TcpPose {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

const _inv = new Matrix4()
const _rel = new Matrix4()
const _p = new Vector3()
const _q = new Quaternion()
const _s = new Vector3()

export function computeTcpPose(robot: URDFRobot): TcpPose {
  robot.updateMatrixWorld(true)
  const base = robot.links['base'] ?? robot.links['base_link']
  const tool = robot.links['tool0'] ?? robot.links['flange']

  // tool relative to base (cancels the Y-up display rotation applied to the root)
  _rel.copy(_inv.copy(base.matrixWorld).invert()).multiply(tool.matrixWorld)
  _rel.decompose(_p, _q, _s)

  // quaternion -> rotation vector
  const w = Math.min(1, Math.max(-1, _q.w))
  const angle = 2 * Math.acos(w)
  const sin = Math.sqrt(1 - w * w)
  const k = sin < 1e-6 ? 0 : angle / sin

  return { x: _p.x, y: _p.y, z: _p.z, rx: _q.x * k, ry: _q.y * k, rz: _q.z * k }
}
