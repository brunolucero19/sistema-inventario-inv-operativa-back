import express from 'express'
import { crearArticulo, obtenerArticulos, obtenerArticulo, modificarArticulo } from '../controllers/articulos.js'

const router = express.Router()

router.post('/crear-articulo', crearArticulo)

router.get('/leer-articulos', obtenerArticulos)

router.get('/leer-articulo/:id', obtenerArticulo)

router.patch("/modificar-articulo/:id", modificarArticulo)

// router.put('/actualizar-articulo/:id', actualizarArticulo)

// router.delete('/eliminar-articulo/:id', eliminarArticulo)

export default router