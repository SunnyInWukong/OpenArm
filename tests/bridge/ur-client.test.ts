import net from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardStop, frameProgram, sendScript } from '../../src/main/bridge/ur-client'

// Real loopback TCP server stands in for URSim — verifies the bridge actually
// connects and writes the expected bytes, without needing the Docker container.

let server: net.Server | null = null

function listen(onData: (chunk: string) => void): Promise<number> {
  return new Promise((resolve) => {
    server = net.createServer((sock) => sock.on('data', (d) => onData(d.toString())))
    server.listen(0, '127.0.0.1', () => {
      resolve((server!.address() as net.AddressInfo).port)
    })
  })
}

afterEach(() => {
  server?.close()
  server = null
})

describe('frameProgram', () => {
  it('ensures exactly one trailing newline', () => {
    expect(frameProgram('movej([0])')).toBe('movej([0])\n')
    expect(frameProgram('movej([0])\n')).toBe('movej([0])\n')
  })
})

describe('sendScript', () => {
  it('connects and writes the newline-terminated script', async () => {
    let received = ''
    const port = await listen((c) => (received += c))
    const res = await sendScript('127.0.0.1', port, 'def p():\nend\np()')
    expect(res.ok).toBe(true)
    expect(res.bytes).toBe(Buffer.byteLength('def p():\nend\np()\n'))
    // server actually got the bytes
    await new Promise((r) => setTimeout(r, 20))
    expect(received).toBe('def p():\nend\np()\n')
  })

  it('reports an error when nothing is listening', async () => {
    const res = await sendScript('127.0.0.1', 1, 'x', 500)
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('dashboardStop', () => {
  it('sends the stop line to the dashboard port', async () => {
    let received = ''
    const port = await listen((c) => (received += c))
    const res = await dashboardStop('127.0.0.1', port)
    expect(res.ok).toBe(true)
    await new Promise((r) => setTimeout(r, 20))
    expect(received).toBe('stop\n')
  })
})
