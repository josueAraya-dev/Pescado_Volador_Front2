// Reglas espejo de UpdateProductRequest y ProductService::validateStockCoherence (backend).
export const CAMPOS_PRODUCTO = [
  'name',
  'description',
  'price',
  'tax_rate',
  'stock_quantity',
  'minimum_stock',
  'maximum_stock',
  'weight',
]

// Campos del alta de producto (generados con formularios.js). Las opciones de categoría, marca y unidad se cargan al abrir.
export const CAMPOS_NUEVO_PRODUCTO = [
  { nombre: 'name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 150 },
  { nombre: 'sku', etiqueta: 'SKU', tipo: 'text', requerido: true, max: 50 },
  { nombre: 'barcode', etiqueta: 'Código de barras', tipo: 'text', max: 50 },
  { nombre: 'description', etiqueta: 'Descripción', tipo: 'textarea', max: 1000 },
  { nombre: 'category_id', etiqueta: 'Categoría', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'brand_id', etiqueta: 'Marca', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'unit_id', etiqueta: 'Unidad de medida', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'price', etiqueta: 'Precio (₡)', tipo: 'number', requerido: true, min: 0, max_valor: 99999999.99 },
  { nombre: 'tax_rate', etiqueta: 'Impuesto (%)', tipo: 'number', min: 0, max_valor: 100 },
  { nombre: 'stock_quantity', etiqueta: 'Stock actual', tipo: 'number', requerido: true, entero: true, min: 0, max_valor: 1000000 },
  { nombre: 'minimum_stock', etiqueta: 'Stock mínimo', tipo: 'number', entero: true, min: 0, max_valor: 1000000 },
  { nombre: 'maximum_stock', etiqueta: 'Stock máximo', tipo: 'number', entero: true, min: 0, max_valor: 1000000 },
  { nombre: 'weight', etiqueta: 'Peso', tipo: 'number', min: 0, max_valor: 100000 },
  { nombre: 'image_url', etiqueta: 'Imagen (URL)', tipo: 'text', max: 255 },
  { nombre: 'is_active', etiqueta: 'Producto activo', tipo: 'checkbox' },
]

const valor = (form, campo) => form.elements.namedItem(campo).value.trim()

// Campo obligatorio: vacío se convierte en NaN para que la validación lo marque.
const numeroObligatorio = (texto) => (texto === '' ? Number.NaN : Number(texto))
// Campo opcional: vacío se envía como null.
const numeroOpcional = (texto) => (texto === '' ? null : Number(texto))

export function cuerpoProducto(form) {
  return {
    name: valor(form, 'name'),
    description: valor(form, 'description') || null,
    price: numeroObligatorio(valor(form, 'price')),
    tax_rate: numeroOpcional(valor(form, 'tax_rate')),
    stock_quantity: numeroObligatorio(valor(form, 'stock_quantity')),
    minimum_stock: numeroOpcional(valor(form, 'minimum_stock')),
    maximum_stock: numeroOpcional(valor(form, 'maximum_stock')),
    weight: numeroOpcional(valor(form, 'weight')),
    is_active: form.elements.namedItem('is_active').checked,
  }
}

const enRango = (numero, min, max) =>
  typeof numero === 'number' && Number.isFinite(numero) && numero >= min && numero <= max

const enteroEnRango = (numero, min, max) => Number.isInteger(numero) && numero >= min && numero <= max

export function validarProducto(cuerpo) {
  const errores = {}

  if (!cuerpo.name) errores.name = ['El nombre es obligatorio.']
  else if (cuerpo.name.length > 150) errores.name = ['El nombre no puede superar 150 caracteres.']

  if (cuerpo.description && cuerpo.description.length > 1000) {
    errores.description = ['La descripción no puede superar 1000 caracteres.']
  }

  if (!enRango(cuerpo.price, 0, 99999999.99)) {
    errores.price = ['Ingrese un precio entre 0 y 99 999 999,99.']
  }

  if (cuerpo.tax_rate !== null && !enRango(cuerpo.tax_rate, 0, 100)) {
    errores.tax_rate = ['El impuesto debe estar entre 0 y 100.']
  }

  if (!enteroEnRango(cuerpo.stock_quantity, 0, 1000000)) {
    errores.stock_quantity = ['Ingrese una cantidad entera entre 0 y 1 000 000.']
  }

  if (cuerpo.minimum_stock !== null && !enteroEnRango(cuerpo.minimum_stock, 0, 1000000)) {
    errores.minimum_stock = ['El stock mínimo debe ser un entero entre 0 y 1 000 000.']
  }

  if (cuerpo.maximum_stock !== null && !enteroEnRango(cuerpo.maximum_stock, 0, 1000000)) {
    errores.maximum_stock = ['El stock máximo debe ser un entero entre 0 y 1 000 000.']
  }

  if (cuerpo.weight !== null && !enRango(cuerpo.weight, 0, 100000)) {
    errores.weight = ['El peso debe estar entre 0 y 100 000.']
  }

  const { minimum_stock: min, maximum_stock: max, stock_quantity: stock } = cuerpo

  if (min !== null && max !== null && min > max && !errores.maximum_stock) {
    errores.maximum_stock = ['El stock máximo no puede ser menor que el stock mínimo.']
  }
  if (!errores.stock_quantity && min !== null && stock < min) {
    errores.stock_quantity = ['La cantidad en stock no puede ser menor que el stock mínimo.']
  }
  if (!errores.stock_quantity && max !== null && stock > max) {
    errores.stock_quantity = ['La cantidad en stock no puede superar el stock máximo.']
  }

  return errores
}
