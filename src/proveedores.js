import { aplicarPermisos, configurarSalir, exigirPagina, exigirSesion } from './comun.js'
import { montarCrud } from './crud.js'

function iniciar() {
  if (!exigirPagina('view suppliers')) return
  aplicarPermisos()
  configurarSalir()

  // Los permisos de alta, cambio y baja vienen del backend; si el rol no los tiene, la tabla queda en solo lectura.
  montarCrud({
    raiz: document.querySelector('#crud-proveedores'),
    titulo: 'Proveedores',
    etiqueta: 'proveedores',
    nuevoTexto: 'Agregar proveedor',
    ruta: '/suppliers',
    permisos: {
      ver: 'view suppliers',
      crear: 'create suppliers',
      actualizar: 'update suppliers',
      eliminar: 'delete suppliers',
    },
    campos: [
      { nombre: 'id_supplier', etiqueta: 'Identificación', tipo: 'text', requerido: true, max: 50, soloAlCrear: true },
      { nombre: 'supplier_first_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'supplier_last_name', etiqueta: 'Apellidos', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'supplier_phone', etiqueta: 'Teléfono', tipo: 'text', requerido: true, max: 20 },
      { nombre: 'supplier_address', etiqueta: 'Dirección', tipo: 'text', requerido: true, max: 100 },
      { nombre: 'supplier_type', etiqueta: 'Tipo', tipo: 'text', max: 50 },
      { nombre: 'supplier_email', etiqueta: 'Correo', tipo: 'email', requerido: true, max: 100 },
    ],
    columnas: [
      { etiqueta: 'Identificación', valor: (f) => f.id },
      { etiqueta: 'Nombre', valor: (f) => `${f.supplier_first_name} ${f.supplier_last_name}` },
      { etiqueta: 'Tipo', valor: (f) => f.supplier_type },
      { etiqueta: 'Teléfono', valor: (f) => f.supplier_phone },
      { etiqueta: 'Correo', valor: (f) => f.supplier_email },
      { etiqueta: 'Dirección', valor: (f) => f.supplier_address },
    ],
    idDe: (f) => f.id,
    valoresDe: (f) => ({
      id_supplier: f.id,
      supplier_first_name: f.supplier_first_name,
      supplier_last_name: f.supplier_last_name,
      supplier_phone: f.supplier_phone,
      supplier_address: f.supplier_address,
      supplier_type: f.supplier_type,
      supplier_email: f.supplier_email,
    }),
  })
}

if (exigirSesion()) iniciar()
