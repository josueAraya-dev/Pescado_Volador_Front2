import { aplicarPermisos, configurarSalir, exigirPagina, exigirSesion } from './comun.js'
import { montarCrud } from './crud.js'

// Nombre legible del origen del movimiento (el backend envía "Compra" o "Venta").
const ORIGEN = { Compra: 'Item compra', Venta: 'Item venta' }

// La fecha llega desde el backend solo si su recurso la incluye; si no, se muestra un guion.
const formatearFecha = (valor) => {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
}

function iniciar() {
  if (!exigirPagina('view inventory-movements')) return
  aplicarPermisos()
  configurarSalir()

  // Solo lectura: sin permisos de alta, cambio o baja, montarCrud no muestra formulario ni acciones.
  montarCrud({
    raiz: document.querySelector('#crud-movimientos'),
    titulo: 'Movimientos de inventario',
    etiqueta: 'movimientos',
    ruta: '/inventory-movements',
    permisos: { ver: 'view inventory-movements' },
    campos: [],
    columnas: [
      { etiqueta: 'Movimiento', valor: (f) => f['ID Movimiento'] },
      { etiqueta: 'Producto', valor: (f) => f['ID Producto'] },
      { etiqueta: 'Tipo', valor: (f) => f.Tipo },
      { etiqueta: 'Cantidad', valor: (f) => f.Cantidad },
      { etiqueta: 'Stock después', valor: (f) => f['Stock Despues'] },
      { etiqueta: 'Origen', valor: (f) => `${ORIGEN[f['Tipo de Origen']] ?? f['Tipo de Origen']} #${f['ID de Origen']}` },
      { etiqueta: 'Fecha', valor: (f) => formatearFecha(f.Fecha ?? f.created_at) },
    ],
    idDe: (f) => f['ID Movimiento'],
    valoresDe: () => ({}),
  })
}

if (exigirSesion()) iniciar()
