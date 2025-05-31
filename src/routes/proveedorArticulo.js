import express from 'express';
import { crearProveedorArticulo, obtenerProveedoresPorArticulo, obtenrArticulosPorProveedor } from '../controllers/proveedorArticulo.js';
const router = express.Router();

router.post('/crear-proveedor-articulo', crearProveedorArticulo);

router.get('/obtener-proveedor-articulos/:id', obtenerProveedoresPorArticulo);

router.get('/obtener-articulos-proveedor/:id', obtenrArticulosPorProveedor);


export default router;