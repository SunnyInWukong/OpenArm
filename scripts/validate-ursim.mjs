// Reproducible end-to-end validation against the official UR simulator (URSim).
//
// Start URSim, then run `npm run validate:ursim`. The script powers on the
// simulated robot, sends a URScript `movej` in exactly the shape OpenArm's
// post-processor emits, and reads the realtime joint feedback to confirm the
// robot actually reached the commanded target.
//
//   docker run --rm -d --name ursim -p 29999:29999 -p 30001-30004:30001-30004 \
//     -p 6080:6080 universalrobots/ursim_e-series
//   npm run validate:ursim
//
import net from 'node:net'

const HOST = process.env.UR_HOST || '127.0.0.1'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitDashboard(timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((res) => {
      const s = net.connect(29999, HOST)
      s.once('connect', () => (s.destroy(), res(true)))
      s.once('error', () => res(false))
    })
    if (ok) return true
    await sleep(3000)
  }
  return false
}

async function dash() {
  const s = net.connect(29999, HOST)
  let buf = ''
  s.on('data', (d) => (buf += d.toString()))
  await sleep(1000)
  return {
    banner: () => buf.trim(),
    cmd: async (c) => {
      const before = buf.length
      s.write(c + '\n')
      await sleep(1000)
      return buf.slice(before).trim()
    },
    close: () => s.destroy()
  }
}

// realtime (30003): int size(4) + double time(8) + 5×double[6] targets(240) → q_actual at 252
function readQActual(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const s = net.connect(30003, HOST)
    let buf = Buffer.alloc(0)
    const to = setTimeout(() => (s.destroy(), reject(new Error('realtime timeout'))), timeoutMs)
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d])
      if (buf.length >= 300) {
        clearTimeout(to)
        s.destroy()
        resolve(Array.from({ length: 6 }, (_, i) => buf.readDoubleBE(252 + i * 8)))
      }
    })
    s.on('error', (e) => (clearTimeout(to), reject(e)))
  })
}

function sendScript(script) {
  return new Promise((res, rej) => {
    const s = net.connect(30002, HOST)
    s.on('connect', () => s.write(script, () => setTimeout(() => (s.destroy(), res()), 400)))
    s.on('error', rej)
  })
}

const round = (q) => (Array.isArray(q) ? q.map((v) => +v.toFixed(3)) : q)

;(async () => {
  if (!(await waitDashboard(200000))) {
    console.error('URSim dashboard never came up on ' + HOST + ':29999')
    process.exit(1)
  }
  const d = await dash()
  const banner = d.banner()
  await d.cmd('power on')
  await sleep(1500)
  await d.cmd('brake release')
  await sleep(7000)
  const mode = await d.cmd('robotmode')
  const safety = await d.cmd('safetystatus')

  const qBefore = await readQActual().catch((e) => 'rt-fail: ' + e.message)

  const target = [1.0, -1.2, 1.0, -1.0, 1.5, 0.5]
  const script = `def openarm_validate():\n  movej([${target
    .map((v) => v.toFixed(6))
    .join(', ')}], a=1.200000, v=1.000000)\nend\nopenarm_validate()\n`
  await sendScript(script)
  await sleep(6000)

  const qAfter = await readQActual().catch((e) => 'rt-fail: ' + e.message)

  let pass = false
  let moved = null
  if (Array.isArray(qBefore) && Array.isArray(qAfter)) {
    const maxDelta = Math.max(...qAfter.map((v, i) => Math.abs(v - qBefore[i])))
    const errToTarget = Math.max(...qAfter.map((v, i) => Math.abs(v - target[i])))
    moved = { maxJointDelta: +maxDelta.toFixed(4), errToTarget: +errToTarget.toFixed(4) }
    pass = errToTarget < 0.01
  }

  console.log(JSON.stringify({ banner, mode, safety, qBefore: round(qBefore), qAfter: round(qAfter), target, moved, pass }, null, 2))
  d.close()
  process.exit(pass ? 0 : 1)
})()
