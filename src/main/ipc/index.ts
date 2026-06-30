import { ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc/channels'
import type { UrSendScriptRequest, UrStopRequest } from '@shared/ipc/types'
import { dashboardStop, sendScript } from '../bridge/ur-client'

export function registerIpc(): void {
  ipcMain.handle(IpcChannel.UrSendScript, (_e, req: UrSendScriptRequest) =>
    sendScript(req.host, req.port, req.script)
  )
  ipcMain.handle(IpcChannel.UrStop, (_e, req: UrStopRequest) => dashboardStop(req.host))
}
