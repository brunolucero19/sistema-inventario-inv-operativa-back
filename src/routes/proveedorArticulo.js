import express from 'express'
import {
  crearProveedorArticulo,
  obtenerArticulosPorProveedor,
  obtenerProveedoresPorArticulo,
} from '../controllers/proveedorArticulo.js'
const router = express.Router()

router.post('/crear-proveedor-articulo', crearProveedorArticulo)

router.get('/obtener-proveedor-articulos/:id', obtenerProveedoresPorArticulo)

router.get('/obtener-articulos-proveedor', obtenerArticulosPorProveedor)

export default router
