export const ESTADOS = {
  disponible: { t: 'Disponible', c: '#00a6c8' },
  en_produccion: { t: 'En producción', c: '#fe6c17' },
  despachado: { t: 'Despachado', c: '#fdc405' },
  entregado: { t: 'Entregado', c: '#3ecf8e' },
  cancelado: { t: 'Cancelado', c: '#d71a6c' },
}

export const ACCIONES = {
  creado: 'Pedido creado',
  tomado: 'Pedido tomado',
  despachado: 'Despachado',
  entregado: 'Entregado al cliente',
  cancelado: 'Cancelado',
  cambio_estado: 'Cambio de estado',
  precio_cambiado: 'Precio cambiado',
  editado: 'Pedido editado',
}

export const moneda = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0)

export const fechaHora = (d) =>
  new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export const atrasado = (p) =>
  !['entregado', 'cancelado'].includes(p.estado) &&
  p.fecha_limite < new Date().toISOString().slice(0, 10)