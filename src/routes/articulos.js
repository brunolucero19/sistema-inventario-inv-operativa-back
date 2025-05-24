import express from 'express'
import { crearArticulo } from '../controllers/articulos.js'

const router = express.Router()

router.post('/crear-articulo', crearArticulo)

export default router