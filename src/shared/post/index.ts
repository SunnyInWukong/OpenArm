import type { PostProcessor } from './post-processor'
import { urscript } from './urscript'
import { rapid } from './rapid'
import { kuka } from './kuka'

export const postProcessors: PostProcessor[] = [urscript, rapid, kuka]

export function getPost(id: string): PostProcessor {
  return postProcessors.find((p) => p.id === id) ?? urscript
}

export type { PostProcessor }
