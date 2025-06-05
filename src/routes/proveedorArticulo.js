import express from 'express'
import {
  actualizarProveedorArticulo,
  crearProveedorArticulo,
  eliminarProveedorArticulo,
  obtenerArticulosPorProveedor,
  obtenerProveedoresPorArticulo,
} from '../controllers/proveedorArticulo.js'
const router = express.Router()

router.post('/crear-proveedor-articulo', crearProveedorArticulo)

router.get('/obtener-proveedor-articulos/:id', obtenerProveedoresPorArticulo)

router.get('/obtener-articulos-proveedor', obtenerArticulosPorProveedor)

router.patch('/actualizar-proveedor-articulo', actualizarProveedorArticulo)

router.delete('/eliminar-proveedor-articulo', eliminarProveedorArticulo)

export default router
