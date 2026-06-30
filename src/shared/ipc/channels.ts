// Canonical IPC channel names. Add a feature → add a channel here first, then
// its payload type (types.ts), main handler, and preload call.
export const IpcChannel = {
  UrSendScript: 'ur:send-script',
  UrStop: 'ur:stop'
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]
