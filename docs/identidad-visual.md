# Identidad visual: Ferretería Pescado Volador

Esta guía describe la paleta, la tipografía y los componentes del frontend web. Todo el estilo sale de `styles.css`, en las variables de `:root`. Ningún componente usa valores sueltos de color, fuente o espaciado.

## 1. Concepto

Un tono de mar profundo (el "pescado volador" del nombre) combinado con un naranja cálido de acento, sobre superficies blancas y grises muy suaves. Transmite orden y confianza, que son los valores de una ferretería, sin perder calidez.

## 2. Paleta

### Color de marca y de texto

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--c-primario` | `#0B5563` | Cabecera, botones principales, títulos de tabla, precios | 8.42:1 sobre blanco |
| `--c-primario-oscuro` | `#083F4A` | Estado al pasar el cursor del primario | — |
| `--c-primario-suave` | `#E2F0F2` | Fila seleccionada, fondos de apoyo | — |
| `--c-acento` | `#F29E4C` | Indicador de página activa en el menú, foco visible | Texto `--c-tinta` sobre acento: 8.14:1 |
| `--c-acento-oscuro` | `#D9822B` | Estado al pasar el cursor del acento | — |
| `--c-tinta` | `#0F1B22` | Texto principal | 17.50:1 sobre blanco |
| `--c-tinta-suave` | `#3E4C57` | Texto de apoyo, etiquetas de detalle | 8.84:1 sobre blanco |
| `--c-borde` | `#7A8794` | Borde de campos y botones | 3.67:1 sobre blanco |
| `--c-borde-suave` | `#D7DEE4` | Separadores, bordes de tarjetas | Decorativo |
| `--c-fondo` | `#F4F7F8` | Fondo de la página | — |
| `--c-superficie` | `#FFFFFF` | Tarjetas, tablas, formularios | — |
| `--c-superficie-alt` | `#EEF3F5` | Encabezados de tabla, insignias neutras | — |

### Colores de estado

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--c-exito` / `--c-exito-suave` | `#17663D` / `#DDF3E6` | Estado completado, stock disponible | 6.00:1 |
| `--c-error` / `--c-error-suave` | `#B42318` / `#FDECEA` | Errores, validaciones, acciones destructivas | 6.57:1 sobre blanco |
| `--c-aviso` / `--c-aviso-suave` | `#8A5A00` / `#FFF3D6` | Estado pendiente, stock bajo | 5.37:1 |

**Regla:** nunca comunicar un estado solo con color. Las insignias siempre llevan texto (por ejemplo, "Completado", "Pendiente") y los errores de campo llevan el mensaje junto al control.

## 3. Tipografía

| Token | Familia | Uso |
|---|---|---|
| `--fuente-titulos` | Manrope (600, 700, 800) | Títulos, precios, leyendas |
| `--fuente-texto` | Inter (400, 500, 600, 700) | Texto corrido, formularios, tablas |

Escala: `h1` 1.875 rem, `h2` 1.375 rem, `h3` 1.125 rem, texto base 1 rem con interlineado 1.55.

## 4. Espaciado, radios y sombras

| Token | Valor |
|---|---|
| `--espacio-1` a `--espacio-6` | 0.25, 0.5, 0.75, 1, 1.5 y 2 rem (escala de 4 px) |
| `--radio-sm` | 0.5 rem (botones, campos, tablas) |
| `--radio` | 0.75 rem (tarjetas, formularios) |
| `--radio-lg` | 1 rem (diálogos) |
| `--sombra-sm` | Tarjetas y cabecera |
| `--sombra-md` | Diálogos |
| `--alto-control` | 2.75 rem (altura mínima de botones y campos; 3 rem en pantallas táctiles) |
| `--ancho-contenido` | 80 rem (ancho máximo del contenido) |

## 5. Componentes

Todos los componentes se construyen con clases de `styles.css`. Si necesitas un color nuevo, agrégalo como token primero.

### Botones

