import { create } from 'zustand'
import type { Mesh, Object3D } from 'three'
import {
  emptyProgram,
  newId,
  reorder,
  type Instruction,
  type MoveType,
  type Pose,
  type Program,
  type Target
} from '@shared/domain/program'
import type { ProjectFile } from '@shared/domain/project'

// A workcell part (imported CAD). Holds a live three object; not yet persisted
// in the saved project. ponytail: persist by embedding/refencing source files later.
export interface Part {
  id: string
  name: string
  object: Object3D
}

interface AppState {
  targets: Target[]
  program: Program
  selected: string | null // instruction id
  playing: boolean
  parts: Part[]

  addTarget(name: string, joints: number[], pose: Pose): Target
  removeTarget(id: string): void

  addMove(targetId: string, move: MoveType): void
  addWait(seconds: number): void
  addComment(text: string): void
  removeInstruction(id: string): void
  reorderInstruction(id: string, delta: number): void
  select(id: string | null): void

  play(): void
  stop(): void

  loadProject(project: ProjectFile): void

  addPart(name: string, object: Object3D): void
  removePart(id: string): void
}

export const useStore = create<AppState>((set, get) => ({
  targets: [],
  program: emptyProgram(),
  selected: null,
  playing: false,
  parts: [],

  addTarget(name, joints, pose) {
    const t: Target = { id: newId(), name, joints: [...joints], pose }
    set((s) => ({ targets: [...s.targets, t] }))
    return t
  },
  removeTarget(id) {
    set((s) => ({
      targets: s.targets.filter((t) => t.id !== id),
      // drop any moves that referenced it
      program: {
        ...s.program,
        instructions: s.program.instructions.filter(
          (i) => i.kind !== 'move' || i.targetId !== id
        )
      }
    }))
  },

  addMove(targetId, move) {
    const speed = move === 'MoveL' ? 0.25 : 1.0
    const instr: Instruction = { kind: 'move', id: newId(), move, targetId, speed }
    set((s) => ({ program: pushInstr(s.program, instr) }))
  },
  addWait(seconds) {
    set((s) => ({ program: pushInstr(s.program, { kind: 'wait', id: newId(), seconds }) }))
  },
  addComment(text) {
    set((s) => ({ program: pushInstr(s.program, { kind: 'comment', id: newId(), text }) }))
  },
  removeInstruction(id) {
    set((s) => ({
      program: {
        ...s.program,
        instructions: s.program.instructions.filter((i) => i.id !== id)
      },
      selected: s.selected === id ? null : s.selected
    }))
  },
  reorderInstruction(id, delta) {
    set((s) => {
      const idx = s.program.instructions.findIndex((i) => i.id === id)
      if (idx < 0) return {}
      return {
        program: { ...s.program, instructions: reorder(s.program.instructions, idx, delta) }
      }
    })
  },
  select(id) {
    set({ selected: id })
  },

  play() {
    if (get().program.instructions.some((i) => i.kind === 'move')) set({ playing: true })
  },
  stop() {
    set({ playing: false })
  },

  loadProject(project) {
    set({ targets: project.targets, program: project.program, selected: null, playing: false })
  },

  addPart(name, object) {
    set((s) => ({ parts: [...s.parts, { id: newId(), name, object }] }))
  },
  removePart(id) {
    set((s) => {
      const part = s.parts.find((p) => p.id === id)
      part?.object.traverse((o) => {
        const mesh = o as Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
      return { parts: s.parts.filter((p) => p.id !== id) }
    })
  }
}))

function pushInstr(program: Program, instr: Instruction): Program {
  return { ...program, instructions: [...program.instructions, instr] }
}
