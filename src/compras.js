import { api, aplicarPermisos, configurarSalir, exigirPagina, exigirSesion, llamada } from './comun.js'
import { colones, nodo, renderizarLista } from './views.js'

function claseEstadoCompra(estado) {
  const valor = String(estado ?? '').toLowerCase()
  if (valor.startsWith('recib') || valor.startsWith('confirm')) return 'badge badge-ok'
  if (valor.startsWith('pendient')) return 'badge badge-bajo'
  if (valor.startsWith('cancel')) return 'badge badge-error'
  return 'badge badge-neutro'
}

function tablaDetalles(items) {
  return nodo('div', { clase: 'tabla-scroll' }, [
    nodo('table', {}, [
      nodo('caption', { texto: 'Detalles de la compra' }),
      nodo(
        'thead',
        {},
        nodo(
          'tr',
          {},
          ['Detalle', 'Producto', 'Cantidad', 'Costo unitario', 'Subtotal'].map((texto) =>
            nodo('th', { scope: 'col', texto }),
          ),
        ),
      ),
      nodo(
        'tbody',
        {},
        items.map((item) =>
          nodo('tr', {}, [
            nodo('th', { scope: 'row', texto: String(item['ID Detalle']) }),
            nodo('td', { texto: item.Producto ?? `Producto #${item['ID Producto']}` }),
            nodo('td', { texto: String(item.Cantidad) }),
            nodo('td', { texto: colones(item['Costo Unitario']) }),
            nodo('td', { texto: colones(item.SubTotal) }),
          ]),
        ),
      ),
    ]),
  ])
}

function iniciar() {
  if (!exigirPagina('view purchases')) return
  aplicarPermisos()
  configurarSalir()

  const zonaEstado = document.querySelector('#compras-estado')
  const zonaContenido = document.querySelector('#compras-lista')
  const zonaPaginacion = document.querySelector('#compras-paginacion')
  const dialogo = document.querySelector('#dialogo-detalles')
  const contenidoDialogo = document.querySelector('#contenido-dialogo')
  const tituloDialogo = document.querySelector('#t-dialogo')

  let seccion = { estado: 'carga', datos: [], meta: null, error: null }
  let pagina = 1
  let controlador = null
  let comprasPorId = new Map()

  // Las compras se muestran como tarjetas; sus detalles abren una ventana emergente.
  function pintarCompras(datos) {
    comprasPorId = new Map(datos.map((compra) => [String(compra.id_purchase), compra]))
    return datos.map((compra) => {
      const items = compra.purchaseItems ?? []
      return nodo('article', { clase: 'card' }, [
        nodo('h3', { texto: `Compra ${compra.id_purchase}` }),
        nodo('p', { texto: `Proveedor: ${compra.id_supplier}` }),
        nodo('p', { clase: 'price', texto: colones(compra.purchase_total) }),
        nodo('p', { clase: 'badges' }, [
          nodo('span', { clase: claseEstadoCompra(compra.purchase_status), texto: compra.purchase_status }),
        ]),
        nodo('p', { clase: 'card-pie' }, [
          nodo('button', {
            type: 'button',
            texto: `Ver detalles (${items.length})`,
            'data-detalles': String(compra.id_purchase),
          }),
        ]),
      ])
    })
  }

  // Los nombres de producto vienen de GET /purchases/{id}/items (el listado no los incluye).
  async function abrirDetalles(idCompra) {
    const compra = comprasPorId.get(String(idCompra))
    if (!compra) return

    tituloDialogo.textContent = `Compra ${compra.id_purchase}`
    contenidoDialogo.replaceChildren(
      nodo('p', { texto: `Proveedor: ${compra.id_supplier}` }),
      nodo('p', { clase: 'badges' }, [
        nodo('span', { clase: claseEstadoCompra(compra.purchase_status), texto: compra.purchase_status }),
        nodo('span', { clase: 'price', texto: colones(compra.purchase_total) }),
      ]),
      nodo('p', { role: 'status', clase: 'ayuda', texto: 'Cargando productos…' }),
    )
    dialogo.showModal()

    const respuesta = await llamada(
      () => api.listarRecurso(`/purchases/${encodeURIComponent(compra.id_purchase)}/items`, { per_page: 50 }),
      (error) =>
        contenidoDialogo.append(nodo('p', { clase: 'error', role: 'alert', texto: error.message })),
    )
    if (!respuesta) return

    const items = respuesta.data
    contenidoDialogo.replaceChildren(
      nodo('p', { texto: `Proveedor: ${compra.id_supplier}` }),
      nodo('p', { clase: 'badges' }, [
        nodo('span', { clase: claseEstadoCompra(compra.purchase_status), texto: compra.purchase_status }),
        nodo('span', { clase: 'price', texto: colones(compra.purchase_total) }),
      ]),
      items.length
        ? tablaDetalles(items)
        : nodo('p', { clase: 'ayuda', texto: 'Esta compra no tiene detalles.' }),
    )
  }

  zonaContenido.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-detalles]')
    if (boton) abrirDetalles(boton.dataset.detalles)
  })

  document.querySelector('#btn-cerrar-dialogo').addEventListener('click', () => dialogo.close())

  // Clic en el fondo oscuro (fuera del contenido) también cierra el diálogo.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close()
  })

  function pintar() {
    renderizarLista({
      zonaEstado,
      zonaContenido,
      zonaPaginacion,
      seccion,
      pintar: pintarCompras,
      etiqueta: 'compras',
      onReintentar: cargar,
      onPagina: (nueva) => {
        pagina = nueva
        cargar()
      },
    })
  }

  async function cargar() {
    controlador?.abort()
    controlador = new AbortController()
    seccion = { ...seccion, estado: 'carga', error: null }
    pintar()

    const respuesta = await llamada(
      () => api.listarCompras({ page: pagina }, controlador.signal),
      (error) => {
        seccion = { estado: 'error', datos: [], meta: null, error: error.message }
        pintar()
      },
    )
    if (!respuesta) return

    seccion = {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    }
    pintar()
  }

  pintar()
  cargar()
}

if (exigirSesion()) iniciar()
