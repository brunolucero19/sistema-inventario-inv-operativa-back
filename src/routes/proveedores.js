import express from 'express'
import {
  crearProveedor,
  obtenerProveedores,
} from '../controllers/proveedores.js'

const router = express.Router()

router.post('/crear-proveedor', crearProveedor)
router.get('/obtener-proveedores', obtenerProveedores)

export default router
