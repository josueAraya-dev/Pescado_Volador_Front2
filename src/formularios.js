import { nodo } from './views.js'

// Genera un formulario a partir de una lista de campos. Cada campo:
// { nombre, etiqueta, tipo: 'text'|'email'|'number'|'textarea'|'select'|'checkbox',
//   requerido, max (caracteres), min, max_valor, entero, numerico, opciones, soloAlCrear }
let contador = 0

function reglaCampo(campo, valor) {
  const vacio = valor === null || valor === '' || (typeof valor === 'number' && Number.isNaN(valor))
  if (campo.tipo === 'checkbox') return null
  if (vacio) return campo.requerido ? 'Este campo es obligatorio.' : null

  if (campo.tipo === 'number') {
    if (!Number.isFinite(valor)) return 'Ingrese un número válido.'
    if (campo.entero && !Number.isInteger(valor)) return 'Ingrese un número entero.'
    if (campo.min !== undefined && valor < campo.min) return `El valor mínimo es ${campo.min}.`
    if (campo.max_valor !== undefined && valor > campo.max_valor) return `El valor máximo es ${campo.max_valor}.`
    return null
  }

  if (campo.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor))) {
    return 'Ingrese un correo válido.'
  }
  if (campo.max && String(valor).length > campo.max) {
    return `No puede superar ${campo.max} caracteres.`
  }
  return null
}

function crearControl(campo, id) {
  const atributos = { id, name: campo.nombre }
  if (campo.tipo === 'textarea') {
    return nodo('textarea', { ...atributos, maxlength: campo.max })
  }
  if (campo.tipo === 'select') {
    return nodo('select', atributos, [
      nodo('option', { value: '', texto: 'Seleccione…' }),
      ...(campo.opciones ?? []).map((o) => nodo('option', { value: o.valor, texto: o.texto })),
    ])
  }
  if (campo.tipo === 'checkbox') {
    return nodo('input', { ...atributos, type: 'checkbox' })
  }
  return nodo('input', {
    ...atributos,
    type: campo.tipo === 'number' ? 'number' : campo.tipo === 'email' ? 'email' : 'text',
    maxlength: campo.tipo === 'number' ? undefined : campo.max,
    min: campo.min,
    max: campo.max_valor,
    step: campo.tipo === 'number' ? (campo.entero ? '1' : 'any') : undefined,
    autocomplete: 'off',
  })
}

export function construirFormulario(campos) {
  const prefijo = `f${++contador}`
  const form = nodo('form', { novalidate: true })
  const fieldset = nodo('fieldset')
  form.append(fieldset)

  campos.forEach((campo) => {
    const id = `${prefijo}-${campo.nombre}`
    const zonaError = nodo('p', {
      clase: 'ayuda',
      'data-error': campo.nombre,
      id: `err-${id}`,
      'aria-live': 'polite',
    })
    const control = crearControl(campo, id)
    control.setAttribute('aria-describedby', `err-${id}`)
    if (campo.requerido) control.setAttribute('required', '')

    if (campo.tipo === 'checkbox') {
      fieldset.append(nodo('label', {}, [control, ` ${campo.etiqueta}`]), zonaError)
    } else {
      fieldset.append(nodo('label', { for: id, texto: campo.etiqueta }), control, zonaError)
    }
  })

  const control = (nombre) => form.elements.namedItem(nombre)

  function leer() {
    const valores = {}
    const errores = {}
    campos.forEach((campo) => {
      const ctl = control(campo.nombre)
      let valor
      if (campo.tipo === 'checkbox') {
        valor = ctl.checked
      } else {
        const crudo = String(ctl.value ?? '').trim()
        if (campo.tipo === 'number') {
          valor = crudo === '' ? (campo.requerido ? Number.NaN : null) : Number(crudo)
        } else if (campo.tipo === 'select' && campo.numerico) {
          valor = crudo === '' ? null : Number(crudo)
        } else {
          valor = crudo === '' ? (campo.requerido ? '' : null) : crudo
        }
      }
      valores[campo.nombre] = valor
      const mensaje = reglaCampo(campo, valor)
      if (mensaje) errores[campo.nombre] = [mensaje]
    })
    return { valores, errores }
  }

  // Marca los errores en sus campos y devuelve los que no corresponden a ningún campo.
  function marcarErrores(errores = {}) {
    campos.forEach((campo) => {
      const ctl = control(campo.nombre)
      const zona = form.querySelector(`[data-error="${campo.nombre}"]`)
      const mensaje = [].concat(errores[campo.nombre] ?? [])[0] ?? ''
      if (ctl) ctl.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      if (zona) {
        zona.textContent = mensaje
        zona.className = mensaje ? 'error' : 'ayuda'
      }
    })
    const nombres = campos.map((c) => c.nombre)
    return Object.entries(errores)
      .filter(([nombre]) => !nombres.includes(nombre))
      .flatMap(([, mensajes]) => [].concat(mensajes))
  }

  function cargar(valores = {}) {
    campos.forEach((campo) => {
      const ctl = control(campo.nombre)
      const valor = valores[campo.nombre]
      if (campo.tipo === 'checkbox') ctl.checked = Boolean(valor)
      else ctl.value = valor ?? ''
    })
  }

  function desactivar(nombre, bloqueado) {
    const ctl = control(nombre)
    if (ctl) ctl.disabled = bloqueado
  }

  function limpiar() {
    form.reset()
    marcarErrores({})
  }

  function setOpciones(nombre, opciones) {
    const ctl = control(nombre)
    if (!ctl) return
    const actual = ctl.value
    ctl.replaceChildren(
      nodo('option', { value: '', texto: 'Seleccione…' }),
      ...opciones.map((o) => nodo('option', { value: o.valor, texto: o.texto })),
    )
    ctl.value = actual
  }

  return { form, leer, cargar, marcarErrores, desactivar, limpiar, setOpciones }
}
