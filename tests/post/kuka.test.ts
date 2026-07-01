import { describe, expect, it } from 'vitest'
import type { Program, Target } from '../../src/shared/domain/program'
import { kuka } from '../../src/shared/post/kuka'
import { quatToEulerZYXdeg, rotVecToQuat } from '../../src/shared/post/rot'

const targets: Target[] = [
  { id: 't1', name: 'P1', joints: [0, -1.5708, 1.5708, 0, 1.5708, 0], pose: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 } },
  { id: 't2', name: 'P2', joints: [0, 0, 0, 0, 0, 0], pose: { x: 0.3, y: 0.2, z: 0.5, rx: 0, ry: 0, rz: 0 } }
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

const expected = `DEF demo()
  ; MoveJ -> P1
  PTP {A1 0.000, A2 -90.000, A3 90.000, A4 0.000, A5 90.000, A6 0.000}
  ; MoveL -> P2 (v=0.250 m/s)
  $VEL.CP = 0.250
  LIN {X 300.000, Y 200.000, Z 500.000, A 0.000, B 0.000, C 0.000}
  WAIT SEC 1.500
  $OUT[1] = TRUE
  ; done
END
`

describe('kuka post-processor', () => {
  it('compiles the same program to exact KRL (golden)', () => {
    expect(kuka.generate(program, targets)).toBe(expected)
  })
})

describe('quatToEulerZYXdeg', () => {
  it('90 deg about Z gives A=90, B=C=0', () => {
    const [A, B, C] = quatToEulerZYXdeg(rotVecToQuat(0, 0, Math.PI / 2))
    expect(A).toBeCloseTo(90, 4)
    expect(B).toBeCloseTo(0, 4)
    expect(C).toBeCloseTo(0, 4)
  })
})
