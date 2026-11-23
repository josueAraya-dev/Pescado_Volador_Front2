import { aplicarPermisos, configurarSalir, exigirPagina, exigirSesion } from './comun.js'
import { montarCrud } from './crud.js'

function iniciar() {
  if (!exigirPagina('view customers')) return
  aplicarPermisos()
  configurarSalir()

  montarCrud({
    raiz: document.querySelector('#crud-clientes'),
    titulo: 'Clientes',
    etiqueta: 'clientes',
    nuevoTexto: 'Agregar cliente',
    ruta: '/customers',
    permisos: {
      ver: 'view customers',
      crear: 'create customers',
      actualizar: 'update customers',
      eliminar: 'delete customers',
    },
    campos: [
      { nombre: 'id_customer', etiqueta: 'Identificación', tipo: 'text', requerido: true, max: 50, soloAlCrear: true },
      { nombre: 'first_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'second_name', etiqueta: 'Segundo nombre', tipo: 'text', max: 50 },
      { nombre: 'last_name1', etiqueta: 'Primer apellido', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'last_name2', etiqueta: 'Segundo apellido', tipo: 'text', max: 50 },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'email', requerido: true, max: 100 },
      { nombre: 'telephone_number', etiqueta: 'Teléfono', tipo: 'text', max: 20 },
    ],
    columnas: [
      { etiqueta: 'Identificación', valor: (f) => f.id_customer },
      { etiqueta: 'Nombre', valor: (f) => [f.first_name, f.second_name, f.last_name1, f.last_name2].filter(Boolean).join(' ') },
      { etiqueta: 'Correo', valor: (f) => f.email },
      { etiqueta: 'Teléfono', valor: (f) => f.telephone_number },
    ],
    idDe: (f) => f.id_customer,
    valoresDe: (f) => ({
      id_customer: f.id_customer,
      first_name: f.first_name,
      second_name: f.second_name,
      last_name1: f.last_name1,
      last_name2: f.last_name2,
      email: f.email,
      telephone_number: f.telephone_number,
    }),
  })
}

if (exigirSesion()) iniciar()
