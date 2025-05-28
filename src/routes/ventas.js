import express from 'express'
import { crearVenta } from '../controllers/ventas.js'

const router = express.Router()

router.post('/crear-venta', crearVenta)

export default router