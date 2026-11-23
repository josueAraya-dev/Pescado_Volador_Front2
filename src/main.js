import { ClienteApi, ErrorApi } from './api.js'
import { alternarFormulario, aplicarPermisos, exigirPagina } from './comun.js'
import {
  CAMPOS_NUEVO_PRODUCTO,
  CAMPOS_PRODUCTO,
  cuerpoProducto,
  validarProducto,
} from './formularioProducto.js'
import { construirFormulario } from './formularios.js'
import {
  crearTienda,
  estadoInicial,
  hoyISO,
  limpiarFormularioVenta,
  persistirFormularioVenta,
  recordarRetornoActual,
  tomarRetorno,
  valorFormulario,
} from './state.js'
import {
  colones,
  nodo,
  pintarDetalleProducto,
  pintarProductos,
  pintarResumenInventario,
  pintarVentas,
  renderClientes,
  renderFormularioVenta,
  renderizarLista,
} from './views.js'

const api = new ClienteApi()
const tienda = crearTienda(estadoInicial())
const vista = document.body.dataset.vista

function esAborto(error) {
  return error?.name === 'AbortError'
}

function expirarSesion() {
  const { venta } = tienda.obtener()
  if (venta) persistirFormularioVenta(venta.valores)
  recordarRetornoActual()
  location.replace('login.html?motivo=expirada')
}

// 404 al editar: el backend oculta las ventas ajenas con 404 (no 403).
function mensajeErrorVenta(error, esEdicion) {
  if (error instanceof ErrorApi && error.status === 404 && esEdicion) {
    return 'La venta no existe o solo puede editar las ventas que usted registró.'
  }
  if (error instanceof ErrorApi && error.status === 403) {
    return 'Su rol no tiene permiso para realizar esta acción.'
  }
  return error?.message || 'No se pudo guardar la venta.'
}

async function buscarProductoPorSku(sku) {
  const respuesta = await api.listarProductos({ q: sku, perPage: 10 })
  const buscado = sku.toUpperCase()
  return respuesta?.data?.find((p) => String(p.sku).toUpperCase() === buscado) ?? null
}

async function llamada(operacion, alFallar) {
  try {
    return await operacion()
  } catch (error) {
    if (esAborto(error)) return undefined
    if (error instanceof ErrorApi && error.status === 401) {
      expirarSesion()
      return undefined
    }
    if (alFallar) alFallar(error)
    return undefined
  }
}

function exigirSesion() {
  if (!api.token || api.sesionExpirada()) {
    const expirada = Boolean(api.token)
    const { venta } = tienda.obtener()
    if (venta) persistirFormularioVenta(venta.valores)
    api.limpiarSesion()
    recordarRetornoActual()
    location.replace(expirada ? 'login.html?motivo=expirada' : 'login.html')
    return false
  }
  return true
}

