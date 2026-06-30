// Vendor-neutral program model. Pure data + pure helpers, no three.js / Electron —
// the renderer drives a robot from it and (Pass 4) post-processors compile it to
// native robot code. Keep this file dependency-free.

/** TCP pose in the robot base frame, URScript convention: metres + rotation vector (rad). */
export interface Pose {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

/** A taught point: authoritative joint vector + its Cartesian pose for display/export. */
export interface Target {
  id: string
  name: string
  joints: number[]
  pose: Pose
}

export type MoveType = 'MoveJ' | 'MoveL'

export interface MoveInstruction {
  kind: 'move'
  id: string
  move: MoveType
  targetId: string
  /** MoveJ: rad/s, MoveL: m/s */
  speed: number
  /** corner blend radius in metres; 0 = stop exactly on the point (fine) */
  blend: number
}

export interface WaitInstruction {
  kind: 'wait'
  id: string
  seconds: number
}

export interface SetDOInstruction {
  kind: 'setdo'
  id: string
  pin: number
  value: boolean
}

export interface CommentInstruction {
  kind: 'comment'
  id: string
  text: string
}

export type Instruction =
  | MoveInstruction
  | WaitInstruction
  | SetDOInstruction
  | CommentInstruction

export interface Program {
  name: string
  instructions: Instruction[]
}

export function newId(): string {
  return crypto.randomUUID()
}

export function emptyProgram(name = 'untitled'): Program {
  return { name, instructions: [] }
}

/** Move an instruction by index delta, clamped. Returns a new array. */
export function reorder(items: Instruction[], index: number, delta: number): Instruction[] {
  const to = index + delta
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(to, 0, moved)
  return next
}
