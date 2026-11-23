import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        catalogo: resolve(import.meta.dirname, 'index.html'),
        ventas: resolve(import.meta.dirname, 'ventas.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        recepcion: resolve(import.meta.dirname, 'recepcion.html'),
        compras: resolve(import.meta.dirname, 'compras.html'),
        proveedores: resolve(import.meta.dirname, 'proveedores.html'),
        catalogos: resolve(import.meta.dirname, 'catalogos.html'),
        clientes: resolve(import.meta.dirname, 'clientes.html'),
        movimientos: resolve(import.meta.dirname, 'movimientos.html'),
      },
    },
  },
})
