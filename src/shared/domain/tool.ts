// Tool / TCP: the offset from the robot flange to the working point (gripper
// tip, weld tip, etc.). Metres + rotation vector (rad), same convention as Pose.
export interface Tool {
  name: string
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

export const DEFAULT_TOOL: Tool = { name: 'tool0', x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }

export function isIdentityTool(t: Tool): boolean {
  return t.x === 0 && t.y === 0 && t.z === 0 && t.rx === 0 && t.ry === 0 && t.rz === 0
}
