import type { Instruction, Program, Target } from '../domain/program'
import { DEFAULT_TOOL, type Tool } from '../domain/tool'
import type { PostProcessor } from './post-processor'

// Universal Robots URScript. The program's Target.pose is already metres +
// rotation vector (base frame), so movel(p[...]) is a direct emit; movej uses
// the stored joint vector (radians). Accels are sensible UR defaults.
const MOVEJ_ACCEL = 1.4 // rad/s^2
const MOVEL_ACCEL = 1.2 // m/s^2

function ident(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1')
  return s.length ? s : 'program'
}

function num(n: number): string {
  return n.toFixed(6)
}

function emit(ins: Instruction, byId: Map<string, Target>): string[] {
  switch (ins.kind) {
    case 'move': {
      const t = byId.get(ins.targetId)
      if (!t) return [`  # missing target ${ins.targetId}`]
      if (ins.move === 'MoveJ') {
        const q = t.joints.map(num).join(', ')
        return [
          `  # MoveJ -> ${t.name}`,
          `  movej([${q}], a=${num(MOVEJ_ACCEL)}, v=${num(ins.speed)}, r=${num(ins.blend)})`
        ]
      }
      const p = t.pose
      const pose = [p.x, p.y, p.z, p.rx, p.ry, p.rz].map(num).join(', ')
      return [
        `  # MoveL -> ${t.name}`,
        `  movel(p[${pose}], a=${num(MOVEL_ACCEL)}, v=${num(ins.speed)}, r=${num(ins.blend)})`
      ]
    }
    case 'wait':
      return [`  sleep(${num(ins.seconds)})`]
    case 'setdo':
      return [`  set_digital_out(${ins.pin}, ${ins.value ? 'True' : 'False'})`]
    case 'comment':
      return [`  # ${ins.text}`]
  }
}

function generate(program: Program, targets: Target[], tool: Tool = DEFAULT_TOOL): string {
  const byId = new Map(targets.map((t) => [t.id, t]))
  const fn = ident(program.name || 'openarm_program')
  const tcp = [tool.x, tool.y, tool.z, tool.rx, tool.ry, tool.rz].map(num).join(', ')
  const lines = [`def ${fn}():`, `  set_tcp(p[${tcp}])`]
  for (const ins of program.instructions) lines.push(...emit(ins, byId))
  lines.push('end', `${fn}()`)
  return lines.join('\n') + '\n'
}

export const urscript: PostProcessor = {
  id: 'urscript',
  label: 'Universal Robots (URScript)',
  extension: 'script',
  generate
}
