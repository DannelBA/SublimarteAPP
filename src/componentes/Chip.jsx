import { ESTADOS } from '../utils'

export default function Chip({ estado }) {
  const e = ESTADOS[estado] || { t: estado, c: '#888' }
  return <span className="chip" style={{ '--c': e.c }}>{e.t}</span>
}