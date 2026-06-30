import type { OpenArmApi } from '@shared/ipc/types'

declare global {
  interface Window {
    openarm: OpenArmApi
  }
}

export {}
