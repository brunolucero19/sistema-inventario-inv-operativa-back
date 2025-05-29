import express from 'express';
import { crearProveedorArticulo } from '../controllers/proveedorArticulo.js';
const router = express.Router();

router.post('/crear-proveedor-articulo', crearProveedorArticulo);

export default router;