declare module 'occt-import-js' {
  export interface OcctMesh {
    name?: string
    color?: [number, number, number]
    attributes: {
      position: { array: number[] }
      normal?: { array: number[] }
    }
    index?: { array: number[] }
  }
  export interface OcctResult {
    success: boolean
    meshes: OcctMesh[]
  }
  export interface OcctModule {
    ReadStepFile(data: Uint8Array, params: unknown): OcctResult
    ReadIgesFile(data: Uint8Array, params: unknown): OcctResult
    ReadBrepFile(data: Uint8Array, params: unknown): OcctResult
  }
  export default function occtimportjs(opts?: {
    locateFile?: (path: string) => string
  }): Promise<OcctModule>
}
