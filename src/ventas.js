import { ErrorApi } from './api.js'
import { api, aplicarPermisos, configurarSalir, exigirPagina, exigirSesion, llamada } from './comun.js'
import { colones, nodo, pintarVentas, renderizarLista } from './views.js'

const ESTADOS_CAMPOS = ['id_customer', 'sale_date', 'status', 'tax_amount', 'discount', 'total']

function hoyISO() {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 10)
}

// Mensaje claro para errores de la API que no son de campo.
function mensajeError(error) {
  if (error instanceof ErrorApi && error.status === 404) {
    return 'La venta no existe o solo puede editar las ventas que usted registró.'
  }
  if (error instanceof ErrorApi && error.status === 403) {
    return 'Su rol no tiene permiso para realizar esta acción.'
  }
  return error?.message || 'No se pudo guardar la venta.'
}

function iniciar() {
  if (!exigirPagina('view sales')) return
  aplicarPermisos()
  configurarSalir()
  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    location.replace('login.html?motivo=expirada')
  })

  const $ = (selector) => document.querySelector(selector)
  const form = $('#venta-form')
  const campo = (nombre) => form.elements.namedItem(nombre)
  const estadoVenta = $('#estado-venta')
  const botonConfirmar = $('#btn-confirmar')
  const botonCancelarEdicion = $('#btn-cancelar-edicion')
  const bloqueLineas = $('#bloque-lineas')
  const campoTotalBloque = $('#campo-total')
  const tituloVenta = $('#t-venta')

  let lineas = []
  let edicion = null // id de la venta que se edita (solo cabecera)

  const clientes = []

  // Clientes
  async function cargarClientes() {
    const respuesta = await llamada(() => api.listarClientes())
    if (!respuesta) return
    clientes.splice(0, clientes.length, ...respuesta.data)
    const seleccionado = campo('id_customer').value
    campo('id_customer').replaceChildren(
      nodo('option', { value: '', texto: 'Mostrador (sin cliente)' }),
      ...clientes.map((c) =>
        nodo('option', {
          value: c.id_customer,
          texto: `${c.first_name} ${c.last_name1}`.trim() || c.email,
        }),
      ),
    )
    campo('id_customer').value = seleccionado
  }

  const nombreCliente = (venta) => {
    if (!venta.id_customer) return 'Mostrador'
    const cliente = clientes.find((c) => c.id_customer === venta.id_customer)
    return cliente ? `${cliente.first_name} ${cliente.last_name1}`.trim() : `Cliente #${venta.id_customer}`
  }

  // Líneas de producto
  const lineasEstado = $('#lineas-estado')

  function mostrarLineas(texto, esError = false) {
    lineasEstado.className = esError ? 'error' : 'ayuda'
    lineasEstado.textContent = texto
  }

  const subtotalLinea = (linea) => Math.round(linea.precio * linea.cantidad * 100) / 100

  function totales() {
    const subtotal = lineas.reduce((suma, linea) => suma + subtotalLinea(linea), 0)
    const impuesto = Number(campo('tax_amount').value) || 0
    const descuento = Number(campo('discount').value) || 0
    return { subtotal, impuesto, descuento, total: subtotal + impuesto - descuento }
  }

  function pintarTotales() {
    const { subtotal, impuesto, descuento, total } = totales()
    $('#resumen-subtotal').textContent = colones(subtotal)
    $('#resumen-impuesto').textContent = colones(impuesto)
    $('#resumen-descuento').textContent = colones(descuento)
    $('#resumen-total').textContent = colones(total)
  }

  function pintarLineas() {
    const cuerpo = $('#lineas-cuerpo')
    if (!lineas.length) {
      cuerpo.replaceChildren(
        nodo('tr', {}, [nodo('td', { colspan: 5, clase: 'ayuda', texto: 'Aún no hay productos en la venta.' })]),
      )
    } else {
      cuerpo.replaceChildren(
        ...lineas.map((linea, indice) =>
          nodo('tr', {}, [
            nodo('td', {}, [
              nodo('strong', { texto: linea.nombre }),
              nodo('br'),
              nodo('span', { clase: 'ayuda', texto: `SKU ${linea.sku}` }),
            ]),
            nodo('td', {}, [
              nodo('input', {
                type: 'number',
                min: 1,
                step: 1,
                value: linea.cantidad,
                'aria-label': `Cantidad de ${linea.nombre}`,
                'data-cantidad': indice,
              }),
            ]),
            nodo('td', { texto: colones(linea.precio) }),
            nodo('td', { texto: colones(subtotalLinea(linea)) }),
            nodo('td', {}, [
              nodo('button', {
                type: 'button',
                clase: 'btn-quitar',
                texto: 'Quitar',
                'data-quitar': indice,
              }),
            ]),
          ]),
        ),
      )
    }
    pintarTotales()
  }

  async function buscarProductoPorSku(sku) {
    const respuesta = await llamada(() => api.listarProductos({ q: sku, perPage: 10 }))
    const buscado = sku.toUpperCase()
    return respuesta?.data?.find((p) => String(p.sku).toUpperCase() === buscado) ?? null
  }

  async function agregarLinea() {
    const sku = $('#linea-sku').value.trim()
    const cantidad = Number($('#linea-cantidad').value)
    if (!sku) return mostrarLineas('Escriba el SKU del producto.', true)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return mostrarLineas('La cantidad debe ser un número entero mayor que cero.', true)
    }

    mostrarLineas('Buscando producto…')
    const producto = await buscarProductoPorSku(sku)
    if (!producto) return mostrarLineas(`No se encontró un producto con SKU “${sku}”.`, true)

    const existente = lineas.find((linea) => linea.id === producto.id)
    if (existente) {
      existente.cantidad += cantidad
    } else {
      lineas.push({ id: producto.id, sku: producto.sku, nombre: producto.nombre, precio: producto.precio, cantidad })
    }

    $('#linea-sku').value = ''
    $('#linea-cantidad').value = '1'
    mostrarLineas(`Agregado: ${cantidad} × ${producto.nombre}.`)
    pintarLineas()
    $('#linea-sku').focus()
  }

  $('#btn-agregar-linea').addEventListener('click', agregarLinea)
  $('#linea-sku').addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      agregarLinea()
    }
  })

  $('#lineas-cuerpo').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-quitar]')
    if (!boton) return
    lineas.splice(Number(boton.dataset.quitar), 1)
    mostrarLineas('')
    pintarLineas()
  })

  $('#lineas-cuerpo').addEventListener('change', (evento) => {
    const entrada = evento.target.closest('[data-cantidad]')
    if (!entrada) return
    const cantidad = Number(entrada.value)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      mostrarLineas('La cantidad debe ser un número entero mayor que cero.', true)
      pintarLineas()
      return
    }
    lineas[Number(entrada.dataset.cantidad)].cantidad = cantidad
    mostrarLineas('')
    pintarLineas()
  })

  campo('tax_amount').addEventListener('input', pintarTotales)
  campo('discount').addEventListener('input', pintarTotales)

  // Errores por campo
  function marcarErrores(errores = {}) {
    ESTADOS_CAMPOS.forEach((nombre) => {
      const control = campo(nombre)
      const zona = form.querySelector(`[data-error="${nombre}"]`)
      const mensaje = [].concat(errores[nombre] ?? [])[0] ?? ''
      if (control) control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      if (zona) {
        zona.textContent = mensaje
        zona.className = mensaje ? 'error' : 'ayuda'
      }
    })
    return Object.entries(errores)
      .filter(([nombre]) => !ESTADOS_CAMPOS.includes(nombre))
      .flatMap(([, mensajes]) => [].concat(mensajes))
  }

  function mostrarEstado(texto, esError = false) {
    estadoVenta.className = esError ? 'error' : 'ayuda'
    estadoVenta.textContent = texto
  }

  function valoresCabecera() {
    return {
      id_customer: campo('id_customer').value ? String(campo('id_customer').value) : null,
      sale_date: campo('sale_date').value,
      status: campo('status').value,
      tax_amount: Number(campo('tax_amount').value) || 0,
      discount: Number(campo('discount').value) || 0,
    }
  }

  function validarCabecera(cabecera) {
    const errores = {}
    if (!cabecera.sale_date) errores.sale_date = ['Seleccione la fecha de la venta.']
    if (cabecera.tax_amount < 0) errores.tax_amount = ['El impuesto no puede ser negativo.']
    if (cabecera.discount < 0) errores.discount = ['El descuento no puede ser negativo.']
    return errores
  }

  // Modo de edición (solo cabecera; las líneas se gestionan al crear la venta)
  function modoCrear() {
    edicion = null
    tituloVenta.textContent = 'Nueva venta'
    botonConfirmar.textContent = 'Confirmar venta'
    botonCancelarEdicion.hidden = true
    bloqueLineas.hidden = false
    campoTotalBloque.hidden = true
    campo('total').removeAttribute('required')
  }

  function limpiarFormulario() {
    form.reset()
    campo('sale_date').value = hoyISO()
    campo('tax_amount').value = '0'
    campo('discount').value = '0'
    lineas = []
    mostrarLineas('')
    marcarErrores({})
    pintarLineas()
  }

  function modoEditar(venta) {
    edicion = venta.id
    tituloVenta.textContent = `Editar venta #${venta.id}`
    botonConfirmar.textContent = 'Guardar cambios'
    botonCancelarEdicion.hidden = false
    bloqueLineas.hidden = true
    campoTotalBloque.hidden = false
    campo('total').setAttribute('required', '')
    campo('id_customer').value = venta.id_customer ?? ''
    campo('sale_date').value = String(venta.sale_date).slice(0, 10)
    campo('status').value = venta.status
    campo('tax_amount').value = venta.tax_amount ?? 0
    campo('discount').value = venta.discount ?? 0
    campo('total').value = venta.total
    marcarErrores({})
    mostrarEstado(`Editando la venta #${venta.id}.`)
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  $('#btn-cancelar-edicion').addEventListener('click', () => {
    modoCrear()
    limpiarFormulario()
    mostrarEstado('Edición cancelada.')
  })

  // Envío
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const cabecera = valoresCabecera()

    if (edicion === null) {
      const { total } = totales()
      const errores = validarCabecera(cabecera)
      if (total < 0) errores.discount = ['El descuento no puede superar el subtotal más el impuesto.']
      if (!lineas.length) errores.formulario = ['Agregue al menos un producto a la venta.']
      const generales = marcarErrores(errores)
      if (generales.length) return mostrarEstado(generales.join(' '), true)
      if (Object.keys(errores).length) return mostrarEstado('Revise los datos marcados.', true)

      botonConfirmar.disabled = true
      mostrarEstado('Guardando venta…')
      const venta = await llamada(
        () => api.crearVenta({ ...cabecera, total }),
        (error) => {
          if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
            const sobrantes = marcarErrores(error.errors)
            mostrarEstado(sobrantes.join(' ') || 'Revise los datos marcados.', true)
          } else {
            mostrarEstado(mensajeError(error), true)
          }
        },
      )
      if (!venta) {
        botonConfirmar.disabled = false
        return
      }

      // Cada producto es una línea de la venta creada.
      const fallidas = []
      for (const linea of lineas) {
        mostrarEstado(`Agregando ${linea.nombre}…`)
        const agregada = await llamada(
          () =>
            api.crearLineaVenta({
              sale_id: venta.id,
              product_id: linea.id,
              quantity: linea.cantidad,
              unit_price: linea.precio,
              subtotal: subtotalLinea(linea),
            }),
          () => fallidas.push(linea.nombre),
        )
      }

      botonConfirmar.disabled = false
      if (fallidas.length) {
        mostrarEstado(
          `Venta #${venta.id} registrada, pero no se agregaron: ${fallidas.join(', ')}.`,
          true,
        )
      } else {
        mostrarEstado(`Venta #${venta.id} registrada con ${lineas.length} producto(s).`)
        limpiarFormulario()
      }
      cargarHistorial()
      return
    }

    // Edición de cabecera
    const errores = validarCabecera(cabecera)
    const total = Number(campo('total').value)
    if (!Number.isFinite(total) || total < 0) errores.total = ['Ingrese un total válido.']
    const generales = marcarErrores(errores)
    if (generales.length) return mostrarEstado(generales.join(' '), true)
    if (Object.keys(errores).length) return mostrarEstado('Revise los datos marcados.', true)

    botonConfirmar.disabled = true
    mostrarEstado('Guardando cambios…')
    const actualizada = await llamada(
      () => api.actualizarVenta(edicion, { ...cabecera, total }),
      (error) => {
        if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
          const sobrantes = marcarErrores(error.errors)
          mostrarEstado(sobrantes.join(' ') || 'Revise los datos marcados.', true)
        } else {
          mostrarEstado(mensajeError(error), true)
        }
      },
    )
    botonConfirmar.disabled = false
    if (!actualizada) return

    const id = edicion
    modoCrear()
    limpiarFormulario()
    mostrarEstado(`Venta #${id} actualizada.`)
    cargarHistorial()
  })

  // Historial
  const zonaHistorialEstado = $('#historial-estado')
  const zonaHistorial = $('#historial')
  const zonaHistorialNav = $('#historial-paginacion')
  const historial = { estado: 'carga', datos: [], meta: null, error: null }
  let pagina = 1
  let controladorHistorial = null

  function pintarHistorial() {
    renderizarLista({
      zonaEstado: zonaHistorialEstado,
      zonaContenido: zonaHistorial,
      zonaPaginacion: zonaHistorialNav,
      seccion: historial,
      etiqueta: 'ventas',
      pintar: (datos) =>
        pintarVentas(datos, nombreCliente, {
          editable: api.puede('update sales'),
          eliminable: api.puede('delete sales'),
        }),
      onReintentar: cargarHistorial,
      onPagina: (nueva) => {
        pagina = nueva
        cargarHistorial()
      },
    })
  }

  async function cargarHistorial() {
    controladorHistorial?.abort()
    controladorHistorial = new AbortController()
    Object.assign(historial, { estado: 'carga', error: null })
    pintarHistorial()

    const respuesta = await llamada(
      () => api.listarVentas({ page: pagina }, controladorHistorial.signal),
      (error) => {
        Object.assign(historial, { estado: 'error', datos: [], meta: null, error: error.message })
        pintarHistorial()
      },
    )
    if (!respuesta) return

    Object.assign(historial, {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
    pintarHistorial()
  }

  zonaHistorial.addEventListener('click', async (evento) => {
    const editarBoton = evento.target.closest('[data-editar]')
    const eliminarBoton = evento.target.closest('[data-eliminar]')

    if (editarBoton) {
      const venta = historial.datos.find((v) => v.id === Number(editarBoton.dataset.editar))
      if (venta) modoEditar(venta)
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
          mostrarEstado(mensajeError(error), true)
        },
      )
      if (fallo) return

      if (edicion === id) {
        modoCrear()
        limpiarFormulario()
      }
      mostrarEstado(`Venta #${id} eliminada.`)
      cargarHistorial()
    }
  })

  // Arranque
  limpiarFormulario()
  modoCrear()
  if (api.puede('create sales') && !api.puede('view customers')) {
    campo('id_customer').disabled = true
  }
  cargarClientes()
  cargarHistorial()
}

if (exigirSesion()) iniciar()
