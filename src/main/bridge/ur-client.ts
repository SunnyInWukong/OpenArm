import net from 'node:net'
import type {
  UrSendScriptResponse,
  UrStopResponse
} from '@shared/ipc/types'

// TCP client for a UR controller (real or URSim). Scripts go to the secondary
// client interface (30002); the controller compiles and runs whatever text it
// receives. Stop goes to the dashboard server (29999) as a fire-and-forget line.

/** A URScript program must arrive newline-terminated for the controller to run it. */
export function frameProgram(script: string): string {
  return script.endsWith('\n') ? script : script + '\n'
}

export function sendScript(
  host: string,
  port: number,
  script: string,
  timeoutMs = 5000
): Promise<UrSendScriptResponse> {
  return new Promise((resolve) => {
    const payload = frameProgram(script)
    const socket = new net.Socket()
    let settled = false
    const done = (r: UrSendScriptResponse): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(timeoutMs)
    socket.on('timeout', () => done({ ok: false, error: 'timeout' }))
    socket.on('error', (e) => done({ ok: false, error: e.message }))
    socket.connect(port, host, () => {
      socket.write(payload, () => done({ ok: true, bytes: Buffer.byteLength(payload) }))
    })
  })
}

export function dashboardStop(
  host: string,
  port = 29999,
  timeoutMs = 4000
): Promise<UrStopResponse> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const done = (r: UrStopResponse): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(timeoutMs)
    socket.on('timeout', () => done({ ok: false, error: 'timeout' }))
    socket.on('error', (e) => done({ ok: false, error: e.message }))
    socket.connect(port, host, () => {
      socket.write('stop\n', () => done({ ok: true }))
    })
  })
}
