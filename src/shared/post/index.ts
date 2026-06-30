import type { PostProcessor } from './post-processor'
import { urscript } from './urscript'
import { rapid } from './rapid'

export const postProcessors: PostProcessor[] = [urscript, rapid]

export function getPost(id: string): PostProcessor {
  return postProcessors.find((p) => p.id === id) ?? urscript
}

export type { PostProcessor }
