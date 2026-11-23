import { ErrorApi } from './api.js'
import { alternarFormulario, api, llamada } from './comun.js'
import { construirFormulario } from './formularios.js'
import { nodo } from './views.js'

// Tabla con alta, edición y baja según los permisos del backend.
// Si el rol no tiene un permiso, la acción no aparece (la API la rechazaría igual).
export function montarCrud({ raiz, titulo, ruta, permisos, campos = [], columnas, idDe, valoresDe, etiqueta, nuevoTexto = 'Agregar registro' }) {
  const puedeCrear = Boolean(permisos.crear && api.puede(permisos.crear))
  const puedeEditar = Boolean(permisos.actualizar && api.puede(permisos.actualizar))
  const puedeEliminar = Boolean(permisos.eliminar && api.puede(permisos.eliminar))
  const conFormulario = (puedeCrear || puedeEditar) && campos.length > 0
  const conAcciones = puedeEditar || puedeEliminar

  const barra = nodo('div', { clase: 'seccion-cabecera' })
  const zonaForm = nodo('div', { clase: 'panel-formulario', hidden: true })
  const estado = nodo('p', { role: 'status', 'aria-live': 'polite' })
  const zonaTabla = nodo('div', { clase: 'tabla-scroll' })
  const zonaPaginacion = nodo('p', { clase: 'fila' })
  raiz.replaceChildren(barra, zonaForm, estado, zonaTabla, zonaPaginacion)

  let filas = []
  let pagina = 1
  let idEditando = null
  let formulario = null
  let encabezadoForm = null
  let botonCancelar = null
  let botonNuevo = null
  let mensajeForm = null

  function mostrar(texto, esError = false) {
    estado.className = esError ? 'error' : ''
    estado.textContent = texto
  }

  function pintarTabla() {
    const cabecera = nodo('thead', {}, nodo(
      'tr',
      {},
      [...columnas.map((c) => nodo('th', { scope: 'col', texto: c.etiqueta })),
        conAcciones ? nodo('th', { scope: 'col', texto: 'Acciones' }) : null],
    ))
    const cuerpo = nodo('tbody', {}, filas.map((fila) => {
      const id = idDe(fila)
      return nodo('tr', {}, [
        ...columnas.map((c) => nodo('td', { texto: String(c.valor(fila) ?? '') })),
        conAcciones
          ? nodo('td', {}, [
              puedeEditar ? nodo('button', { type: 'button', texto: 'Editar', 'data-editar': id }) : null,
              puedeEliminar ? nodo('button', { type: 'button', texto: 'Eliminar', 'data-eliminar': id }) : null,
            ])
          : null,
      ])
    }))
    zonaTabla.replaceChildren(nodo('table', {}, [nodo('caption', { texto: titulo }), cabecera, cuerpo]))
  }

  function pintarPaginacion(meta) {
    if (!meta || meta.last_page <= 1) {
      zonaPaginacion.replaceChildren()
      return
    }
    zonaPaginacion.replaceChildren(
      nodo('button', {
        type: 'button',
        texto: '← Anterior',
        disabled: meta.current_page <= 1,
        'data-pagina': meta.current_page - 1,
      }),
      nodo('span', { role: 'status', texto: `Página ${meta.current_page} de ${meta.last_page}` }),
      nodo('button', {
        type: 'button',
        texto: 'Siguiente →',
        disabled: meta.current_page >= meta.last_page,
        'data-pagina': meta.current_page + 1,
      }),
    )
  }

  async function cargar() {
    mostrar('Cargando…')
    zonaTabla.replaceChildren()
    const respuesta = await llamada(
      () => api.listarRecurso(ruta, { page: pagina, per_page: 20 }),
      (error) => mostrar(error.message, true),
    )
    if (!respuesta) return

    filas = respuesta.data
    if (!filas.length) {
      mostrar(`No hay ${etiqueta} por mostrar todavía.`)
      zonaPaginacion.replaceChildren()
      return
    }
    mostrar(`${respuesta.meta?.total ?? filas.length} ${etiqueta} en total.`)
    pintarTabla()
    pintarPaginacion(respuesta.meta)
  }

  function limpiarEdicion() {
    idEditando = null
    if (botonNuevo) alternarFormulario(botonNuevo, zonaForm, false)
    if (!formulario) return
    formulario.limpiar()
    campos.filter((c) => c.soloAlCrear).forEach((c) => formulario.desactivar(c.nombre, false))
    encabezadoForm.textContent = 'Nuevo registro'
    botonCancelar.hidden = true
    mensajeForm.textContent = ''
  }

  function editar(id) {
    const fila = filas.find((f) => String(idDe(f)) === String(id))
    if (!fila || !formulario) return
    idEditando = id
    alternarFormulario(botonNuevo, zonaForm, true)
    formulario.cargar(valoresDe(fila))
    campos.filter((c) => c.soloAlCrear).forEach((c) => formulario.desactivar(c.nombre, true))
    formulario.marcarErrores({})
    encabezadoForm.textContent = 'Editar registro'
    botonCancelar.hidden = false
    mensajeForm.textContent = ''
    formulario.form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function eliminar(id) {
    if (!window.confirm(`¿Eliminar este registro (${id})? Esta acción no se puede deshacer.`)) return
    let fallo = false
    await llamada(
      () => api.eliminarRecurso(ruta, id),
      (error) => {
        fallo = true
        mostrar(error.message, true)
      },
    )
    if (fallo) return
    if (idEditando !== null && String(idEditando) === String(id)) limpiarEdicion()
    await cargar()
    mostrar('Registro eliminado.')
  }

  zonaTabla.addEventListener('click', (evento) => {
    const editarBoton = evento.target.closest('[data-editar]')
    const eliminarBoton = evento.target.closest('[data-eliminar]')
    if (editarBoton) editar(editarBoton.dataset.editar)
    if (eliminarBoton) eliminar(eliminarBoton.dataset.eliminar)
  })

  zonaPaginacion.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-pagina]')
    if (!boton) return
    pagina = Number(boton.dataset.pagina)
    cargar()
  })

  if (conFormulario) {
    formulario = construirFormulario(campos)
    encabezadoForm = nodo('h3', { texto: 'Nuevo registro' })
    mensajeForm = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
    botonCancelar = nodo('button', { type: 'button', texto: 'Cancelar edición', hidden: true })

    formulario.form.append(
      nodo('p', { clase: 'acciones' }, [
        nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Guardar' }),
        botonCancelar,
      ]),
      mensajeForm,
    )
    zonaForm.append(encabezadoForm, formulario.form)

    botonNuevo = nodo('button', { type: 'button', clase: 'btn-primario', texto: nuevoTexto, 'aria-expanded': 'false' })
    botonNuevo.addEventListener('click', () => alternarFormulario(botonNuevo, zonaForm))
    barra.append(botonNuevo)

    botonCancelar.addEventListener('click', limpiarEdicion)

    formulario.form.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      const { valores, errores } = formulario.leer()
      const generales = formulario.marcarErrores(errores)
      if (Object.keys(errores).length) return

      mensajeForm.className = 'ayuda'
      mensajeForm.textContent = 'Guardando…'
      const respuesta = await llamada(
        () => (idEditando === null
          ? api.crearRecurso(ruta, valores)
          : api.actualizarRecurso(ruta, idEditando, valores)),
        (error) => {
          if (error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length) {
            const sobrantes = formulario.marcarErrores(error.errors)
            mensajeForm.className = 'error'
            mensajeForm.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
          } else {
            mensajeForm.className = 'error'
            mensajeForm.textContent = error.message
          }
        },
      )
      if (!respuesta) return

      const texto = idEditando === null ? 'Registro creado.' : 'Registro actualizado.'
      limpiarEdicion()
      await cargar()
      mostrar(generales.length ? `${texto} ${generales.join(' ')}` : texto)
    })
  }

  cargar()
  return { recargar: cargar }
}
