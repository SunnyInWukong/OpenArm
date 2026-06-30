# OpenArm

Open-source, offline robot programming and simulation for industrial arms — a free
alternative to seat-licensed offline programming suites. Windows-first, local-first.

> **Status:** early alpha. Working MVP for Universal Robots; more vendors and
> features in progress.

## What it does

- Load an industrial arm from a URDF and view it in 3D (ships with a **UR5e**).
- **Jog** joints (forward kinematics) within the robot's real joint limits.
- **Drag-to-reach** inverse kinematics — move the TCP with a gizmo; unreachable poses are flagged.
- **Teach** points and build a motion **program** (MoveJ / MoveL / Wait / comments).
- **Replay** the program in the viewport (MoveJ = joint space, MoveL = straight Cartesian line).
- **Post-process** the program to native robot code — **URScript** and **ABB RAPID** today.
- **Save/load** projects as plain JSON.
- **Send** a program to a UR controller or the free **URSim** simulator over TCP.

The motion program is vendor-neutral; supporting a new robot is one post-processor + one
golden test, not a rewrite.

## Stack

Electron + React 19 + three.js / react-three-fiber, built with electron-vite. Robot
rendering via [`urdf-loader`](https://github.com/gkjohnson/urdf-loaders); inverse
kinematics is a small damped-least-squares solver over the loaded kinematics. Pure,
framework-agnostic domain model and post-processors live in `src/shared`.

## Develop

```bash
npm install
npm run dev         # launch the app
npm test            # unit + golden-file tests
npm run typecheck
npm run build       # production build
```

## Validate against URSim (no hardware)

```bash
docker run --rm -it -p 5900:5900 -p 6080:6080 -p 29999:29999 -p 30001-30004:30001-30004 \
  universalrobots/ursim_e-series
```

Open the simulator UI at <http://localhost:6080/vnc.html>, then **Send to robot**
(`127.0.0.1:30002`) from OpenArm and watch your program run.

## License

MIT © Wukoric LLC
