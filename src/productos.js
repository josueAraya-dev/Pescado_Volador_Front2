import { ErrorApi } from './api.js'
import {
  api,
  aplicarPermisos,
  cerrarAlClicFuera,
  configurarSalir,
  exigirPagina,
  exigirSesion,
  llamada,
} from './comun.js'
import {
  CAMPOS_NUEVO_PRODUCTO,
  CAMPOS_PRODUCTO,
  cuerpoProducto,
  validarProducto,
} from './formularioProducto.js'
import { construirFormulario } from './formularios.js'
import {
  nodo,
  pintarDetalleProducto,
  pintarProductos,
  pintarResumenInventario,
  renderizarLista,
} from './views.js'

// El SVG del código de barras se muestra como imagen (data URL), nunca como HTML.
const imagenBarras = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function iniciar() {
  if (!exigirPagina('view products')) return
  aplicarPermisos()
  configurarSalir()
  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    location.replace('login.html?motivo=expirada')
  })

  const $ = (selector) => document.querySelector(selector)

  // Listado y búsqueda
  const zonaListaEstado = $('#lista-estado')
  const zonaProductos = $('#productos')
  const zonaPaginacion = $('#paginacion')
  const campoBusqueda = $('#q')
  const campoBarras = $('#codigo-barras')
  const estadoAccion = $('#accion-estado')

  const listado = { estado: 'carga', datos: [], meta: null, error: null, q: '' }
  let busqueda = { q: '', pagina: 1 }
  let controlador = null
  let temporizador = null

  function mostrarAccion(texto, esError = false) {
    estadoAccion.className = esError ? 'error' : 'ayuda'
    estadoAccion.textContent = texto
  }

  function pintarLista() {
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
    pintarLista()

    const respuesta = await llamada(
      () => api.listarProductos({ q: busqueda.q, page: busqueda.pagina, perPage: 12 }, controlador.signal),
      (error) => {
        Object.assign(listado, { estado: 'error', datos: [], meta: null, error: error.message })
        pintarLista()
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
    pintarLista()
  }

  function buscar(q) {
    if (q === busqueda.q) return
    busqueda = { q, pagina: 1 }
    cargarProductos()
  }

  campoBusqueda.addEventListener('input', () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(() => buscar(campoBusqueda.value.trim()), 300)
  })

  $('#buscar-form').addEventListener('submit', (evento) => {
    evento.preventDefault()
    clearTimeout(temporizador)
    buscar(campoBusqueda.value.trim())
  })

  // Detalle, edición y baja: viven dentro de un diálogo
  const dialogoProducto = $('#dialogo-producto')
  const seccionDetalle = $('#detalle')
  const zonaDetalle = $('#detalle-contenido')
  const botonEditar = $('#btn-editar-producto')
  const botonEliminar = $('#btn-eliminar-producto')
  const seccionEditar = $('#editar-producto')
  const formEditar = $('#editar-form')
  const estadoEditar = $('#estado-editar')
  let productoEnDetalle = null

  cerrarAlClicFuera(dialogoProducto)
  $('#btn-cerrar-detalle').addEventListener('click', () => dialogoProducto.close())

  function abrirDialogo() {
    if (!dialogoProducto.open) dialogoProducto.showModal()
  }

  function mostrarDetalle() {
    seccionEditar.hidden = true
    seccionDetalle.hidden = false
  }

  async function pintarDetalle(producto) {
    productoEnDetalle = producto
    mostrarDetalle()
    botonEditar.hidden = !api.puede('update products')
    botonEliminar.hidden = !api.puede('delete products')
    zonaDetalle.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))
    abrirDialogo()

    let imagen = null
    if (producto.codigo_barras) {
      const codigo = await llamada(() => api.obtenerCodigoBarras(producto.id))
      if (codigo?.svg) imagen = imagenBarras(codigo.svg)
    }
    if (productoEnDetalle !== producto) return

    zonaDetalle.replaceChildren(
      ...[
        ...pintarDetalleProducto(producto, imagen),
        producto.codigo_barras && !imagen
          ? nodo('p', { clase: 'ayuda', texto: 'No se pudo generar la imagen del código de barras.' })
          : null,
      ].filter(Boolean),
    )
  }

  async function abrirDetalle(id) {
    mostrarDetalle()
    abrirDialogo()
    zonaDetalle.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))
    const producto = await llamada(
      () => api.obtenerProducto(id),
      (error) => zonaDetalle.replaceChildren(nodo('p', { clase: 'error', role: 'alert', texto: error.message })),
    )
    if (producto) await pintarDetalle(producto)
  }

  zonaProductos.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-detalle]')
    if (boton) abrirDetalle(Number(boton.dataset.detalle))
  })

  // Búsqueda por código de barras
  $('#barras-form').addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const codigo = campoBarras.value.trim()
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
    campoBarras.value = ''
    await pintarDetalle(producto)
  })

  // Edición
  const camposEditar = (campo) => formEditar.elements.namedItem(campo)

  function marcarErroresProducto(errores = {}) {
    CAMPOS_PRODUCTO.forEach((campo) => {
      const control = camposEditar(campo)
      const zona = formEditar.querySelector(`[data-error="${campo}"]`)
      const mensaje = [].concat(errores[campo] ?? [])[0] ?? ''
      control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      zona.textContent = mensaje
      zona.className = mensaje ? 'error' : 'ayuda'
    })
  }

  function abrirEdicion() {
    if (!productoEnDetalle) return
    const p = productoEnDetalle
    camposEditar('name').value = p.nombre ?? ''
    camposEditar('description').value = p.descripcion ?? ''
    camposEditar('price').value = p.precio ?? ''
    camposEditar('tax_rate').value = p.tasa_impuesto ?? ''
    camposEditar('stock_quantity').value = p.cantidad_stock ?? ''
    camposEditar('minimum_stock').value = p.stock_minimo ?? ''
    camposEditar('maximum_stock').value = p.stock_maximo ?? ''
    camposEditar('weight').value = p.peso ?? ''
    camposEditar('is_active').checked = Boolean(p.esta_activo)
    marcarErroresProducto({})
    estadoEditar.textContent = ''
    seccionDetalle.hidden = true
    seccionEditar.hidden = false
    seccionEditar.focus()
  }

  botonEditar.addEventListener('click', abrirEdicion)

  $('#btn-cancelar-editar').addEventListener('click', () => {
    seccionEditar.hidden = true
    seccionDetalle.hidden = false
  })

  formEditar.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (!productoEnDetalle) return

    const cuerpo = cuerpoProducto(formEditar)
    const errores = validarProducto(cuerpo)
    marcarErroresProducto(errores)
    if (Object.keys(errores).length) return

    estadoEditar.style.color = ''
    estadoEditar.textContent = 'Guardando cambios…'
    const actualizado = await llamada(
      () => api.actualizarProducto(productoEnDetalle.id, cuerpo),
      (error) => {
        if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
          marcarErroresProducto(error.errors)
          estadoEditar.textContent = ''
        } else {
          estadoEditar.style.color = 'var(--c-error)'
          estadoEditar.textContent = error.message
        }
      },
    )
    if (!actualizado) return

    await pintarDetalle(actualizado)
    zonaDetalle.prepend(nodo('p', { role: 'status', clase: 'ayuda', texto: 'Producto actualizado.' }))
    cargarProductos()
  })

  // Baja
  botonEliminar.addEventListener('click', async () => {
    if (!productoEnDetalle) return
    if (!window.confirm(`¿Eliminar el producto “${productoEnDetalle.nombre}”?`)) return

    let fallo = false
    await llamada(
      () => api.eliminarRecurso('/products', productoEnDetalle.id),
      (error) => {
        fallo = true
        zonaDetalle.prepend(nodo('p', { clase: 'error', role: 'alert', texto: error.message }))
      },
    )
    if (fallo) return

    productoEnDetalle = null
    dialogoProducto.close()
    mostrarAccion('Producto eliminado.')
    cargarProductos()
  })

  // Alta: diálogo propio
  const dialogoNuevo = $('#dialogo-nuevo')
  cerrarAlClicFuera(dialogoNuevo)
  $('#btn-cerrar-nuevo').addEventListener('click', () => dialogoNuevo.close())

  if (api.puede('create products')) {
    const formNuevo = construirFormulario(CAMPOS_NUEVO_PRODUCTO)
    const mensajeNuevo = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
    formNuevo.form.append(
      nodo('p', { clase: 'acciones' }, [
        nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Crear producto' }),
        nodo('button', { type: 'button', texto: 'Cancelar', onClick: () => dialogoNuevo.close() }),
      ]),
      mensajeNuevo,
    )
    $('#form-nuevo-producto').replaceChildren(formNuevo.form)
    formNuevo.cargar({ is_active: true })

    $('#btn-nuevo-producto').addEventListener('click', () => {
      mensajeNuevo.textContent = ''
      dialogoNuevo.showModal()
    })

    const opciones = async (ruta, claveId, claveTexto) => {
      const respuesta = await llamada(() => api.listarRecurso(ruta, { per_page: 50 }))
      return (respuesta?.data ?? []).map((fila) => ({ valor: fila[claveId], texto: fila[claveTexto] }))
    }
    Promise.all([
      opciones('/categories', 'ID Categoria', 'Nombre'),
      opciones('/brands', 'ID Marca', 'Nombre'),
      opciones('/units', 'ID Unidad de Medida', 'Nombre'),
    ]).then(([categorias, marcas, unidades]) => {
      formNuevo.setOpciones('category_id', categorias)
      formNuevo.setOpciones('brand_id', marcas)
      formNuevo.setOpciones('unit_id', unidades)
    })

    formNuevo.form.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      const { valores, errores } = formNuevo.leer()
      const todos = { ...validarProducto(valores), ...errores }
      formNuevo.marcarErrores(todos)
      if (Object.keys(todos).length) return

      mensajeNuevo.className = 'ayuda'
      mensajeNuevo.textContent = 'Creando producto…'
      const creado = await llamada(
        () => api.crearRecurso('/products', valores),
        (error) => {
          mensajeNuevo.className = 'error'
          if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
            const sobrantes = formNuevo.marcarErrores(error.errors)
            mensajeNuevo.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
          } else {
            mensajeNuevo.textContent = error.message
          }
        },
      )
      if (!creado) return

      formNuevo.limpiar()
      formNuevo.cargar({ is_active: true })
      dialogoNuevo.close()
      mostrarAccion(`Producto “${creado.nombre ?? creado.name ?? ''}” creado.`)
      cargarProductos()
    })
  }

  // Resumen de inventario: se carga solo al abrir el desplegable
  const resumen = $('#resumen')
  const zonaResumenEstado = $('#resumen-estado')
  const zonaResumen = $('#resumen-contenido')
  let resumenCargado = false

  async function cargarResumen() {
    const mostrar = (seccion) =>
      renderizarLista({
        zonaEstado: zonaResumenEstado,
        zonaContenido: zonaResumen,
        seccion,
        etiqueta: 'categorías',
        pintar: pintarResumenInventario,
        onReintentar: cargarResumen,
      })

    mostrar({ estado: 'carga' })
    const respuesta = await llamada(
      () => api.resumenInventario(),
      (error) => mostrar({ estado: 'error', error: error.message }),
    )
    if (!respuesta) return
    mostrar({ estado: respuesta.data.length ? 'datos' : 'vacio', datos: respuesta.data })
  }

  resumen.addEventListener('toggle', () => {
    if (resumen.open && !resumenCargado) {
      resumenCargado = true
      cargarResumen()
    }
  })

  pintarLista()
  cargarProductos()
}

if (exigirSesion()) iniciar()
