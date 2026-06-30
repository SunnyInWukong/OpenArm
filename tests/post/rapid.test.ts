import { describe, expect, it } from 'vitest'
import type { Program, Target } from '../../src/shared/domain/program'
import { rapid, rotVecToQuat } from '../../src/shared/post/rapid'

const targets: Target[] = [
  { id: 't1', name: 'P1', joints: [0, -1.5708, 1.5708, 0, 1.5708, 0], pose: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 } },
  { id: 't2', name: 'P2', joints: [0, 0, 0, 0, 0, 0], pose: { x: 0.3, y: 0.2, z: 0.5, rx: 0, ry: 0, rz: 0 } }
]

const program: Program = {
  name: 'demo',
  instructions: [
    { kind: 'move', id: 'i1', move: 'MoveJ', targetId: 't1', speed: 1.0 },
    { kind: 'move', id: 'i2', move: 'MoveL', targetId: 't2', speed: 0.25 },
    { kind: 'wait', id: 'i3', seconds: 1.5 },
    { kind: 'setdo', id: 'i4', pin: 0, value: true },
    { kind: 'comment', id: 'i5', text: 'done' }
  ]
}

const expected = `MODULE demo
  PROC main()
    ! MoveJ -> P1
    MoveAbsJ [[0.000,-90.000,90.000,0.000,90.000,0.000],[9E9,9E9,9E9,9E9,9E9,9E9]], [1000.000,500,5000,1000], fine, tool0;
    ! MoveL -> P2
    MoveL [[300.000,200.000,500.000],[1.000,0.000,0.000,0.000],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]], [250.000,500,5000,1000], fine, tool0;
    WaitTime 1.500;
    SetDO do_0, 1;
    ! done
  ENDPROC
ENDMODULE
`

describe('rapid post-processor', () => {
  it('compiles the same program to exact RAPID (golden)', () => {
    expect(rapid.generate(program, targets)).toBe(expected)
  })
})

describe('rotVecToQuat', () => {
  it('identity for zero rotation', () => {
    expect(rotVecToQuat(0, 0, 0)).toEqual([1, 0, 0, 0])
  })
  it('180deg about Y -> [0,0,1,0]', () => {
    const q = rotVecToQuat(0, Math.PI, 0)
    expect(q[0]).toBeCloseTo(0, 6)
    expect(q[1]).toBeCloseTo(0, 6)
    expect(q[2]).toBeCloseTo(1, 6)
    expect(q[3]).toBeCloseTo(0, 6)
  })
})
