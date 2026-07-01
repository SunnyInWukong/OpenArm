import type { Instruction, Program, Target } from '../domain/program'
import { DEFAULT_TOOL, isIdentityTool, type Tool } from '../domain/tool'
import type { PostProcessor } from './post-processor'
import { quatToEulerZYXdeg, rotVecToQuat } from './rot'

// KUKA KRL (.src). Joint moves are PTP with axis values in DEGREES; linear moves
// are LIN with a Cartesian frame {X,Y,Z mm, A,B,C degrees} where A/B/C are the
// KUKA yaw/pitch/roll (Z,Y,X) angles. A third, quite different target from
// URScript and RAPID — proves the program model stays vendor-neutral.

const DEG = 180 / Math.PI

function n(x: number): string {
  return x.toFixed(3)
}

function ident(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1')
  return s.length ? s : 'openarm'
}

function frame(x: number, y: number, z: number, rx: number, ry: number, rz: number): string {
  const [A, B, C] = quatToEulerZYXdeg(rotVecToQuat(rx, ry, rz))
  return `{X ${n(x * 1000)}, Y ${n(y * 1000)}, Z ${n(z * 1000)}, A ${n(A)}, B ${n(B)}, C ${n(C)}}`
}

function emit(ins: Instruction, byId: Map<string, Target>): string[] {
  switch (ins.kind) {
    case 'move': {
      const t = byId.get(ins.targetId)
      if (!t) return [`  ; missing target ${ins.targetId}`]
      if (ins.move === 'MoveJ') {
        const a = t.joints.map((q, i) => `A${i + 1} ${n(q * DEG)}`).join(', ')
        return [`  ; MoveJ -> ${t.name}`, `  PTP {${a}}`]
      }
      const p = t.pose
      return [
        `  ; MoveL -> ${t.name} (v=${n(ins.speed)} m/s)`,
        `  $VEL.CP = ${n(ins.speed)}`,
        `  LIN ${frame(p.x, p.y, p.z, p.rx, p.ry, p.rz)}`
      ]
    }
    case 'wait':
      return [`  WAIT SEC ${n(ins.seconds)}`]
    case 'setdo':
      // KUKA outputs are 1-indexed
      return [`  $OUT[${ins.pin + 1}] = ${ins.value ? 'TRUE' : 'FALSE'}`]
    case 'comment':
      return [`  ; ${ins.text}`]
  }
}

function generate(program: Program, targets: Target[], tool: Tool = DEFAULT_TOOL): string {
  const byId = new Map(targets.map((t) => [t.id, t]))
  const name = ident(program.name || 'openarm')
  const lines = [`DEF ${name}()`]
  if (!isIdentityTool(tool)) {
    lines.push(`  $TOOL = ${frame(tool.x, tool.y, tool.z, tool.rx, tool.ry, tool.rz)}`)
  }
  for (const ins of program.instructions) lines.push(...emit(ins, byId))
  lines.push('END')
  return lines.join('\n') + '\n'
}

export const kuka: PostProcessor = {
  id: 'kuka',
  label: 'KUKA KRL',
  extension: 'src',
  generate
}
