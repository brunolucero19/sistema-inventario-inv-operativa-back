import express from 'express'
import { crearOrdenCompra } from '../controllers/ordenCompra.js'
const router = express.Router()

router.post('/crear-orden-compra', crearOrdenCompra)

//router.get('/obtener-ordenes-compra', obtenerOrdenesCompra)
// router.get('/obtener-orden-compra/:id', obtenerOrdenCompra)
// router.put('/actualizar-orden-compra/:id', actualizarOrdenCompra)
// router.delete('/eliminar-orden-compra/:id', eliminarOrdenCompra)

export default router