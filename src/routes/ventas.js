import express from 'express'
import { crearVenta, obtenerVentas } from '../controllers/ventas.js'

const router = express.Router()

router.post('/crear-venta', crearVenta)
router.get("/obtener-ventas", obtenerVentas)

export default router