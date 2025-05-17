import express from 'express'
import { crearProveedor } from '../controllers/proveedores.js'

const router = express.Router()

router.post('/crear-proveedor', crearProveedor)

export default router