| Clase | Uso |
|---|---|
| (sin clase) | Acción secundaria, cancelar, cerrar |
| `.btn-primario` | Acción principal de un formulario o sección ("Guardar", "Agregar producto") |
| `.btn-acento` | Acción destacada que no es la principal |
| `.btn-peligro` | Acciones destructivas ("Eliminar"). Siempre piden confirmación |

Todos los botones tienen altura mínima de 2.75 rem y foco visible (contorno naranja).

### Formularios

- Cada campo tiene `<label>` visible, nunca solo `placeholder`.
- Los errores van en un párrafo `.ayuda` con `data-error="nombre-del-campo"`; el campo recibe `aria-invalid="true"`.
- Los campos obligatorios usan `required`.
- Los formularios generados con `src/formularios.js` siguen este patrón automáticamente.

### Tablas

- Encabezado con `--c-superficie-alt`, filas con separador suave y resaltado al pasar el cursor.
- En pantallas pequeñas la tabla se envuelve en `.tabla-scroll` para desplazarse horizontalmente sin romper la página.

### Tarjetas

- `.card` con borde suave y sombra pequeña. El precio usa `.price` (color primario).
- `.grid-productos` y `.grid-ventas` acomodan las tarjetas en columnas automáticas (mínimo 15 rem por tarjeta).

### Insignias de estado

| Clase | Color | Ejemplo |
|---|---|---|
| `.badge-ok` | Éxito | Completado, recibida |
| `.badge-bajo` | Aviso | Pendiente, stock bajo |
| `.badge-error` | Error | Cancelada |
| `.badge-neutro` | Neutro | Sin estado |

### Avisos y mensajes

- `.ayuda`: texto de apoyo. `role="status"` para mensajes de resultado.
- `.error`: aviso de error con borde rojo a la izquierda. Usa `role="alert"` cuando interrumpe.

### Diálogo modal

- Elemento `<dialog>` nativo, con `showModal()`. Se cierra con el botón **Cerrar**, con la tecla Escape o con un clic fuera del contenido.
- Se usa en **Compras** para mostrar los detalles de cada compra.

### Secciones desplegables

- `.seccion-cabecera` alinea el título y el botón que despliega el formulario ("Agregar producto").
- El botón cambia su texto a "Cerrar formulario" cuando el formulario está abierto y tiene `aria-expanded`.

## 6. Disposición y responsive

- Diseño de una columna en móvil. A partir de 64 rem (1024 px) las pantallas de dos paneles (`.layout-dos`) pasan a dos columnas.
- Las secciones que deben ocupar todo el ancho usan `.ancho-completo`. Los títulos y avisos ocupan todo el ancho automáticamente.
- El menú se ajusta en varias líneas en pantallas pequeñas.
- No debe haber desplazamiento horizontal de la página: las tablas se desplazan dentro de su contenedor.

## 7. Accesibilidad

- Contraste AA en todo el texto (mínimo 4.5:1) y 3:1 en bordes de controles.
- Foco visible en todos los elementos interactivos (`:focus-visible`, contorno naranja de 3 px).
- Enlace "Saltar al contenido" al inicio de cada página.
- Los campos tienen etiqueta asociada; los errores se anuncian con `aria-live`.
- Respeta el tamaño de toque de 3 rem en pantallas táctiles (`any-pointer: coarse`).

## 8. Cómo usar los tokens

Usa siempre la variable, nunca el valor:

```css
/* Correcto */
.mi-componente {
  background: var(--c-superficie);
  color: var(--c-tinta);
  border: 1px solid var(--c-borde-suave);
  border-radius: var(--radio);
  padding: var(--espacio-4);
}

/* Incorrecto: valores sueltos */
.mi-componente {
  background: #fff;
  color: #0f1b22;
  padding: 16px;
}
```

Para cambiar la marca completa basta con editar los valores de `:root` en `styles.css`. Los componentes se actualizan solos.

## 9. Pendiente

- Modo oscuro: los tokens están pensados para agregarlo, pero no está implementado.
- Iconografía: hoy se usan solo textos. Si se agregan iconos, deben tener texto alternativo o `aria-label`.
