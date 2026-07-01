import { describe, expect, it } from 'vitest'
import type { Program, Target } from '../../src/shared/domain/program'
import { parseProject, serializeProject } from '../../src/shared/domain/project'

const targets: Target[] = [
  { id: 't1', name: 'P1', joints: [0, 1, 2, 3, 4, 5], pose: { x: 0.1, y: 0.2, z: 0.3, rx: 0, ry: 0, rz: 0 } }
]
const program: Program = {
  name: 'demo',
  instructions: [
    { kind: 'move', id: 'i1', move: 'MoveJ', targetId: 't1', speed: 1, blend: 0 },
    { kind: 'wait', id: 'i2', seconds: 2 }
  ]
}

describe('project serialize/parse', () => {
  it('round-trips losslessly', () => {
    const r = parseProject(serializeProject('demo', targets, program))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.project.name).toBe('demo')
      expect(r.project.targets).toEqual(targets)
      expect(r.project.program).toEqual(program)
    }
  })

  it('round-trips the tool', () => {
    const tool = { name: 'grip', x: 0, y: 0, z: 0.15, rx: 0, ry: 0, rz: 0 }
    const r = parseProject(serializeProject('demo', targets, program, tool))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.project.tool).toEqual(tool)
  })

  it('defaults the tool for older files without one', () => {
    const r = parseProject(JSON.stringify({ version: 1, name: 'x', targets: [], program: { instructions: [] } }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.project.tool.name).toBe('tool0')
  })

  it('rejects invalid JSON', () => {
    expect(parseProject('{not json').ok).toBe(false)
  })

  it('rejects an unsupported version', () => {
    const r = parseProject(JSON.stringify({ version: 2, targets: [], program: { instructions: [] } }))
    expect(r.ok).toBe(false)
  })

  it('rejects a malformed target', () => {
    const r = parseProject(JSON.stringify({ version: 1, targets: [{ id: 5 }], program: { instructions: [] } }))
    expect(r.ok).toBe(false)
  })
})
