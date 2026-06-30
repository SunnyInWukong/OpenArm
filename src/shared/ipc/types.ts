// Payload types per channel + the typed surface preload exposes to the renderer.

export interface UrSendScriptRequest {
  host: string
  port: number
  script: string
}
export interface UrSendScriptResponse {
  ok: boolean
  bytes?: number
  error?: string
}

export interface UrStopRequest {
  host: string
}
export interface UrStopResponse {
  ok: boolean
  error?: string
}

export interface OpenArmApi {
  ur: {
    sendScript(req: UrSendScriptRequest): Promise<UrSendScriptResponse>
    stop(req: UrStopRequest): Promise<UrStopResponse>
  }
}
