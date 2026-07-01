# Security & Safety

OpenArm is early-alpha, open-source software (MIT, no warranty). This document is
written so you can decide, with eyes open, whether you're comfortable running it —
and run it safely if you do.

## Privacy & network posture

- **Local-first.** No accounts, no telemetry, no analytics, no auto-update, no
  phone-home of any kind.
- **The only network connection OpenArm ever makes** is a TCP connection to the
  robot/simulator **host and port you type into "Send to robot"** (UR script port
  `30002`, dashboard `29999`). That's it. The robot model, meshes, and CAD import
  (OpenCascade wasm) are all bundled and loaded locally.
- **Verify this yourself:** the only networking code in the codebase is a single
  `net.Socket` in [`src/main/bridge/ur-client.ts`](src/main/bridge/ur-client.ts).
  It's MIT-licensed — read it, or run the app behind a firewall.

## Running safely on real hardware

Robots can cause serious injury. Before running any generated program on a
physical arm:

1. **Simulate first.** Point "Send to robot" at URSim (the official UR simulator)
   and watch the whole program run. `npm run validate:ursim` proves the pipeline
   drives the robot to the commanded pose.
2. **Read the code.** OpenArm emits plain-text URScript — open it and check every
   move, speed, blend, and the tool (TCP) offset before you run it.
3. **Keep the e-stop within reach**, run at reduced speed on the first execution,
   and clear people from the work envelope.
4. **Follow your site's risk assessment** and the robot manufacturer's safety
   guidance. OpenArm is a programming tool, not a safety-rated system — you are
   responsible for safe operation.

OpenArm never moves your robot on its own: motion happens only when you explicitly
click **Send to robot**, and it only runs the program you built and can inspect.

## Supply chain

Dependencies are pinned in `package-lock.json` and are all widely used,
permissively licensed OSS (three.js, React, urdf-loader, three-mesh-bvh,
occt-import-js / OpenCascade, zustand). `npm audit` is clean.

## Installers

Release installers are **not yet code-signed**, so Windows SmartScreen will warn
on first launch. If that's a concern, **run or build from source** — then you're
running exactly the code in this repository:

```bash
npm install
npm run dev        # run from source
# or
npm run build:win  # build your own installer
```

## Reporting an issue

Found a security problem or unsafe behavior? Please open a
[GitHub issue](../../issues) or a private security advisory on the repo. Anything
that could affect physical safety is triaged first.
