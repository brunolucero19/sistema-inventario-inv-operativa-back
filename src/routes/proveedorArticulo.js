import express from 'express'
import {
  actualizarProveedorArticulo,
  crearProveedorArticulo,
  eliminarProveedorArticulo,
  obtenerArticulosPorProveedor,
  obtenerCGIPorArticulo,
  obtenerProveedorArticuloAreponner,
  obtenerProveedoresPorArticulo,
} from '../controllers/proveedorArticulo.js'
const router = express.Router()

router.post('/crear-proveedor-articulo', crearProveedorArticulo)

router.get('/obtener-proveedor-articulos/:id', obtenerProveedoresPorArticulo)

router.get('/obtener-articulos-proveedor', obtenerArticulosPorProveedor)

router.patch('/actualizar-proveedor-articulo', actualizarProveedorArticulo)

router.delete('/eliminar-proveedor-articulo', eliminarProveedorArticulo)

router.get('/obtener-cgi-articulo/:idArticulo', obtenerCGIPorArticulo)

router.get('/obtener-proveedores-articulos-a-reponer', obtenerProveedorArticuloAreponner)

export default router
