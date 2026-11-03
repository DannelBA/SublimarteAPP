import { useState } from 'react'
import { descargarRespaldo, ultimoRespaldo } from '../lib/respaldo'

export default function BotonRespaldo() {
  const [ultimo, setUltimo] = useState(ultimoRespaldo)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const dias = ultimo ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000) : null
  const toca = dias === null || dias >= 7
  const texto =
    dias === null
      ? 'Aún no has descargado ningún respaldo desde este dispositivo.'
      : dias === 0
        ? 'Último respaldo: hoy.'
        : `Último respaldo: hace ${dias} día${dias === 1 ? '' : 's'}.`

  async function descargar() {
    setOcupado(true)
    setError('')
    try {
      await descargarRespaldo()
      setUltimo(ultimoRespaldo())
    } catch (e) {
      setError(e.message)
    }
    setOcupado(false)
  }

  return (
    <div className="aviso" style={{ borderColor: toca ? 'var(--yel)' : 'var(--line)', background: toca ? undefined : 'none' }}>
      <span>
        <b>Respaldo de datos.</b> {texto} {toca && 'Conviene hacerlo una vez por semana.'}
        <span className="mut" style={{ display: 'block' }}>
          Incluye pedidos, diseños, materiales e historial. No incluye las imágenes.
        </span>
        {error && <span className="urg" style={{ display: 'block' }}>{error}</span>}
      </span>
      <button className="btn" disabled={ocupado} onClick={descargar}>
        {ocupado ? 'Preparando…' : 'Descargar Excel'}
      </button>
    </div>
  )
}