# Ferretería Front

Frontend web de la Ferretería Pescado Volador (Desarrollo de Software 4). Está hecho con JavaScript y Vite, sin framework, y consume la API REST de Laravel (`FerreteriaPescadoVolador`).

## Requisitos

- Node.js 20 o superior y npm.
- Un backend en ejecución (local o desplegado).

## Instalación y ejecución

```bash
npm install          # solo la primera vez
npm run dev          # servidor de desarrollo: http://localhost:5173
npm run build        # build de producción en dist/ (todas las páginas)
npm run preview      # sirve el build en http://localhost:4173
```

### Conexión con la API

La URL base de la API se configura con la variable `VITE_API_URL` en el archivo `.env` del front. Por defecto usa `http://127.0.0.1:8000/api`.

```
VITE_API_URL=https://ferreteriapescadovolador.onrender.com/api
```

Después de cambiar `.env` hay que reiniciar `npm run dev`, porque Vite lee las variables solo al arrancar.

El backend debe aceptar el origen del front en `CORS_ALLOWED_ORIGINS` (por ejemplo, `http://localhost:5173`).

### Backend local (opcional)

```bash
cd ../FerreteriaPescadoVolador
php artisan serve --host=127.0.0.1 --port=8000
```

### Usuarios de prueba

Contraseña `password` para todos.

| Correo | Rol |
|---|---|
| `admin@example.com` | admin |
| `cajero@example.com` | cajero |
| `bodeguero@example.com` | bodeguero |

## Estructura

El código JavaScript está en `src/`, organizado por responsabilidad:

```
src/
├── nucleo/        Lo básico que usan todas las páginas
│   ├── api.js          Cliente de la API (token, permisos y peticiones)
│   ├── comun.js        Sesión, control de acceso por página y por sección, llamadas a la API
│   └── tema.js         Botón de modo oscuro
├── componentes/   Piezas reutilizables de la interfaz
│   ├── vista.js        Tarjetas, tablas, detalle de producto y listas con carga, vacío y error
│   ├── formularios.js  Formularios generados a partir de una lista de campos, con validación
│   ├── crud.js         Tabla con alta, edición y baja según los permisos del rol
│   └── dialogos.js     Botones que despliegan formularios y diálogos que se cierran al hacer clic fuera
├── reglas/
│   └── producto.js     Campos y validaciones de producto (espejo de las reglas del backend)
└── paginas/       Una carpeta de código por pantalla
    ├── login.js                    Inicio de sesión
    ├── productos.js                Listado, búsqueda, código de barras y resumen
    ├── productos-detalle.js        Ver, editar y eliminar un producto
    ├── productos-alta.js           Crear un producto
    ├── ventas.js                   Crear y editar ventas
    ├── ventas-lineas.js            Productos de una venta: agregar, cantidades y totales
    ├── ventas-historial.js         Historial de ventas
    ├── recepcion.js, compras.js, proveedores.js, catalogos.js, clientes.js, movimientos.js
```

| Otros archivos | Responsabilidad |
|---|---|
| `styles.css` | Identidad visual: tokens en `:root` y componentes. |
| `docs/identidad-visual.md` | Guía de la paleta, tipografía y componentes. |

## Pantallas

| Página | Permiso para verla | Qué permite |
|---|---|---|
| `index.html` (Productos) | `view products` | Buscar por nombre, SKU o código de barras; ver el detalle en una ventana emergente con su código de barras; resumen de inventario. Con permisos: crear, editar y eliminar producto. |
| `ventas.html` (Ventas) | `view sales` | Crear una venta con una o varias líneas de producto (cantidad editable y total automático), editar sus datos e historial paginado. Con permisos: eliminar venta. |
| `recepcion.html` (Recepción) | `receive purchases` | Buscar detalles pendientes por código de barras y recibirlos con la cantidad exacta. |
| `compras.html` (Compras) | `view purchases` | Listado de compras de solo lectura. Los detalles se abren en una ventana emergente. |
| `proveedores.html` (Proveedores) | `view suppliers` | Lista de proveedores. Con permisos: crear, editar y eliminar. |
| `clientes.html` (Clientes) | `view customers` | Lista de clientes. Con permisos: crear, editar y eliminar. |
| `movimientos.html` (Movimientos) | `view inventory-movements` | Kardex de solo lectura. |
| `catalogos.html` (Catálogos) | `view categories` | Categorías, marcas y unidades de medida. Con permisos: crear, editar y eliminar. |
| `login.html` | — | Inicio de sesión. Un 401 regresa aquí sin perder los datos del formulario. |

