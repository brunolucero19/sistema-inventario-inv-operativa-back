import express from 'express'
import { crearArticulo, obtenerArticulos, obtenerArticulo } from '../controllers/articulos.js'

const router = express.Router()

router.post('/crear-articulo', crearArticulo)

router.get('/leer-articulos', obtenerArticulos)

router.get('/leer-articulo/:id', obtenerArticulo)

export default router