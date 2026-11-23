import { aplicarPermisos, configurarSalir, exigirPagina, exigirSesion } from './comun.js'
import { montarCrud } from './crud.js'

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
      { etiqueta: 'Origen', valor: (f) => `${f['Tipo de Origen']} #${f['ID de Origen']}` },
    ],
    idDe: (f) => f['ID Movimiento'],
    valoresDe: () => ({}),
  })
}

if (exigirSesion()) iniciar()
