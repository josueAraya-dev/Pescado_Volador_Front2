const formatoColones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

export function colones(valor) {
  return formatoColones.format(Number(valor) || 0)
}

export function nodo(tag, opciones = {}, ...hijos) {
  const elemento = document.createElement(tag)
  Object.entries(opciones).forEach(([clave, valor]) => {
    if (clave === 'texto') elemento.textContent = valor
    else if (clave === 'clase') elemento.className = valor
    else if (clave.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor)
    } else if (valor !== undefined && valor !== null && valor !== false) {
      elemento.setAttribute(clave, valor === true ? '' : valor)
    }
  })
  hijos.flat().forEach((hijo) => {
    if (hijo) elemento.append(hijo)
  })
  return elemento
}

export function renderizarLista({
  zonaEstado,
  zonaContenido,
  zonaPaginacion = null,
  seccion,
  pintar,
  onReintentar = null,
  onPagina = null,
  etiqueta = 'elementos',
}) {
  zonaEstado.replaceChildren()
  zonaContenido.replaceChildren()
  if (zonaPaginacion) zonaPaginacion.replaceChildren()
  zonaContenido.hidden = seccion.estado !== 'datos'
  if (zonaPaginacion) zonaPaginacion.hidden = seccion.estado !== 'datos'

  if (seccion.estado === 'carga') {
    zonaEstado.append(
      nodo('p', { clase: '', role: 'status', texto: `Cargando ${etiqueta}…` }),
    )
    return
  }

  if (seccion.estado === 'vacio') {
    zonaEstado.append(
      nodo('p', {
        role: 'status',
        texto: seccion.q
          ? `No se encontraron ${etiqueta} para “${seccion.q}”.`
          : `No hay ${etiqueta} por mostrar todavía.`,
      }),
    )
    return
  }

  if (seccion.estado === 'error') {
    const acciones = nodo('p', { clase: 'acciones' })
    if (onReintentar) {
      acciones.append(
        nodo('button', { type: 'button', clase: 'btn-primario', texto: 'Reintentar', onClick: onReintentar }),
      )
    }
    zonaEstado.append(
      nodo('div', { clase: 'error', role: 'alert' }, [
        nodo('p', { texto: seccion.error || 'Ocurrió un error inesperado.' }),
        acciones,
      ]),
    )
    return
  }

  zonaEstado.append(
    nodo('p', { role: 'status', texto: `${seccion.datos.length} ${etiqueta} en esta página.` }),
  )
  zonaContenido.append(...pintar(seccion.datos))

  if (zonaPaginacion && seccion.meta && onPagina) {
    zonaPaginacion.append(paginacion(seccion.meta, onPagina))
  }
}

function paginacion(meta, onPagina) {
  const pagina = meta.current_page
  const ultima = meta.last_page

  return nodo('p', { clase: 'fila' }, [
    nodo('button', {
      type: 'button',
      texto: '← Anterior',
      disabled: pagina <= 1,
      onClick: () => onPagina(pagina - 1),
    }),
    nodo('span', { role: 'status', texto: `Página ${pagina} de ${ultima} · ${meta.total} en total` }),
    nodo('button', {
      type: 'button',
      texto: 'Siguiente →',
      disabled: pagina >= ultima,
      onClick: () => onPagina(pagina + 1),
    }),
  ])
}

function badgeStock(producto) {
  const stock = Number(producto.cantidad_stock ?? 0)
  const minimo = Number(producto.stock_minimo ?? 0)

  if (!producto.esta_activo) return nodo('span', { clase: 'badge', texto: 'Inactivo' })
  if (stock === 0) return nodo('span', { clase: 'badge', texto: 'Agotado' })
  if (minimo > 0 && stock <= minimo) {
    return nodo('span', { clase: 'badge badge-bajo', texto: `Solo ${stock}` })
  }
  return nodo('span', { clase: 'badge badge-ok', texto: '✓ En stock' })
}

export function pintarProductos(datos) {
  return datos.map((producto) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: producto.nombre }),
      nodo('p', { texto: `${producto.sku} · ${colones(producto.precio)}` }),
      producto.descripcion
        ? nodo('p', { clase: 'ayuda', texto: producto.descripcion })
        : null,
      nodo('p', { clase: 'badges' }, [badgeStock(producto)]),
      nodo('p', { clase: 'card-pie' }, [
        nodo('button', { type: 'button', texto: 'Ver detalle', 'data-detalle': producto.id }),
      ]),
    ]),
  )
}

export function pintarDetalleProducto(producto, imagenBarras = null) {
  const filas = [
    ['SKU', producto.sku],
    ['Precio', colones(producto.precio)],
    ['Stock', String(producto.cantidad_stock ?? 0)],
    ['Stock mínimo', producto.stock_minimo == null ? 'No definido' : String(producto.stock_minimo)],
    ['Stock máximo', producto.stock_maximo == null ? 'No definido' : String(producto.stock_maximo)],
    ['Impuesto', `${Number(producto.tasa_impuesto ?? 0)} %`],
    ['Peso', producto.peso == null ? 'No definido' : String(producto.peso)],
    ['Código de barras', producto.codigo_barras || 'Sin código asignado'],
    ['Estado', producto.esta_activo ? 'Activo' : 'Inactivo'],
  ]

  // filter(Boolean): replaceChildren/append convierten null en el texto "null".
  return [
    nodo('h3', { texto: producto.nombre }),
    producto.descripcion ? nodo('p', { clase: 'ayuda', texto: producto.descripcion }) : null,
    nodo(
      'dl',
      { clase: 'detalle-producto' },
      filas.flatMap(([etiqueta, valor]) => [
        nodo('dt', { texto: etiqueta }),
        nodo('dd', { texto: valor }),
      ]),
    ),
    imagenBarras
      ? nodo('img', {
          clase: 'codigo-barras',
          src: imagenBarras,
          alt: `Código de barras ${producto.codigo_barras}`,
        })
      : null,
  ].filter(Boolean)
}