Si un rol entra a una página que no le corresponde, el front lo lleva a la primera página a la que sí tiene acceso. Las secciones y botones sin permiso no aparecen.

## Matriz de permisos por rol (frontend)

Los permisos vienen del backend (`RolePermissionSeeder`) y se leen del token al iniciar sesión. Ocultar algo en la interfaz no es seguridad: la API siempre valida.

| Función | admin | cajero | bodeguero |
|---|:---:|:---:|:---:|
| Productos: ver, buscar, detalle, código de barras, resumen | ✅ | ✅ | ✅ |
| Producto: crear | â | â | â |
| Producto: editar | â | â | â |
| Producto: eliminar | â | â | â |
| Ventas: crear con productos | â | â | â |
| Ventas: editar | â | â (solo las propias) | â |
| Ventas: eliminar | â | â | â |
| Recepción de compras | ✅ | — | ✅ |
| Compras: ver | â | â | â |
| Proveedores: ver | â | â | â |
| Proveedores: crear, editar, eliminar | â | â | â (ver nota) |
| Clientes: ver | â | â | â |
| Clientes: crear, editar, eliminar | â | â | â |
| Movimientos de inventario | â | â | â |
| Catálogos: ver | ✅ | — | ✅ (solo lectura) |
| Catálogos: crear, editar, eliminar | ✅ | — | — |

**Nota:** en el backend, bodeguero todavía tiene `create suppliers` en el seeder. Cuando se quite, la columna cambia a "solo ver" sin cambios en el front.

## Relación entre vistas y endpoints

| Vista | Endpoints que consume |
|---|---|
| Login | `POST /login`, `POST /logout` |
| Productos | `GET /products`, `GET /products/by-barcode`, `GET /products/{id}`, `GET /products/{id}/barcode`, `GET /products/inventory-summary`, `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}`, `GET /categories`, `GET /brands`, `GET /units` |
| Ventas | `GET /sales`, `POST /sales`, `PUT /sales/{id}`, `DELETE /sales/{id}`, `POST /sale-items` (una por cada producto), `GET /customers`, `GET /products?q=` |
| Recepción | `GET /purchase-receipts?barcode=`, `POST /purchase-items/{id}/receive` |
| Compras | `GET /purchases`, `GET /purchases/{id}/items` (nombres de producto en el detalle) |
| Proveedores | `GET /suppliers`, `POST /suppliers`, `PUT /suppliers/{id}`, `DELETE /suppliers/{id}` |
| Clientes | `GET /customers`, `POST /customers`, `PUT /customers/{id}`, `DELETE /customers/{id}` |
| Movimientos | `GET /inventory-movements` (la columna Fecha necesita que el backend envíe la fecha del movimiento) |
| Catálogos | `GET/POST/PUT/DELETE /categories`, `/brands`, `/units` |

## Manejo de errores

- **401:** la sesión expiró o no es válida. El front borra la sesión y regresa a `login.html` con el motivo.
- **403:** el rol no tiene permiso. La acción muestra el mensaje de la API.
- **404:** el registro no existe o no pertenece al usuario (por ejemplo, una venta ajena). El mensaje lo indica.
- **422:** errores de validación. Cada error aparece junto a su campo.
- **Sin conexión:** se muestra un mensaje para verificar que la API esté en ejecución.

## Identidad visual

La paleta, la tipografía, los tokens y los componentes están documentados en [`docs/identidad-visual.md`](docs/identidad-visual.md). Para cambiar la marca, basta con editar las variables de `:root` en `styles.css`.

## Pendientes

- Modo oscuro (los tokens ya están preparados).
- Revisar en el navegador cada pantalla con cada rol antes de la entrega.
