import { BufferGeometry, Color, Matrix4, Mesh, type Material, type Object3D } from 'three'
import { computeBoundsTree } from 'three-mesh-bvh'

// Fast mesh-mesh collision detection via BVH. Scope: robot links vs imported
// parts (the common shop-floor crash). ponytail: self-collision (non-adjacent
// links) and per-frame throttling/broad-phase added if throughput needs it.

// Patch the prototype. The cast bypasses a return-type skew between
// three-mesh-bvh and the installed three; the global augmentation still types
// `geometry.boundsTree` / `.computeBoundsTree()` for use below.
;(BufferGeometry.prototype as unknown as Record<string, unknown>).computeBoundsTree = computeBoundsTree

export function ensureBVH(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh && m.geometry && !m.geometry.boundsTree) m.geometry.computeBoundsTree()
  })
}

function collectMeshes(root: Object3D): Mesh[] {
  const out: Mesh[] = []
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh && m.geometry?.boundsTree) out.push(m)
  })
  return out
}

const _m = new Matrix4()

/** Returns the uuids of robot meshes that intersect any part mesh. */
export function robotCollisions(robot: Object3D, parts: Object3D[]): Set<string> {
  const hits = new Set<string>()
  const partMeshes = parts.flatMap(collectMeshes)
  if (partMeshes.length === 0) return hits
  for (const rm of collectMeshes(robot)) {
    // runtime is a MeshBVH; types in this version mislabel it without intersectsGeometry
    const tree = rm.geometry.boundsTree as unknown as {
      intersectsGeometry(geometry: BufferGeometry, geometryToBvh: Matrix4): boolean
    }
    for (const pm of partMeshes) {
      _m.copy(rm.matrixWorld).invert().multiply(pm.matrixWorld)
      if (tree.intersectsGeometry(pm.geometry, _m)) {
        hits.add(rm.uuid)
        break
      }
    }
  }
  return hits
}

const RED = new Color(0x992222).getHex()

/** Tints colliding robot meshes red (emissive); restores the rest. */
export function highlight(robot: Object3D, hits: Set<string>): void {
  robot.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const raw of mats) {
      const mat = raw as Material & { emissive?: Color; userData: Record<string, unknown> }
      if (!mat?.emissive) continue
      if (mat.userData.origEmissive === undefined) mat.userData.origEmissive = mat.emissive.getHex()
      mat.emissive.set(hits.has(m.uuid) ? RED : (mat.userData.origEmissive as number))
    }
  })
}
