import { describe, expect, it } from 'vitest'
import type { Program, Target } from '../../src/shared/domain/program'
import { urscript } from '../../src/shared/post/urscript'

const targets: Target[] = [
  {
    id: 't1',
    name: 'P1',
    joints: [0, -1.5708, 1.5708, 0, 1.5708, 0],
    pose: { x: 0.4, y: -0.1, z: 0.3, rx: 2.2214, ry: -2.2214, rz: 0 }
  },
  {
    id: 't2',
    name: 'P2',
    joints: [0.5, -1.0, 1.0, -0.5, 1.2, 0.3],
    pose: { x: 0.3, y: 0.2, z: 0.5, rx: 0, ry: 3.1416, rz: 0 }
  }
]

const program: Program = {
  name: 'demo',
  instructions: [
    { kind: 'move', id: 'i1', move: 'MoveJ', targetId: 't1', speed: 1.0, blend: 0 },
    { kind: 'move', id: 'i2', move: 'MoveL', targetId: 't2', speed: 0.25, blend: 0 },
    { kind: 'wait', id: 'i3', seconds: 1.5 },
    { kind: 'setdo', id: 'i4', pin: 0, value: true },
    { kind: 'comment', id: 'i5', text: 'done' }
  ]
}

const expected = `def demo():
  set_tcp(p[0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000])
  # MoveJ -> P1
  movej([0.000000, -1.570800, 1.570800, 0.000000, 1.570800, 0.000000], a=1.400000, v=1.000000, r=0.000000)
  # MoveL -> P2
  movel(p[0.300000, 0.200000, 0.500000, 0.000000, 3.141600, 0.000000], a=1.200000, v=0.250000, r=0.000000)
  sleep(1.500000)
  set_digital_out(0, True)
  # done
end
demo()
`

describe('urscript post-processor', () => {
  it('compiles a program to exact URScript (golden)', () => {
    expect(urscript.generate(program, targets)).toBe(expected)
  })

  it('sanitizes an invalid def name', () => {
    const out = urscript.generate({ name: '3 axis!', instructions: [] }, [])
    expect(out.startsWith('def _3_axis_():')).toBe(true)
    expect(out.trimEnd().endsWith('_3_axis_()')).toBe(true)
  })

  it('emits a placeholder for a missing target', () => {
    const out = urscript.generate(
      { name: 'x', instructions: [{ kind: 'move', id: 'm', move: 'MoveJ', targetId: 'nope', speed: 1, blend: 0 }] },
      []
    )
    expect(out).toContain('# missing target nope')
  })

  it('emits the tool TCP offset in set_tcp', () => {
    const out = urscript.generate({ name: 'x', instructions: [] }, [], {
      name: 'grip',
      x: 0,
      y: 0,
      z: 0.15,
      rx: 0,
      ry: 0,
      rz: 0
    })
    expect(out).toContain('set_tcp(p[0.000000, 0.000000, 0.150000, 0.000000, 0.000000, 0.000000])')
  })

  it('emits a blend radius', () => {
    const out = urscript.generate(
      { name: 'x', instructions: [{ kind: 'move', id: 'm', move: 'MoveL', targetId: 't2', speed: 0.25, blend: 0.05 }] },
      targets
    )
    expect(out).toContain('v=0.250000, r=0.050000)')
  })
})
