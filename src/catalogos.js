import { aplicarPermisos, configurarSalir, exigirPagina, exigirSesion } from './comun.js'
import { montarCrud } from './crud.js'

function iniciar() {
  if (!exigirPagina('view categories')) return
  aplicarPermisos()
  configurarSalir()

  montarCrud({
    raiz: document.querySelector('#crud-categorias'),
    titulo: 'Categorías',
    etiqueta: 'categorías',
    nuevoTexto: 'Agregar categoría',
    ruta: '/categories',
    permisos: {
      ver: 'view categories',
      crear: 'create categories',
      actualizar: 'update categories',
      eliminar: 'delete categories',
    },
    campos: [
      { nombre: 'category_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 },
      { nombre: 'description', etiqueta: 'Descripción', tipo: 'textarea', requerido: true, max: 200 },
    ],
    columnas: [
      { etiqueta: 'Nombre', valor: (f) => f.Nombre },
      { etiqueta: 'Descripción', valor: (f) => f.Descripcion },
    ],
    idDe: (f) => f['ID Categoria'],
    valoresDe: (f) => ({ category_name: f.Nombre, description: f.Descripcion }),
  })

  montarCrud({
    raiz: document.querySelector('#crud-marcas'),
    titulo: 'Marcas',
    etiqueta: 'marcas',
    nuevoTexto: 'Agregar marca',
    ruta: '/brands',
    permisos: {
      ver: 'view brands',
      crear: 'create brands',
      actualizar: 'update brands',
      eliminar: 'delete brands',
    },
    campos: [{ nombre: 'brand_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 }],
    columnas: [{ etiqueta: 'Nombre', valor: (f) => f.Nombre }],
    idDe: (f) => f['ID Marca'],
    valoresDe: (f) => ({ brand_name: f.Nombre }),
  })

  montarCrud({
    raiz: document.querySelector('#crud-unidades'),
    titulo: 'Unidades de medida',
    etiqueta: 'unidades',
    nuevoTexto: 'Agregar unidad',
    ruta: '/units',
    permisos: {
      ver: 'view units',
      crear: 'create units',
      actualizar: 'update units',
      eliminar: 'delete units',
    },
    campos: [{ nombre: 'unit_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 }],
    columnas: [{ etiqueta: 'Nombre', valor: (f) => f.Nombre }],
    idDe: (f) => f['ID Unidad de Medida'],
    valoresDe: (f) => ({ unit_name: f.Nombre }),
  })
}

if (exigirSesion()) iniciar()