function iniciarCatalogo() {
  if (!exigirSesion()) return
  if (!exigirPagina('view products')) return
  aplicarPermisos()

  const zonaEstado = document.querySelector('#lista-estado')
  const zonaContenido = document.querySelector('#productos')
  const zonaPaginacion = document.querySelector('#paginacion')
  const campoBusqueda = document.querySelector('#q')

  let controlador = null

  function pintar() {
    const { catalogo } = tienda.obtener()
    renderizarLista({
      zonaEstado,
      zonaContenido,
      zonaPaginacion,
      seccion: catalogo,
      pintar: pintarProductos,
      etiqueta: 'productos',
      onReintentar: () => cargarProductos(),
      onPagina: (pagina) => {
        tienda.actualizarSeccion('catalogo', { pagina })
        cargarProductos()
      },
    })
  }

  async function cargarProductos() {
    controlador?.abort()
    controlador = new AbortController()

    tienda.actualizarSeccion('catalogo', { estado: 'carga', error: null })

    const { q, pagina } = tienda.obtener().catalogo
    const respuesta = await llamada(
      () => api.listarProductos({ q, page: pagina }, controlador.signal),
      (error) =>
        tienda.actualizarSeccion('catalogo', {
          estado: 'error',
          error: error.message,
        }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('catalogo', {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
  }

 
  let temporizador = null
  const buscar = () => {
    const valor = campoBusqueda.value.trim()
    if (valor === tienda.obtener().catalogo.q) return
    tienda.actualizarSeccion('catalogo', { q: valor, pagina: 1 })
    cargarProductos()
  }

  campoBusqueda.value = tienda.obtener().catalogo.q
  campoBusqueda.addEventListener('input', () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(buscar, 300)
  })

 
  document.querySelector('#filtros-form')?.addEventListener('submit', (evento) => {
    evento.preventDefault()
    clearTimeout(temporizador)
    buscar()
  })

  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })

  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    expirarSesion()
  })

  const btnEditar = document.querySelector('#btn-editar-producto')
  const seccionEditar = document.querySelector('#editar-producto')
  const formEditar = document.querySelector('#editar-form')
  const estadoEditar = document.querySelector('#estado-editar')
  let productoEnDetalle = null

  const campoEditar = (campo) => formEditar.elements.namedItem(campo)

  function marcarErroresProducto(errores = {}) {
    CAMPOS_PRODUCTO.forEach((campo) => {
      const control = campoEditar(campo)
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
    campoEditar('name').value = p.nombre ?? ''
    campoEditar('description').value = p.descripcion ?? ''
    campoEditar('price').value = p.precio ?? ''
    campoEditar('tax_rate').value = p.tasa_impuesto ?? ''
    campoEditar('stock_quantity').value = p.cantidad_stock ?? ''
    campoEditar('minimum_stock').value = p.stock_minimo ?? ''
    campoEditar('maximum_stock').value = p.stock_maximo ?? ''
    campoEditar('weight').value = p.peso ?? ''
    campoEditar('is_active').checked = Boolean(p.esta_activo)
    marcarErroresProducto({})
    estadoEditar.style.color = ''
    estadoEditar.textContent = ''
    seccionEditar.hidden = false
    seccionEditar.focus()
  }

  btnEditar.addEventListener('click', abrirEdicion)

  const btnEliminar = document.querySelector('#btn-eliminar-producto')
  btnEliminar.addEventListener('click', async () => {
    if (!productoEnDetalle) return
    if (!window.confirm(`¿Eliminar el producto “${productoEnDetalle.nombre}”?`)) return

    let fallo = false
    await llamada(
      () => api.eliminarRecurso('/products', productoEnDetalle.id),
      (error) => {
        fallo = true
        zonaBarras.replaceChildren(nodo('p', { clase: 'error', role: 'alert', texto: error.message }))
      },
    )
    if (fallo) return

    productoEnDetalle = null
    zonaDetalle.hidden = true
    seccionEditar.hidden = true
    zonaBarras.replaceChildren(nodo('p', { role: 'status', texto: 'Producto eliminado.' }))
    cargarProductos()
  })

  // Alta de producto: solo con `create products`. Las listas de categoría, marca y unidad se cargan al abrir.
  function montarNuevoProducto() {
    const zona = document.querySelector('#form-nuevo-producto')
    const formulario = construirFormulario(CAMPOS_NUEVO_PRODUCTO)
    const mensaje = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
    formulario.form.append(
      nodo('p', { clase: 'acciones' }, [nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Crear producto' })]),
      mensaje,
    )
    zona.replaceChildren(formulario.form)
    formulario.cargar({ is_active: true })

    const botonMostrar = document.querySelector('#btn-mostrar-nuevo')
    botonMostrar?.addEventListener('click', () => alternarFormulario(botonMostrar, zona))

    const opciones = async (ruta, claveId, claveTexto) => {
      const respuesta = await llamada(() => api.listarRecurso(ruta, { per_page: 50 }))
      return (respuesta?.data ?? []).map((fila) => ({ valor: fila[claveId], texto: fila[claveTexto] }))
    }
    Promise.all([
      opciones('/categories', 'ID Categoria', 'Nombre'),
      opciones('/brands', 'ID Marca', 'Nombre'),
      opciones('/units', 'ID Unidad de Medida', 'Nombre'),
    ]).then(([categorias, marcas, unidades]) => {
      formulario.setOpciones('category_id', categorias)
      formulario.setOpciones('brand_id', marcas)
      formulario.setOpciones('unit_id', unidades)
    })

    formulario.form.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      const { valores, errores } = formulario.leer()
      const todos = { ...validarProducto(valores), ...errores }
      formulario.marcarErrores(todos)
      if (Object.keys(todos).length) return

      mensaje.className = 'ayuda'
      mensaje.textContent = 'Creando producto…'
      const creado = await llamada(
        () => api.crearRecurso('/products', valores),
        (error) => {
          if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
            const sobrantes = formulario.marcarErrores(error.errors)
            mensaje.className = 'error'
            mensaje.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
          } else {
            mensaje.className = 'error'
            mensaje.textContent = error.message
          }
        },
      )
      if (!creado) return

      formulario.limpiar()
      formulario.cargar({ is_active: true })
      if (botonMostrar) alternarFormulario(botonMostrar, zona, false)
      mensaje.className = 'ayuda'
      mensaje.textContent = `Producto “${creado.nombre ?? creado.name ?? ''}” creado.`
      cargarProductos()
    })
  }

  document.querySelector('#btn-cancelar-editar')?.addEventListener('click', () => {
    seccionEditar.hidden = true
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
          estadoEditar.style.color = 'var(--danger)'
          estadoEditar.textContent = error.message
        }
      },
    )
    if (!actualizado) return

    estadoEditar.style.color = 'var(--success)'
    estadoEditar.textContent = 'Producto actualizado.'
    await pintarDetalle(actualizado)
    cargarProductos()
  })

  const zonaDetalle = document.querySelector('#detalle')
  const zonaDetalleContenido = document.querySelector('#detalle-contenido')
  const zonaBarras = document.querySelector('#barras-estado')
  const zonaResumenEstado = document.querySelector('#resumen-estado')
  const zonaResumen = document.querySelector('#resumen-contenido')

  // El SVG se carga como imagen (data URL): no se inserta como HTML.
  const imagenBarras = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  async function pintarDetalle(producto) {
    productoEnDetalle = producto
    btnEditar.hidden = !api.puede('update products')
    btnEliminar.hidden = !api.puede('delete products')
    zonaDetalle.hidden = false
    zonaDetalleContenido.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))

    let imagen = null
    if (producto.codigo_barras) {
      const codigo = await llamada(() => api.obtenerCodigoBarras(producto.id))
      if (codigo?.svg) imagen = imagenBarras(codigo.svg)
    }

    zonaDetalleContenido.replaceChildren(
      ...pintarDetalleProducto(producto, imagen),
      producto.codigo_barras && !imagen
        ? nodo('p', { clase: 'ayuda', texto: 'No se pudo generar la imagen del código de barras.' })
        : null,
    )
    zonaDetalle.focus()
  }

  async function abrirDetalle(id) {
    zonaDetalle.hidden = false
    zonaDetalleContenido.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))

    const producto = await llamada(
      () => api.obtenerProducto(id),
      (error) =>
        zonaDetalleContenido.replaceChildren(
          nodo('p', { clase: 'error', role: 'alert', texto: error.message }),
        ),
    )
    if (producto) await pintarDetalle(producto)
  }

  document.querySelector('#productos')?.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-detalle]')
    if (boton) abrirDetalle(Number(boton.dataset.detalle))
  })

  document.querySelector('#btn-cerrar-detalle')?.addEventListener('click', () => {
    zonaDetalle.hidden = true
  })

  document.querySelector('#barras-form')?.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const codigo = document.querySelector('#codigo-barras').value.trim()

    if (!codigo) {
      zonaBarras.replaceChildren(
        nodo('p', { clase: 'error', role: 'alert', texto: 'Escriba un código de barras.' }),
      )
      return
    }

    zonaBarras.replaceChildren(nodo('p', { role: 'status', texto: 'Buscando…' }))
    const producto = await llamada(
      () => api.buscarProductoPorCodigoBarras(codigo),
      (error) =>
        zonaBarras.replaceChildren(
          nodo('p', {
            clase: 'error',
            role: 'alert',
            texto:
              error.status === 404
                ? `No existe un producto con el código de barras “${codigo}”.`
                : error.message,
          }),
        ),
    )
    if (!producto) return

    zonaBarras.replaceChildren()
    await pintarDetalle(producto)
  })

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

    mostrar({
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
    })
  }

  tienda.suscribir(pintar)
  pintar()
  if (api.puede('view products')) {
    cargarProductos()
    cargarResumen()
  }
  if (api.puede('create products')) montarNuevoProducto()
}

