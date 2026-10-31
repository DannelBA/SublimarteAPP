import { useLayoutEffect, useRef } from 'react'

const MAX_DIGITOS = 10

// 1500000 -> "1.500.000"   |   12.5 -> "12,5"
function formatear(valor) {
  if (valor === '' || valor == null) return ''
  const [entero, decimal] = String(valor).split('.')
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimal !== undefined ? `${miles},${decimal}` : miles
}

export default function InputMoneda({ value, onChange, decimales = false, ...resto }) {
  const ref = useRef(null)
  const cursor = useRef(null)
  const permitidos = decimales ? /[^\d,]/g : /\D/g

  function cambiar(e) {
    const crudo = e.target.value
    const pos = e.target.selectionStart ?? crudo.length

    // Cuántos números (y comas) hay antes del cursor, para devolverlo al mismo lugar
    cursor.current = crudo.slice(0, pos).replace(permitidos, '').length

    const limpio = crudo.replace(permitidos, '')
    const [entero, ...otros] = limpio.split(',')
    let nuevo = entero.replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITOS)
    if (decimales && otros.length) nuevo += '.' + otros.join('').slice(0, 4)

    onChange(nuevo)
  }

  // Después de pintar el número con puntos, devolver el cursor donde estaba
  useLayoutEffect(() => {
    if (cursor.current === null || !ref.current) return
    const texto = ref.current.value
    let pos = texto.length
    if (cursor.current === 0) {
      pos = 0
    } else {
      let cuenta = 0
      for (let i = 0; i < texto.length; i++) {
        if (/[\d,]/.test(texto[i])) cuenta++
        if (cuenta === cursor.current) { pos = i + 1; break }
      }
    }
    ref.current.setSelectionRange(pos, pos)
    cursor.current = null
  })

  return (
    <input
      ref={ref}
      type="text"
      inputMode={decimales ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={formatear(value)}
      onChange={cambiar}
      {...resto}
    />
  )
}