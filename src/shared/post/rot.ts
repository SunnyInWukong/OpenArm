// Rotation conversions shared by post-processors. Pure math, no three.js.

/** rotation vector (axis*angle, rad) -> quaternion [w, x, y, z] */
export function rotVecToQuat(rx: number, ry: number, rz: number): [number, number, number, number] {
  const a = Math.hypot(rx, ry, rz)
  if (a < 1e-9) return [1, 0, 0, 0]
  const s = Math.sin(a / 2) / a
  return [Math.cos(a / 2), rx * s, ry * s, rz * s]
}

const DEG = 180 / Math.PI

/**
 * quaternion [w,x,y,z] -> KUKA A,B,C in degrees (yaw/pitch/roll about Z, Y, X;
 * i.e. R = Rz(A)·Ry(B)·Rx(C)).
 */
export function quatToEulerZYXdeg(q: [number, number, number, number]): [number, number, number] {
  const [w, x, y, z] = q
  const A = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
  const sinB = Math.max(-1, Math.min(1, 2 * (w * y - z * x)))
  const B = Math.asin(sinB)
  const C = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
  return [A * DEG, B * DEG, C * DEG]
}
