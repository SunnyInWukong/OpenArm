import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '@shared/ipc/channels'
import type {
  OpenArmApi,
  UrSendScriptRequest,
  UrStopRequest
} from '@shared/ipc/types'

const api: OpenArmApi = {
  ur: {
    sendScript: (req: UrSendScriptRequest) => ipcRenderer.invoke(IpcChannel.UrSendScript, req),
    stop: (req: UrStopRequest) => ipcRenderer.invoke(IpcChannel.UrStop, req)
  }
}

try {
  contextBridge.exposeInMainWorld('openarm', api)
} catch (error) {
  console.error(error)
}
