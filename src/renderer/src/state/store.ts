import { create } from 'zustand'
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

interface AppState {
  targets: Target[]
  program: Program
  selected: string | null // instruction id
  playing: boolean

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
}

export const useStore = create<AppState>((set, get) => ({
  targets: [],
  program: emptyProgram(),
  selected: null,
  playing: false,

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
  }
}))

function pushInstr(program: Program, instr: Instruction): Program {
  return { ...program, instructions: [...program.instructions, instr] }
}