const CAMPOS_PAGO = [
  { nombre: 'sale_id', etiqueta: 'Número de venta', tipo: 'number', requerido: true, entero: true, min: 1 },
  {
    nombre: 'payment_method',
    etiqueta: 'Método de pago',
    tipo: 'select',
    requerido: true,
    opciones: [
      { valor: 'cash', texto: 'Efectivo' },
      { valor: 'card', texto: 'Tarjeta' },
      { valor: 'sinpe', texto: 'SINPE' },
    ],
  },
  { nombre: 'amount', etiqueta: 'Monto (₡)', tipo: 'number', requerido: true, min: 0.01, max_valor: 9999999999.99 },
  { nombre: 'transaction_reference', etiqueta: 'Referencia de transacción', tipo: 'text', max: 255 },
  {
    nombre: 'status',
    etiqueta: 'Estado del pago',
    tipo: 'select',
    requerido: true,
    opciones: [
      { valor: 'completed', texto: 'Completado' },
      { valor: 'pending', texto: 'Pendiente' },
      { valor: 'cancelled', texto: 'Cancelado' },
    ],
  },
]

// Solo se llama si el rol tiene `create payments` (la API lo exige).
function montarFormularioPago() {
  const zona = document.querySelector('#form-pago')
  if (!zona) return null

  const formulario = construirFormulario(CAMPOS_PAGO)
  const mensaje = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
  formulario.form.append(
    nodo('p', { clase: 'acciones' }, [nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Registrar pago' })]),
    mensaje,
  )
  zona.replaceChildren(formulario.form)
  const botonMostrar = document.querySelector('#btn-mostrar-pago')
  botonMostrar?.addEventListener('click', () => alternarFormulario(botonMostrar, zona))
  const valoresPorDefecto = { payment_method: 'cash', status: 'completed', transaction_reference: '' }
  formulario.cargar(valoresPorDefecto)

  formulario.form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const { valores, errores } = formulario.leer()
    formulario.marcarErrores(errores)
    if (Object.keys(errores).length) return

    mensaje.className = 'ayuda'
    mensaje.textContent = 'Registrando pago…'
    const respuesta = await llamada(
      () => api.crearRecurso('/payments', valores),
      (error) => {
        if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
          const sobrantes = formulario.marcarErrores(error.errors)
          mensaje.className = 'error'
          mensaje.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
        } else {
          mensaje.className = 'error'
          mensaje.textContent = error.message
        }
      },
    )
    if (!respuesta) return

    mensaje.className = 'ayuda'
    mensaje.textContent = `Pago de ₡${valores.amount} registrado para la venta #${valores.sale_id}.`
    formulario.limpiar()
    formulario.cargar(valoresPorDefecto)
    if (botonMostrar) alternarFormulario(botonMostrar, zona, false)
  })

  return formulario
}

