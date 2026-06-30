import type { Instruction, Program, Target } from '../domain/program'
import type { PostProcessor } from './post-processor'

// ABB RAPID — deliberately a very different target from URScript, to prove the
// program model is vendor-neutral: joints in DEGREES (MoveAbsJ jointtarget),
// positions in MM + orientation as a QUATERNION (robtarget), speeddata, tool0.

const DEG = 180 / Math.PI

function n(x: number): string {
  return x.toFixed(3)
}

/** rotation vector (axis*angle, rad) -> quaternion [w, x, y, z] */
export function rotVecToQuat(rx: number, ry: number, rz: number): [number, number, number, number] {
  const a = Math.hypot(rx, ry, rz)
  if (a < 1e-9) return [1, 0, 0, 0]
  const s = Math.sin(a / 2) / a
  return [Math.cos(a / 2), rx * s, ry * s, rz * s]
}

function ident(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1')
  return s.length ? s : 'OpenArm'
}

function emit(ins: Instruction, byId: Map<string, Target>): string[] {
  switch (ins.kind) {
    case 'move': {
      const t = byId.get(ins.targetId)
      if (!t) return [`    ! missing target ${ins.targetId}`]
      const v = `[${n(ins.speed * 1000)},500,5000,1000]`
      if (ins.move === 'MoveJ') {
        const j = t.joints.map((q) => n(q * DEG)).join(',')
        return [
          `    ! MoveJ -> ${t.name}`,
          `    MoveAbsJ [[${j}],[9E9,9E9,9E9,9E9,9E9,9E9]], ${v}, fine, tool0;`
        ]
      }
      const p = t.pose
      const [qw, qx, qy, qz] = rotVecToQuat(p.rx, p.ry, p.rz)
      const pos = `[${n(p.x * 1000)},${n(p.y * 1000)},${n(p.z * 1000)}]`
      const ori = `[${n(qw)},${n(qx)},${n(qy)},${n(qz)}]`
      return [
        `    ! MoveL -> ${t.name}`,
        `    MoveL [${pos},${ori},[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]], ${v}, fine, tool0;`
      ]
    }
    case 'wait':
      return [`    WaitTime ${n(ins.seconds)};`]
    case 'setdo':
      return [`    SetDO do_${ins.pin}, ${ins.value ? 1 : 0};`]
    case 'comment':
      return [`    ! ${ins.text}`]
  }
}

function generate(program: Program, targets: Target[]): string {
  const byId = new Map(targets.map((t) => [t.id, t]))
  const mod = ident(program.name || 'OpenArm')
  const lines = [`MODULE ${mod}`, `  PROC main()`]
  for (const ins of program.instructions) lines.push(...emit(ins, byId))
  lines.push('  ENDPROC', 'ENDMODULE')
  return lines.join('\n') + '\n'
}

export const rapid: PostProcessor = {
  id: 'rapid',
  label: 'ABB RAPID',
  extension: 'mod',
  generate
}
