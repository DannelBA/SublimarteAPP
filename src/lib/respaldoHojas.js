import { ESTADOS, ACCIONES } from '../utils.js'
import { fechaSerial, fechaHoraSerial } from './excel.js'

const dinero = (n) => ({ v: n, tipo: 'dinero' })
const fecha = (t) => ({ v: fechaSerial(t), tipo: 'fecha' })
const fechaHora = (t) => ({ v: fechaHoraSerial(t), tipo: 'fechaHora' })

// Convierte los pedidos (con todo lo que cuelga de ellos) en las hojas del Excel
export function armarHojas(pedidos, perfiles) {
  const nombres = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre]))
  const quien = (id) => nombres[id] ?? ''
  const reporteDe = (p) => (Array.isArray(p.reportes_produccion) ? p.reportes_produccion[0] : p.reportes_produccion)

  const hojaPedidos = {
    nombre: 'Pedidos',
    columnas: [
      { titulo: 'N°', ancho: 7 }, { titulo: 'Cliente', ancho: 28 }, { titulo: 'Teléfono', ancho: 14 },
      { titulo: 'Estado', ancho: 15 }, { titulo: 'Prioridad', ancho: 11 }, { titulo: 'Creado el', ancho: 17 },
      { titulo: 'Fecha límite', ancho: 13 }, { titulo: 'Entregado el', ancho: 17 }, { titulo: 'Precio', ancho: 14 },
      { titulo: 'Costo de materiales', ancho: 18 }, { titulo: 'Ganancia neta (entregados)', ancho: 24 },
      { titulo: 'Creado por', ancho: 18 }, { titulo: 'Tomado por', ancho: 18 }, { titulo: 'Observaciones', ancho: 36 },
    ],
    filas: [],
  }
  const hojaDisenos = {
    nombre: 'Diseños',
    columnas: [
      { titulo: 'Pedido', ancho: 8 }, { titulo: 'Cliente', ancho: 28 }, { titulo: 'Diseño', ancho: 8 },
      { titulo: 'Tipo de trabajo', ancho: 20 }, { titulo: 'Descripción', ancho: 50 },
      { titulo: 'Ancho (cm)', ancho: 11 }, { titulo: 'Alto (cm)', ancho: 11 }, { titulo: 'Cantidad', ancho: 10 },
    ],
    filas: [],
  }
  const hojaMateriales = {
    nombre: 'Materiales usados',
    columnas: [
      { titulo: 'Pedido', ancho: 8 }, { titulo: 'Cliente', ancho: 28 }, { titulo: 'Material', ancho: 24 },
      { titulo: 'Cantidad', ancho: 11 }, { titulo: 'Unidad', ancho: 10 },
      { titulo: 'Costo por unidad', ancho: 16 }, { titulo: 'Subtotal', ancho: 14 },
    ],
    filas: [],
  }
  const hojaHistorial = {
    nombre: 'Historial',
    columnas: [
      { titulo: 'Pedido', ancho: 8 }, { titulo: 'Fecha y hora', ancho: 18 }, { titulo: 'Acción', ancho: 22 },
      { titulo: 'De', ancho: 15 }, { titulo: 'A', ancho: 15 }, { titulo: 'Nota', ancho: 46 }, { titulo: 'Usuario', ancho: 18 },
    ],
    filas: [],
  }

  for (const p of pedidos) {
    const rep = reporteDe(p)
    const costo = rep ? rep.materiales_usados.reduce((s, m) => s + m.cantidad * m.costo_aplicado, 0) : null
    const entregado = p.estado === 'entregado'

    hojaPedidos.filas.push([
      p.numero, p.cliente_nombre, p.cliente_telefono, ESTADOS[p.estado]?.t ?? p.estado, p.prioridad,
      fechaHora(p.created_at), fecha(p.fecha_limite), fechaHora(p.fecha_entregado), dinero(Number(p.precio)),
      costo === null ? null : dinero(costo),
      entregado ? dinero(Number(p.precio) - (costo ?? 0)) : null,
      quien(p.creado_por), quien(p.tomado_por), p.observaciones,
    ])

    ;[...p.items_pedido].sort((a, b) => a.id - b.id).forEach((it, i) => {
      hojaDisenos.filas.push([
        p.numero, p.cliente_nombre, i + 1, it.tipos_trabajo?.nombre, it.descripcion,
        Number(it.ancho_cm), Number(it.alto_cm), it.cantidad,
      ])
    })

    for (const mu of rep?.materiales_usados ?? []) {
      hojaMateriales.filas.push([
        p.numero, p.cliente_nombre, mu.materiales?.nombre, Number(mu.cantidad), mu.materiales?.unidad,
        dinero(Number(mu.costo_aplicado)), dinero(mu.cantidad * mu.costo_aplicado),
      ])
    }

    ;[...p.historial_pedido].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((h) => {
      hojaHistorial.filas.push([
        p.numero, fechaHora(h.created_at), ACCIONES[h.accion] ?? h.accion,
        h.estado_anterior ? ESTADOS[h.estado_anterior]?.t : null,
        h.estado_nuevo ? ESTADOS[h.estado_nuevo]?.t : null,
        h.nota, quien(h.usuario_id),
      ])
    })
  }

  return [hojaPedidos, hojaDisenos, hojaMateriales, hojaHistorial]
}