import express from 'express'
import {
  crearProveedor,
  eliminarProveedor,
  obtenerProveedores,
} from '../controllers/proveedores.js'

const router = express.Router()

router.post('/crear-proveedor', crearProveedor)
router.get('/obtener-proveedores', obtenerProveedores)
router.patch('/eliminar-proveedor', eliminarProveedor)

export default router
