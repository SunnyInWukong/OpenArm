import type { Program, Target } from './program'

// Project file = the savable document. Plain JSON; validated on load at the
// file trust boundary. ponytail: hand-rolled shape guard, swap to zod if the
// schema grows past a few fields.

export interface ProjectFile {
  version: 1
  name: string
  targets: Target[]
  program: Program
}

export function serializeProject(name: string, targets: Target[], program: Program): string {
  const project: ProjectFile = { version: 1, name, targets, program }
  return JSON.stringify(project, null, 2)
}

export type ParseResult = { ok: true; project: ProjectFile } | { ok: false; error: string }

export function parseProject(json: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'invalid JSON' }
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'not an object' }
  const d = data as Record<string, unknown>
  if (d.version !== 1) return { ok: false, error: `unsupported version ${String(d.version)}` }
  if (!Array.isArray(d.targets)) return { ok: false, error: 'missing targets[]' }
  const prog = d.program as Record<string, unknown> | undefined
  if (!prog || !Array.isArray(prog.instructions)) return { ok: false, error: 'missing program.instructions[]' }
  for (const t of d.targets as Record<string, unknown>[]) {
    if (typeof t.id !== 'string' || !Array.isArray(t.joints) || !t.pose) {
      return { ok: false, error: 'malformed target' }
    }
  }
  return { ok: true, project: data as ProjectFile }
}
