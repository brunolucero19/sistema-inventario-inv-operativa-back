import express from 'express'
import { crearOrdenCompra, actualizarOrdenCompra, obtenerOrdenCompra, obtenerOrdenesCompra } from '../controllers/ordenCompra.js'
const router = express.Router()

router.post('/crear-orden-compra', crearOrdenCompra)


router.get('/obtener-orden-compra/:id', obtenerOrdenCompra);

router.get('/obtener-ordenes-compra', obtenerOrdenesCompra);

router.patch('/actualizar-orden-compra/:id', actualizarOrdenCompra);

export default router