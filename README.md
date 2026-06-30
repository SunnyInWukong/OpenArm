# OpenArm

Open-source, offline robot programming and simulation for industrial arms — a free
alternative to seat-licensed offline programming suites. Windows-first, local-first.

> **Status:** early alpha. Working tool for Universal Robots — generated programs
> are **validated end-to-end against the official UR simulator (URSim)** — with
> ABB RAPID export, collision detection, and CAD import. More vendors and features
> in progress.

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

## Build & deploy

OpenArm packages to a Windows installer with electron-builder. It has **no native
node modules** (the heavy bits — OpenCascade, the vector math — are wasm/pure JS),
so packaging is plain: no `node-gyp`, no ABI rebuilds.

### Build an installer locally

```bash
npm run build:win     # electron-vite build + electron-builder --win
```

The signed-or-unsigned NSIS installer lands in `dist/OpenArm-<version>-setup.exe`.
Add an app icon at `build/icon.ico` (256×256) before release; without it the
default Electron icon is used.

> On some Windows machines electron-builder's first run fails extracting the
> `winCodeSign` resource (a symlink-in-zip issue). Easiest fix is to let CI build
> the installer instead (below) — GitHub's `windows-latest` runner is unaffected.

### CI / releases (GitHub Actions)

- **`.github/workflows/ci.yml`** — every push/PR runs typecheck, tests, and a build.
- **`.github/workflows/release.yml`** — pushing a tag builds the installer on a
  clean Windows runner and attaches it to a GitHub Release:

```bash
npm version patch          # bump version, creates a commit + tag
git push --follow-tags     # triggers the release workflow
```

The installer appears under the repo's **Releases**. No secrets to configure —
the workflow uses the built-in `GITHUB_TOKEN`.

### Run against a real robot or URSim

OpenArm talks to a UR controller over TCP (script interface `30002`, dashboard
`29999`). To validate without hardware, run the free simulator in Docker
(install Docker Desktop first):

```bash
docker run --rm -it -p 5900:5900 -p 6080:6080 -p 29999:29999 -p 30001-30004:30001-30004 \
  universalrobots/ursim_e-series
```

Open <http://localhost:6080/vnc.html>, then **Send to robot** at `127.0.0.1:30002`.

To check the whole pipeline automatically (powers on the sim, sends an
OpenArm-shaped `movej`, and confirms the robot reaches the target via realtime
joint feedback):

```bash
npm run validate:ursim
```

## License

MIT © Wukoric LLC