function iniciarVentas() {
  if (!exigirSesion()) return
  if (!exigirPagina('view sales')) return
  aplicarPermisos()

  const form = document.querySelector('#venta-form')
  const selectClientes = document.querySelector('#cliente')
  const zonaEstado = document.querySelector('#historial-estado')
  const zonaContenido = document.querySelector('#historial')
  const zonaPaginacion = document.querySelector('#historial-paginacion')

  let controladorVentas = null
  let controladorClientes = null

  const cuerpoDesdeFormulario = (valores) => ({
    id_customer: valores.id_customer ? String(valores.id_customer) : null,
    sale_date: valores.sale_date || hoyISO(),
    total: valores.total === '' ? '' : Number(valores.total),
    tax_amount: valores.tax_amount === '' ? 0 : Number(valores.tax_amount),
    discount: valores.discount === '' ? 0 : Number(valores.discount),
    status: valores.status || 'completado',
  })

  function pintar() {
    const { historial, clientes, venta } = tienda.obtener()

    renderClientes(selectClientes, clientes)

    renderizarLista({
      zonaEstado,
      zonaContenido,
      zonaPaginacion,
      seccion: historial,
      etiqueta: 'ventas',
      pintar: (datos) =>
        pintarVentas(datos, (v) => nombreCliente(clientes.datos, v.id_customer), {
          editable: api.puede('update sales'),
          eliminable: api.puede('delete sales'),
          pagable: api.puede('create payments'),
        }),
      onReintentar: () => cargarHistorial(),
      onPagina: (pagina) => {
        tienda.actualizarSeccion('historial', { pagina })
        cargarHistorial()
      },
    })

    renderFormularioVenta(venta, form)
  }

  function nombreCliente(clientes, id) {
    if (!id) return 'Mostrador'
    const cliente = clientes.find((c) => c.id_customer === id)
    return cliente ? `${cliente.first_name} ${cliente.last_name1}`.trim() : `Cliente #${id}`
  }

  async function cargarHistorial() {
    controladorVentas?.abort()
    controladorVentas = new AbortController()

    tienda.actualizarSeccion('historial', { estado: 'carga', error: null })
    const { pagina } = tienda.obtener().historial

    const respuesta = await llamada(
      () => api.listarVentas({ page: pagina }, controladorVentas.signal),
      (error) =>
        tienda.actualizarSeccion('historial', { estado: 'error', error: error.message }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('historial', {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
  }

  async function cargarClientes() {
    controladorClientes?.abort()
    controladorClientes = new AbortController()

    tienda.actualizarSeccion('clientes', { estado: 'carga', error: null })
    const respuesta = await llamada(
      () => api.listarClientes(controladorClientes.signal),
      (error) =>
        tienda.actualizarSeccion('clientes', { estado: 'error', datos: [], error: error.message }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('clientes', {
      estado: 'datos',
      datos: respuesta.data,
      error: null,
    })
  }

  form.addEventListener('input', (evento) => {
    const campo = evento.target.name
    if (!campo) return
    tienda.actualizarSeccion('venta', (venta) => ({
      valores: { ...venta.valores, [campo]: evento.target.value },
      errores: { ...venta.errores, [campo]: undefined },
      mensaje: null,
    }))
    persistirFormularioVenta(tienda.obtener().venta.valores)
  })

  const campoProducto = form.elements.namedItem('producto_sku')
  campoProducto?.addEventListener('change', async () => {
    const sku = campoProducto.value.trim()
    if (!sku) return

    const respuesta = await llamada(() => api.listarProductos({ q: sku, perPage: 1 }))
    const producto = respuesta?.data?.[0]

    if (!producto) {
      tienda.actualizarSeccion('venta', {
        mensaje: `No se encontró un producto con SKU “${sku}”.`,
      })
      return
    }

    const cantidad = Number(form.elements.namedItem('cantidad').value) || 1
    const total = Math.round(producto.precio * cantidad)

    tienda.actualizarSeccion('venta', (venta) => ({
      valores: { ...venta.valores, total: String(total) },
      mensaje: `${producto.nombre}: ${colones(producto.precio)} × ${cantidad} = ${colones(total)}`,
    }))
    persistirFormularioVenta(tienda.obtener().venta.valores)
  })

  form.addEventListener('reset', () => {
    setTimeout(() => {
      tienda.actualizarSeccion('venta', {
        valores: valorFormulario({}),
        errores: {},
        modo: 'crear',
        edicionId: null,
        mensaje: 'Formulario limpiado.',
      })
      limpiarFormularioVenta()
    }, 0)
  })

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const { venta } = tienda.obtener()
    tienda.actualizarSeccion('venta', { enviando: true, errores: {}, mensaje: null })

    const cuerpo = cuerpoDesdeFormulario(venta.valores)
    const esEdicion = venta.modo === 'editar' && venta.edicionId
    const sku = String(venta.valores.producto_sku ?? '').trim()
    const cantidad = Number(venta.valores.cantidad) || 1

    try {
      // Al crear, el SKU se resuelve antes de guardar la venta para no dejar ventas huérfanas.
      const producto = !esEdicion && sku ? await buscarProductoPorSku(sku) : null
      if (sku && !esEdicion && !producto) {
        tienda.actualizarSeccion('venta', {
          enviando: false,
          errores: { producto_sku: [`No se encontró un producto con SKU “${sku}”.`] },
        })
        return
      }

      const respuesta = esEdicion
        ? await api.actualizarVenta(venta.edicionId, cuerpo)
        : await api.crearVenta(cuerpo)

      let mensaje = esEdicion
        ? `Venta #${venta.edicionId} actualizada.`
        : `Venta #${respuesta.id} registrada.`

      if (producto) {
        try {
          await api.crearLineaVenta({
            sale_id: respuesta.id,
            product_id: producto.id,
            quantity: cantidad,
            unit_price: producto.precio,
            subtotal: Math.round(producto.precio * cantidad * 100) / 100,
          })
          mensaje = `Venta #${respuesta.id} registrada: ${cantidad} × ${producto.nombre}.`
        } catch (errorLinea) {
          if (errorLinea instanceof ErrorApi && errorLinea.status === 401) throw errorLinea
          mensaje = `Venta #${respuesta.id} registrada, pero no se pudo agregar el producto: ${errorLinea.message}`
        }
      }

      tienda.actualizarSeccion('venta', {
        enviando: false,
        errores: {},
        modo: 'crear',
        edicionId: null,
        mensaje,
        valores: esEdicion ? venta.valores : valorFormulario({}),
      })
      if (!esEdicion) limpiarFormularioVenta()
      await cargarHistorial()
    } catch (error) {
      if (esAborto(error)) return
      if (error instanceof ErrorApi && error.status === 401) {
        expirarSesion()
        return
      }
      tienda.actualizarSeccion('venta', {
        enviando: false,
        errores:
          error instanceof ErrorApi && error.status === 422
            ? error.errors
            : { formulario: [mensajeErrorVenta(error, esEdicion)] },
      })
    }
  })

  zonaContenido.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-editar]')
    if (!boton) return

    const id = Number(boton.dataset.editar)
    const { historial } = tienda.obtener()
    const venta = historial.datos.find((v) => v.id === id)
    if (!venta) return

    tienda.actualizarSeccion('venta', {
      modo: 'editar',
      edicionId: id,
      errores: {},
      mensaje: `Editando la venta #${id}.`,
      valores: valorFormulario({
        id_customer: venta.id_customer ?? '',
        sale_date: String(venta.sale_date).slice(0, 10),
        total: String(venta.total),
        tax_amount: venta.tax_amount == null ? '' : String(venta.tax_amount),
        discount: venta.discount == null ? '' : String(venta.discount),
        status: venta.status,
        producto_sku: tienda.obtener().venta.valores.producto_sku ?? '',
        cantidad: tienda.obtener().venta.valores.cantidad ?? '1',
      }),
    })
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  const formPago = montarFormularioPago()

  zonaContenido.addEventListener('click', async (evento) => {
    const pagarBoton = evento.target.closest('[data-pagar]')
    const eliminarBoton = evento.target.closest('[data-eliminar]')

    if (pagarBoton && formPago) {
      const venta = tienda.obtener().historial.datos.find((v) => v.id === Number(pagarBoton.dataset.pagar))
      if (!venta) return
      formPago.cargar({
        sale_id: venta.id,
        amount: venta.total,
        payment_method: 'cash',
        status: 'completed',
        transaction_reference: '',
      })
      formPago.marcarErrores({})
      alternarFormulario(document.querySelector('#btn-mostrar-pago'), document.querySelector('#form-pago'), true)
      document.querySelector('#t-pago').scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (eliminarBoton) {
      const id = Number(eliminarBoton.dataset.eliminar)
      if (!window.confirm(`¿Eliminar la venta #${id}? Esta acción no se puede deshacer.`)) return

      let fallo = false
      await llamada(
        () => api.eliminarRecurso('/sales', id),
        (error) => {
          fallo = true
          tienda.actualizarSeccion('venta', { mensaje: null, errores: { formulario: [error.message] } })
        },
      )
      if (fallo) return

      tienda.actualizarSeccion('venta', { mensaje: `Venta #${id} eliminada.`, errores: {} })
      await cargarHistorial()
    }
  })

  document.querySelector('#btn-cancelar-edicion')?.addEventListener('click', () => {
    tienda.actualizarSeccion('venta', {
      modo: 'crear',
      edicionId: null,
      errores: {},
      mensaje: 'Edición cancelada.',
      valores: valorFormulario({}),
    })
    limpiarFormularioVenta()
  })

  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })

  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    expirarSesion()
  })

  const { venta } = tienda.obtener()
  if (venta.valores.total || venta.valores.id_customer) {
    tienda.actualizarSeccion('venta', {
      mensaje: 'Sesión restaurada: no se perdieron los datos del formulario.',
    })
  }

  tienda.suscribir(pintar)
  pintar()
  if (api.puede('view customers')) cargarClientes()
  if (api.puede('view sales')) cargarHistorial()
}

