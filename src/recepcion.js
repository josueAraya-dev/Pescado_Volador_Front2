import { ErrorApi } from './api.js'
import { api, aplicarPermisos, configurarSalir, exigirPagina, exigirSesion, llamada } from './comun.js'
import { nodo } from './views.js'

function iniciar() {
  if (!exigirPagina('receive purchases')) return
  aplicarPermisos()
  configurarSalir()
  if (!api.puede('receive purchases')) return

  const formBuscar = document.querySelector('#buscar-form')
  const campoCodigo = document.querySelector('#codigo')
  const zonaBuscar = document.querySelector('#buscar-estado')
  const zonaPendientes = document.querySelector('#pendientes')
  const seccionConfirmar = document.querySelector('#confirmar')
  const zonaDetalle = document.querySelector('#confirmar-detalle')
  const formRecibir = document.querySelector('#recibir-form')
  const estado = document.querySelector('#estado-recepcion')
  const botonRecibir = formRecibir.querySelector('[type="submit"]')

  let codigoBuscado = ''
  let pendientes = []
  let seleccionado = null

  const aviso = (texto) => nodo('p', { clase: 'error', role: 'alert', texto })

  function marcarErrores(errores = {}) {
    ;['barcode', 'quantity'].forEach((campo) => {
      const control = formRecibir.elements.namedItem(campo)
      const zona = formRecibir.querySelector(`[data-error="${campo}"]`)
      const mensaje = errores[campo]?.[0] ?? ''
      control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      zona.textContent = mensaje
      zona.className = mensaje ? 'error' : 'ayuda'
    })
  }

  function pintarPendientes(datos) {
    zonaPendientes.replaceChildren(
      ...datos.map((detalle) =>
        nodo('article', { clase: 'card' }, [
          nodo('h3', { texto: detalle.nombre }),
          nodo('p', { texto: `Compra ${detalle.id_purchase} · Detalle #${detalle.id}` }),
          nodo('p', { texto: `Cantidad a recibir: ${detalle.quantity}` }),
          nodo('p', { clase: 'card-pie' }, [
            nodo('button', {
              type: 'button',
              clase: 'btn-primario',
              texto: 'Recibir este detalle',
              'data-recibir': detalle.id,
            }),
          ]),
        ]),
      ),
    )
  }

  async function buscar(codigo) {
    codigoBuscado = codigo
    seleccionado = null
    seccionConfirmar.hidden = true
    zonaPendientes.replaceChildren()
    zonaBuscar.replaceChildren(nodo('p', { role: 'status', texto: 'Buscando detalles pendientes…' }))

    const respuesta = await llamada(
      () => api.listarRecepcionesPendientes(codigo),
      (error) =>
        zonaBuscar.replaceChildren(
          aviso(
            error.status === 404
              ? `No existe un producto con el código “${codigo}”.`
              : error.message,
          ),
        ),
    )
    if (!respuesta) return

    pendientes = respuesta.data
    if (!pendientes.length) {
      zonaBuscar.replaceChildren(
        nodo('p', {
          role: 'status',
          texto: `No hay detalles pendientes de recepción para el código “${codigo}”.`,
        }),
      )
      return
    }

    zonaBuscar.replaceChildren(
      nodo('p', { role: 'status', texto: `${pendientes.length} detalle(s) pendiente(s) para este código.` }),
    )
    pintarPendientes(pendientes)
  }

  function seleccionar(id) {
    seleccionado = pendientes.find((detalle) => detalle.id === id) ?? null
    if (!seleccionado) return

    zonaDetalle.replaceChildren(
      nodo('p', { texto: `Producto: ${seleccionado.nombre}` }),
      nodo('p', { texto: `Compra ${seleccionado.id_purchase} · Detalle #${seleccionado.id}` }),
      nodo('p', { texto: `Cantidad esperada: ${seleccionado.quantity}` }),
    )
    formRecibir.elements.namedItem('barcode').value = codigoBuscado
    formRecibir.elements.namedItem('quantity').value = String(seleccionado.quantity)
    marcarErrores({})
    estado.textContent = ''
    estado.style.color = ''
    seccionConfirmar.hidden = false
    seccionConfirmar.focus()
  }

  formBuscar.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const codigo = campoCodigo.value.trim()
    if (!codigo) {
      zonaBuscar.replaceChildren(aviso('Escriba o escanee un código de barras.'))
      return
    }
    buscar(codigo)
  })

  zonaPendientes.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-recibir]')
    if (boton) seleccionar(Number(boton.dataset.recibir))
  })

  document.querySelector('#btn-cancelar-recepcion').addEventListener('click', () => {
    seccionConfirmar.hidden = true
    seleccionado = null
  })

  formRecibir.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (!seleccionado) return

    const detalle = seleccionado
    const barcode = formRecibir.elements.namedItem('barcode').value.trim()
    const quantity = Number(formRecibir.elements.namedItem('quantity').value)

    const errores = {}
    if (!barcode) errores.barcode = ['Escriba el código de barras del producto.']
    if (!Number.isInteger(quantity) || quantity < 1) {
      errores.quantity = ['Ingrese una cantidad entera mayor que cero.']
    } else if (quantity !== Number(detalle.quantity)) {
      errores.quantity = [`Debe coincidir exactamente con la cantidad del detalle (${detalle.quantity}).`]
    }
    marcarErrores(errores)
    if (Object.keys(errores).length) return

    botonRecibir.disabled = true
    estado.style.color = ''
    estado.textContent = 'Registrando recepción…'

    const respuesta = await llamada(
      () => api.recibirDetalle(detalle.id, { barcode, quantity }),
      (error) => {
        if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
          marcarErrores(error.errors)
          estado.textContent = ''
        } else {
          estado.style.color = 'var(--danger)'
          estado.textContent = error.message
        }
      },
    )
    botonRecibir.disabled = false
    if (!respuesta) return

    seccionConfirmar.hidden = true
    seleccionado = null
    await buscar(codigoBuscado)
    zonaBuscar.prepend(
      nodo('p', {
        role: 'status',
        texto: `Recibidos ${quantity} × ${detalle.nombre} (compra ${detalle.id_purchase}).`,
      }),
    )
  })
}

if (exigirSesion()) iniciar()