export function pintarResumenInventario(datos) {
  return [
    nodo('table', {}, [
      nodo('caption', { texto: 'Totales por categoría' }),
      nodo(
        'thead',
        {},
        nodo(
          'tr',
          {},
          ['Categoría', 'Productos', 'Stock total', 'Precio promedio'].map((texto) =>
            nodo('th', { scope: 'col', texto }),
          ),
        ),
      ),
      nodo(
        'tbody',
        {},
        datos.map((fila) =>
          nodo('tr', {}, [
            nodo('th', { scope: 'row', texto: fila.category_name }),
            nodo('td', { texto: String(fila.total_products) }),
            nodo('td', { texto: String(fila.total_stock) }),
            nodo('td', { texto: colones(fila.average_price) }),
          ]),
        ),
      ),
    ]),
  ]
}

const formatoFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'UTC' })

function fechaVenta(valor) {
  const iso = String(valor ?? '').slice(0, 10)
  const fecha = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : formatoFecha.format(fecha)
}

function badgeEstadoVenta(estado) {
  const texto = String(estado ?? '').trim() || 'sin estado'
  const valor = texto.toLowerCase()
  let clase = 'badge badge-neutro'
  if (valor.startsWith('complet')) clase = 'badge badge-ok'
  else if (valor.startsWith('pendient')) clase = 'badge badge-bajo'
  else if (valor.startsWith('cancel')) clase = 'badge badge-error'
  return nodo('span', { clase, texto })
}

export function pintarVentas(datos, nombreCliente, { editable = true, eliminable = false, pagable = false } = {}) {
  return datos.map((venta) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: `Venta #${venta.id}` }),
      nodo('p', { texto: nombreCliente(venta) }),
      nodo('p', { clase: 'price', texto: colones(venta.total) }),
      nodo('p', { clase: 'badges' }, [badgeEstadoVenta(venta.status)]),
      nodo('p', { clase: 'ayuda', texto: `Fecha: ${fechaVenta(venta.sale_date)}` }),
      nodo('p', { clase: 'card-pie' }, [
        editable
          ? nodo('button', {
              type: 'button',
              clase: 'btn-primario',
              texto: 'Editar',
              'data-editar': venta.id,
            })
          : nodo('span', { clase: 'ayuda', texto: 'Solo lectura' }),
        pagable ? nodo('button', { type: 'button', texto: 'Registrar pago', 'data-pagar': venta.id }) : null,
        eliminable ? nodo('button', { type: 'button', texto: 'Eliminar', 'data-eliminar': venta.id }) : null,
      ]),
    ]),
  )
}

export function renderFormularioVenta(venta, form) {
  if (!form) return

  Object.entries(venta.valores).forEach(([campo, valor]) => {
    const control = form.elements.namedItem(campo)
    if (!control || control === document.activeElement) return
    control.value = valor ?? ''
  })

  const nombres = ['id_customer', 'sale_date', 'total', 'tax_amount', 'discount', 'status']
  nombres.forEach((campo) => {
    const control = form.elements.namedItem(campo)
    const zonaError = form.querySelector(`[data-error="${campo}"]`)
    if (!control) return

    const mensaje = venta.errores[campo]?.[0] ?? ''
    control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
    if (zonaError) {
      zonaError.textContent = mensaje
      zonaError.className = mensaje ? 'error' : 'ayuda'
    }
  })

  const generales = Object.entries(venta.errores)
    .filter(([campo]) => !nombres.includes(campo))
    .filter(([, mensajes]) => Array.isArray(mensajes))
    .flatMap(([, mensajes]) => mensajes)

  const estado = form.querySelector('#estado-venta')
  if (estado) {
    if (generales.length) {
      estado.textContent = generales.join(' ')
      estado.style.color = 'var(--danger)'
    } else if (venta.mensaje) {
      estado.textContent = venta.mensaje
      estado.style.color = 'var(--success)'
    } else if (venta.enviando) {
      estado.textContent = 'Guardando venta…'
      estado.style.color = ''
    } else {
      estado.textContent = ''
    }
  }

  const boton = form.querySelector('[type="submit"]')
  if (boton) boton.disabled = venta.enviando

  const titulo = document.querySelector('#t-venta')
  if (titulo) {
    titulo.textContent = venta.modo === 'editar' ? `Editar venta #${venta.edicionId}` : 'Nueva venta'
  }

  const cancelar = form.querySelector('#btn-cancelar-edicion')
  if (cancelar) cancelar.hidden = venta.modo !== 'editar'
}

export function renderClientes(select, clientes) {
  if (!select) return

  const firma = clientes.datos.map((c) => c.id_customer).join(',')
  if (select.dataset.firma === firma) return
  select.dataset.firma = firma

  const seleccionado = select.value
  select.replaceChildren(
    nodo('option', { value: '', texto: 'Seleccione…' }),
    ...clientes.datos.map((cliente) =>
      nodo('option', {
        value: cliente.id_customer,
        texto: `${cliente.first_name} ${cliente.last_name1}`.trim() || cliente.email,
      }),
    ),
  )

  if (clientes.estado === 'error') {
    select.append(nodo('option', { value: '', texto: 'No se pudieron cargar los clientes' }))
  }
  select.value = seleccionado || ''
}
