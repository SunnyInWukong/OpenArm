import { Object3D } from 'three'
import type { URDFRobot } from 'urdf-loader'
import type { Tool } from '@shared/domain/tool'

// The TCP is a child frame of tool0 carrying the tool offset. Mounting it in the
// scene graph means FK/IK/teach/replay all read the tool tip for free.
const TCP_NAME = '__tcp'

function flangeOf(robot: URDFRobot): Object3D | undefined {
  return robot.links['tool0'] ?? robot.links['flange']
}

export function applyTool(robot: URDFRobot, tool: Tool): void {
  const flange = flangeOf(robot)
  if (!flange) return
  let tcp = flange.getObjectByName(TCP_NAME)
  if (!tcp) {
    tcp = new Object3D()
    tcp.name = TCP_NAME
    flange.add(tcp)
  }
  tcp.position.set(tool.x, tool.y, tool.z)
  const a = Math.hypot(tool.rx, tool.ry, tool.rz)
  if (a < 1e-9) tcp.quaternion.set(0, 0, 0, 1)
  else {
    const s = Math.sin(a / 2) / a
    tcp.quaternion.set(tool.rx * s, tool.ry * s, tool.rz * s, Math.cos(a / 2))
  }
  robot.updateMatrixWorld(true)
}

/** The working frame (tool tip) — the mounted TCP, or tool0 if no tool set yet. */
export function tcpFrame(robot: URDFRobot): Object3D {
  return robot.getObjectByName(TCP_NAME) ?? flangeOf(robot)!
}
