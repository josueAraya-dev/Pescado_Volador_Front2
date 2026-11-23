import { ClienteApi, ErrorApi } from './api.js'
import { tomarRetorno } from './state.js'

// Solo se usa en login.html. Catálogo y ventas tienen sus propios módulos.
const api = new ClienteApi()

function esAborto(error) {
  return error?.name === 'AbortError'
}

function iniciarLogin() {
  const form = document.querySelector('#login-form')
  const zonaError = document.querySelector('#login-error')

  const mostrarError = (texto, color = 'var(--c-error)') => {
    zonaError.textContent = texto
    zonaError.className = texto ? 'error' : 'ayuda'
    zonaError.style.color = color
  }

  const motivo = new URLSearchParams(location.search).get('motivo')
  if (motivo === 'expirada') {
    mostrarError(
      'Su sesión expiró (el token vence a las 2 horas). Inicie sesión de nuevo: los datos del formulario se conservaron.',
      'var(--c-tinta-suave)',
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

if (document.body.dataset.vista === 'login') iniciarLogin()
