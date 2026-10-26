export default function Segmentado({ opciones, valor, onChange, etiquetas = {}, colores = {} }) {
  return (
    <div className="seg" role="radiogroup">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={valor === o}
          className={valor === o ? 'on' : ''}
          style={{ '--sel': colores[o] }}
          onClick={() => onChange(o)}
        >
          {etiquetas[o] ?? o}
        </button>
      ))}
    </div>
  )
}