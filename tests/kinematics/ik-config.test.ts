import { describe, expect, it } from 'vitest'
import { angDist, classifyConfig, configLabel, jointDist } from '../../src/renderer/src/kinematics/ik-config'

describe('angDist', () => {
  it('wraps around 2π', () => {
    expect(angDist(0, Math.PI * 2)).toBeCloseTo(0, 9)
    expect(angDist(Math.PI, -Math.PI)).toBeCloseTo(0, 9)
    expect(angDist(0.1, -0.1)).toBeCloseTo(0.2, 9)
  })
})

describe('jointDist', () => {
  it('is the max per-joint angular distance', () => {
    expect(jointDist([0, 0, 0], [0.1, 0.3, 0])).toBeCloseTo(0.3, 9)
    // same config expressed 2π apart is distance 0
    expect(jointDist([0], [Math.PI * 2])).toBeCloseTo(0, 9)
  })
})

describe('classifyConfig', () => {
  it('labels elbow / wrist / shoulder from the joint vector', () => {
    expect(classifyConfig([0, -1, 1, -1, 1, 0])).toEqual({ elbow: 'up', wrist: 'flip', shoulder: 'right' })
    expect(classifyConfig([Math.PI, -1, -1, -1, -1, 0])).toEqual({
      elbow: 'down',
      wrist: 'no-flip',
      shoulder: 'left'
    })
  })
  it('renders a compact label', () => {
    expect(configLabel({ elbow: 'up', wrist: 'flip', shoulder: 'right' })).toBe('S→ E↑ W↺')
  })
})
