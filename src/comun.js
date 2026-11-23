import { ClienteApi, ErrorApi } from './api.js'

// Utilidades compartidas por las páginas de bodega (recepción, compras, proveedores).
export const api = new ClienteApi()

export function esAborto(error) {
  return error?.name === 'AbortError'
}

export function exigirSesion() {
  if (!api.token || api.sesionExpirada()) {
    const expirada = Boolean(api.token)
    api.limpiarSesion()
    location.replace(expirada ? 'login.html?motivo=expirada' : 'login.html')
    return false
  }
  return true
}

export async function llamada(operacion, alFallar) {
  try {
    return await operacion()
  } catch (error) {
    if (esAborto(error)) return undefined
    if (error instanceof ErrorApi && error.status === 401) {
      api.limpiarSesion()
      location.replace('login.html?motivo=expirada')
      return undefined
    }
    if (alFallar) alFallar(error)
    return undefined
  }
}

// Páginas del sistema y el permiso mínimo para verlas, en el orden del menú.
export const PAGINAS = [
  { href: 'index.html', permiso: 'view products' },
  { href: 'ventas.html', permiso: 'view sales' },
  { href: 'recepcion.html', permiso: 'receive purchases' },
  { href: 'compras.html', permiso: 'view purchases' },
  { href: 'proveedores.html', permiso: 'view suppliers' },
  { href: 'clientes.html', permiso: 'view customers' },
  { href: 'movimientos.html', permiso: 'view inventory-movements' },
  { href: 'catalogos.html', permiso: 'view categories' },
]

// Si el rol no puede ver la página, lo lleva a la primera a la que sí tiene acceso.
export function exigirPagina(permiso) {
  if (api.puede(permiso)) return true
  const destino = PAGINAS.find((pagina) => api.puede(pagina.permiso))
  location.replace(destino ? destino.href : 'login.html')
  return false
}

// Oculta lo que el rol no puede usar. Solo refleja el backend: la seguridad real está en la API.
export function aplicarPermisos() {
  document.querySelectorAll('[data-permiso]').forEach((elemento) => {
    if (!api.puede(elemento.dataset.permiso)) elemento.hidden = true
  })
}

// Botón que despliega u oculta un formulario. Si no se indica `abrir`, alterna el estado actual.
export function alternarFormulario(boton, zona, abrir = zona.hidden) {
  boton.dataset.textoAbrir ??= boton.textContent.trim()
  zona.hidden = !abrir
  boton.setAttribute('aria-expanded', String(abrir))
  boton.textContent = abrir ? 'Cerrar formulario' : boton.dataset.textoAbrir
}

// Modo oscuro: el script del <head> aplica el tema guardado antes de pintar; aquí solo se controla el botón.
const CLAVE_TEMA = 'ferreteria:tema'

function temaActual() {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
    // Sin almacenamiento disponible, el tema dura solo mientras la página esté abierta.
  }
  const boton = document.querySelector('#btn-tema')
  if (boton) {
    const oscuro = tema === 'oscuro'
    boton.setAttribute('aria-pressed', String(oscuro))
    boton.textContent = oscuro ? '☀ Modo claro' : '☾ Modo oscuro'
  }
}

function iniciarTema() {
  aplicarTema(temaActual())
  document.querySelector('#btn-tema')?.addEventListener('click', () => {
    aplicarTema(temaActual() === 'oscuro' ? 'claro' : 'oscuro')
  })
}

iniciarTema()

// Cierra el diálogo al hacer clic fuera de su caja (en el fondo oscuro).
export function cerrarAlClicFuera(dialogo) {
  dialogo.addEventListener('click', (evento) => {
    const caja = dialogo.getBoundingClientRect()
    const fuera =
      evento.clientX < caja.left ||
      evento.clientX > caja.right ||
      evento.clientY < caja.top ||
      evento.clientY > caja.bottom
    if (fuera) dialogo.close()
  })
}

export function configurarSalir() {
  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })
}
