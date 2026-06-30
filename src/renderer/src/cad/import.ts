import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import occtimportjs, { type OcctModule, type OcctResult } from 'occt-import-js'
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url'

// Imports CAD into a three.js Group. STL via three's loader; STEP/IGES via the
// OpenCascade wasm. Industrial CAD is millimetres + Z-up, so the group is scaled
// to metres and rotated to the viewer's Y-up to sit correctly beside the robot.
// ponytail: assumes mm; add a unit selector if a user imports a metre/inch file.

let occtPromise: Promise<OcctModule> | null = null
function getOcct(): Promise<OcctModule> {
  return (occtPromise ??= occtimportjs({ locateFile: () => occtWasmUrl }))
}

/** Loads the OpenCascade wasm and confirms it's callable (verification aid). */
export async function occtReady(): Promise<boolean> {
  const m = await getOcct()
  return typeof m.ReadStepFile === 'function'
}

function orient(group: Group): Group {
  group.scale.setScalar(0.001)
  group.rotation.x = -Math.PI / 2
  return group
}

function defaultMat(color?: [number, number, number]): MeshStandardMaterial {
  const c = color ? new Color().setRGB(color[0], color[1], color[2]) : new Color(0x9aa0a6)
  return new MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.75 })
}

export async function importCad(name: string, buf: ArrayBuffer): Promise<Group> {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'stl') return orient(stlGroup(buf))
  if (ext === 'step' || ext === 'stp') return orient(occtGroup((await getOcct()).ReadStepFile(new Uint8Array(buf), null)))
  if (ext === 'iges' || ext === 'igs') return orient(occtGroup((await getOcct()).ReadIgesFile(new Uint8Array(buf), null)))
  throw new Error(`unsupported CAD type: .${ext}`)
}

function stlGroup(buf: ArrayBuffer): Group {
  const geo = new STLLoader().parse(buf)
  geo.computeVertexNormals()
  const group = new Group()
  group.add(new Mesh(geo, defaultMat()))
  return group
}

function occtGroup(res: OcctResult): Group {
  if (!res || !res.success) throw new Error('CAD parse failed')
  const group = new Group()
  for (const m of res.meshes) {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(m.attributes.position.array), 3))
    if (m.index) geo.setIndex(new BufferAttribute(new Uint32Array(m.index.array), 1))
    if (m.attributes.normal) {
      geo.setAttribute('normal', new BufferAttribute(new Float32Array(m.attributes.normal.array), 3))
    } else {
      geo.computeVertexNormals()
    }
    group.add(new Mesh(geo, defaultMat(m.color)))
  }
  return group
}
