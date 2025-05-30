import express from 'express';
import { crearProveedorArticulo, obtenerProveedoresPorArticulo } from '../controllers/proveedorArticulo.js';
const router = express.Router();

router.post('/crear-proveedor-articulo', crearProveedorArticulo);

router.get('/obtener-proveedor-articulos/:id', obtenerProveedoresPorArticulo);


export default router;