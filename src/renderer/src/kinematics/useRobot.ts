import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import URDFLoader, { type URDFRobot } from 'urdf-loader'

const URDF_PATH = '/robots/ur5e/ur5e.urdf'

// Loads the URDF once and hands the live URDFRobot object up to App so both the
// viewport (<primitive>) and the jog panel mutate the same instance.
export function useRobot(path: string = URDF_PATH): {
  robot: URDFRobot | null
  error: string | null
} {
  const [robot, setRobot] = useState<URDFRobot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const manager = new LoadingManager()
    const loader = new URDFLoader(manager)
    loader.packages = { ur_description: '/robots/ur5e' }

    let cancelled = false
    loader.load(
      path,
      (loaded) => {
        if (cancelled) return
        // URDF is Z-up; three.js is Y-up.
        loaded.rotation.x = -Math.PI / 2
        setRobot(loaded)
      },
      undefined,
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    )

    return () => {
      cancelled = true
    }
  }, [path])

  return { robot, error }
}
