import type { Program, Target } from '../domain/program'

// A post-processor compiles the vendor-neutral program into a specific robot's
// native language. Adding a vendor = adding one of these + its golden test.
export interface PostProcessor {
  id: string
  label: string
  /** file extension without the dot, e.g. 'script' */
  extension: string
  generate(program: Program, targets: Target[]): string
}
