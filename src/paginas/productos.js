// Página de productos (index.html): búsqueda, listado, código de barras y resumen de inventario.
// El detalle, la edición y el alta viven en productos-detalle.js y productos-alta.js.
import { api, llamada, iniciarPagina } from '../nucleo/comun.js'
import { mostrarTexto, pintarProductos, pintarResumenInventario, renderizarLista } from '../componentes/vista.js'
import { crearDetalleProducto } from './productos-detalle.js'
import { montarAltaProducto } from './productos-alta.js'

const TAMANO_PAGINA = 12

iniciarPagina('view products', () => {
  const $ = (selector) => document.querySelector(selector)

  const zonaListaEstado = $('#lista-estado')
  const zonaProductos = $('#productos')
  const zonaPaginacion = $('#paginacion')
  const campoBusqueda = $('#q')
  const campoCodigoBarras = $('#codigo-barras')
  const estadoAccion = $('#accion-estado')

  // Estado del listado: lo que se muestra y con qué búsqueda.
  const listado = { estado: 'carga', datos: [], meta: null, error: null, q: '' }
  let busqueda = { q: '', pagina: 1 }
  let controlador = null
  let temporizador = null

  // Mensaje general de la página (por ejemplo, "Producto creado.").
  function mostrarAccion(texto, esError = false) {
    mostrarTexto(estadoAccion, texto, esError)
  }

  // ----- Listado -----

  function pintarListado() {
    renderizarLista({
      zonaEstado: zonaListaEstado,
      zonaContenido: zonaProductos,
      zonaPaginacion,
      seccion: listado,
      pintar: pintarProductos,
      etiqueta: 'productos',
      onReintentar: cargarProductos,
      onPagina: (pagina) => {
        busqueda = { ...busqueda, pagina }
        cargarProductos()
      },
    })
  }

  async function cargarProductos() {
    controlador?.abort()
    controlador = new AbortController()
    Object.assign(listado, { estado: 'carga', error: null })
    pintarListado()

    const respuesta = await llamada(
      () => api.listarProductos({ q: busqueda.q, page: busqueda.pagina, perPage: TAMANO_PAGINA }, controlador.signal),
      (error) => {
        Object.assign(listado, { estado: 'error', datos: [], meta: null, error: error.message })
        pintarListado()
      },
    )
    if (!respuesta) return

    Object.assign(listado, {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
      q: busqueda.q,
    })
    pintarListado()
  }

  // Cambia la búsqueda solo si el texto es distinto al actual.
  function buscar(texto) {
    if (texto === busqueda.q) return
    busqueda = { q: texto, pagina: 1 }
    cargarProductos()
  }

  // ----- Búsqueda por nombre o SKU -----

  // Busca mientras se escribe, esperando 300 ms de pausa.
  campoBusqueda.addEventListener('input', () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(() => buscar(campoBusqueda.value.trim()), 300)
  })

  $('#buscar-form').addEventListener('submit', (evento) => {
    evento.preventDefault()
    clearTimeout(temporizador)
    buscar(campoBusqueda.value.trim())
  })

  // ----- Detalle, edición y baja -----

  const detalle = crearDetalleProducto({
    onCambio: cargarProductos,
    mostrarAccion,
  })

  zonaProductos.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-detalle]')
    if (boton) detalle.abrirDetalle(Number(boton.dataset.detalle))
  })

  // ----- Búsqueda por código de barras -----

  $('#barras-form').addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const codigo = campoCodigoBarras.value.trim()
    if (!codigo) {
      mostrarAccion('Escriba un código de barras.', true)
      return
    }

    mostrarAccion('Buscando…')
    const producto = await llamada(
      () => api.buscarProductoPorCodigoBarras(codigo),
      (error) =>
        mostrarAccion(
          error.status === 404 ? `No existe un producto con el código de barras “${codigo}”.` : error.message,
          true,
        ),
    )
    if (!producto) return

    mostrarAccion('')
    campoCodigoBarras.value = ''
    await detalle.mostrarProducto(producto)
  })

  // ----- Alta -----

  montarAltaProducto({
    onCreado: (nombre) => {
      mostrarAccion(`Producto “${nombre}” creado.`)
      cargarProductos()
    },
  })

  // ----- Resumen de inventario (se carga al abrir el desplegable) -----

  const resumen = $('#resumen')
  const zonaResumenEstado = $('#resumen-estado')
  const zonaResumen = $('#resumen-contenido')
  let resumenCargado = false

  async function cargarResumen() {
    const pintarResumen = (seccion) =>
      renderizarLista({
        zonaEstado: zonaResumenEstado,
        zonaContenido: zonaResumen,
        seccion,
        etiqueta: 'categorías',
        pintar: pintarResumenInventario,
        onReintentar: cargarResumen,
      })

    pintarResumen({ estado: 'carga' })
    const respuesta = await llamada(
      () => api.resumenInventario(),
      (error) => pintarResumen({ estado: 'error', error: error.message }),
    )
    if (!respuesta) return
    pintarResumen({ estado: respuesta.data.length ? 'datos' : 'vacio', datos: respuesta.data })
  }

  resumen.addEventListener('toggle', () => {
    if (resumen.open && !resumenCargado) {
      resumenCargado = true
      cargarResumen()
    }
  })

  pintarListado()
  cargarProductos()
})
