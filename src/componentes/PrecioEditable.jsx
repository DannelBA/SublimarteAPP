import { useState } from 'react'
import { moneda } from '../utils'

export default function PrecioEditable({ precio, puedeCambiar, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  function empezar() {
    setValor(String(precio))
    setEditando(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const ok = await onGuardar(Number(valor))
    setGuardando(false)
    if (ok) setEditando(false)
  }

  if (!editando) {
    return (
      <>
        <b>{moneda(precio)}</b>
        {puedeCambiar && (
          <button type="button" className="link" onClick={empezar}>Cambiar</button>
        )}
      </>
    )
  }

  return (
    <form onSubmit={guardar} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="unidad" style={{ flex: 1, minWidth: 120 }}>
        <span className="pre">$</span>
        <input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus required />
      </div>
      <button className="btn pri" disabled={guardando}>{guardando ? '…' : 'Guardar'}</button>
      <button type="button" className="link" onClick={() => setEditando(false)}>Cancelar</button>
    </form>
  )
}