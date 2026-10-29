import { useState } from 'react'

export default function FormDespacho({ materiales, enviando, onEnviar, onCancelar }) {
  const [lineas, setLineas] = useState([{ material_id: '', cantidad: '' }])
  const [inconvenientes, setInconvenientes] = useState('')
  const [error, setError] = useState('')

  const cambiar = (i, campo) => (e) =>
    setLineas(lineas.map((l, j) => (j === i ? { ...l, [campo]: e.target.value } : l)))
  const unidadDe = (id) => materiales.find((m) => String(m.id) === String(id))?.unidad ?? ''

  function enviar(e) {
    e.preventDefault()
    const completas = lineas.filter((l) => l.material_id && Number(l.cantidad) > 0)
    if (completas.length === 0) { setError('Agrega al menos un material con su cantidad'); return }
    if (completas.length !== lineas.length) { setError('Hay líneas incompletas: complétalas o quítalas'); return }
    const ids = completas.map((l) => l.material_id)
    if (new Set(ids).size !== ids.length) { setError('Un material está repetido: súmalo en una sola línea'); return }
    setError('')
    onEnviar(
      inconvenientes,
      completas.map((l) => ({ material_id: Number(l.material_id), cantidad: Number(l.cantidad) }))
    )
  }

  return (
    <form className="seccion" onSubmit={enviar}>
      <h2 className="seccion-titulo">Reporte de producción</h2>
      <p className="mut sub">Anota lo que se gastó. Los metros de film también se registran aquí.</p>

      {materiales.length === 0 && <div className="error">No hay materiales activos. El administrador debe crearlos en Catálogo.</div>}

      {lineas.map((l, i) => (
        <div key={i} className="mat-linea">
          <select value={l.material_id} onChange={cambiar(i, 'material_id')}>
            <option value="">Elegir material…</option>
            {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <div className="unidad">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Cantidad"
              value={l.cantidad}
              onChange={cambiar(i, 'cantidad')}
              style={{ paddingRight: 72 }}
            />
            <span className="suf">{unidadDe(l.material_id)}</span>
          </div>
          {lineas.length > 1
            ? <button type="button" className="link" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>Quitar</button>
            : <span />}
        </div>
      ))}

      <button type="button" className="btn-anadir" onClick={() => setLineas([...lineas, { material_id: '', cantidad: '' }])}>
        + Agregar material
      </button>

      <label>Inconvenientes (opcional)
        <textarea
          placeholder="Algún problema con el archivo, la impresión o los materiales"
          value={inconvenientes}
          onChange={(e) => setInconvenientes(e.target.value)}
        />
      </label>

      {error && <div className="error">{error}</div>}
      <div className="acciones">
        <button className="btn pri" disabled={enviando}>{enviando ? 'Guardando…' : 'Confirmar despacho'}</button>
        <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}