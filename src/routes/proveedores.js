import express from "express";
import {
  crearProveedor,
  eliminarProveedor,
  modificarProveedor,
  obtenerProveedores,
} from "../controllers/proveedores.js";

const router = express.Router();

router.post("/crear-proveedor", crearProveedor);
router.get("/obtener-proveedores", obtenerProveedores);
router.patch("/eliminar-proveedor", eliminarProveedor);
router.patch("/modificar-proveedor/:id", modificarProveedor);

export default router;