function iniciarLogin() {
  const form = document.querySelector('#login-form')
  const zonaError = document.querySelector('#login-error')

  const mostrarError = (texto, color = 'var(--danger)') => {
    zonaError.textContent = texto
    zonaError.className = texto ? 'error' : 'ayuda'
    zonaError.style.color = color
  }

  const motivo = new URLSearchParams(location.search).get('motivo')
  if (motivo === 'expirada') {
    mostrarError(
      'Su sesión expiró (el token vence a las 2 horas). Inicie sesión de nuevo: los datos del formulario se conservaron.',
      'var(--bruma-texto)',
    )
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    mostrarError('')

    const datos = new FormData(form)
    try {
      await api.iniciarSesion(datos.get('email'), datos.get('password'))
    } catch (error) {
      if (esAborto(error)) return
      if (error instanceof ErrorApi) {
        mostrarError(
          error.status === 422
            ? Object.values(error.errors).flat().join(' ')
            : error.message,
        )
        return
      }
      mostrarError('Error inesperado. Intente de nuevo.')
      return
    }

    const retorno = tomarRetorno()
    location.replace(retorno || 'index.html')
  })
}

if (vista === 'catalogo') iniciarCatalogo()
else if (vista === 'ventas') iniciarVentas()
else if (vista === 'login') iniciarLogin()
