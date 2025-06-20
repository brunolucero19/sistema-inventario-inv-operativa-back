import { PrismaClient } from "@prisma/client";
import { validateProveedor } from "../validators/proveedor.schema.js";
import { estadosOC } from "../utils/constants.js";
import {
  calcularCGI,
  calcularCostoCompra,
  calcularLoteOptimoPuntoPedido,
} from "../utils/calculos.js";

const prisma = new PrismaClient();

export const crearProveedor = async (req, res) => {
  const result = validateProveedor(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error.issues });
  }

  const { nombre, apellido, email, telefono, articulos } = result.data;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoProveedor = await prisma.proveedor.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
        },
      });

      // Asociar artículos al proveedor
      if (articulos && articulos.length > 0) {
        for (const articulo of articulos) {
          const art = await prisma.articulo.findUnique({
            where: {
              id_articulo: articulo.id_articulo,
            },
          });

          const {
            id_articulo,
            precio_unitario,
            demora_entrega,
            costo_pedido, // Esto es (Demanda / Cantidad a pedir) * Costo de hacer un Pedido
            modelo_seleccionado,
            es_predeterminado,
            periodo_revision,
          } = articulo;

          const costo_compra = calcularCostoCompra(
            precio_unitario,
            art.demanda_articulo
          );

          const cgi = calcularCGI(
            art.costo_almacenamiento,
            costo_pedido,
            costo_compra
          );

          const nuevoProveedorArticulo = await prisma.proveedorArticulo.create({
            data: {
              id_proveedor: nuevoProveedor.id_proveedor,
              id_articulo,
              precio_unitario,
              demora_entrega,
              costo_pedido,
              costo_compra,
              modelo_seleccionado,
              es_predeterminado,
              cgi,
            },
          });

          const modeloInventarioNuevo = await prisma.modeloInventario.create({
            data: {
              id_proveedor_articulo:
                nuevoProveedorArticulo.id_proveedor_articulo,
            },
          });

          //Calculo de lote optimo si el modelo es de lote fijo
          if (modelo_seleccionado === "lote_fijo") {
            const { Q, R } = await calcularLoteOptimoPuntoPedido(
              nuevoProveedorArticulo
            );

            await prisma.modeloInventario.update({
              where: {
                id_modelo_inventario:
                  modeloInventarioNuevo.id_modelo_inventario,
              },

              data: {
                lote_optimo: Q,
                punto_pedido: R,
                periodo_revision: null, // No se usa en lote fijo
                fecha_ultima_revision: null, // No se usa en lote fijo
              },
            });
          }

          // Para modelo de intervalo fijo
          if (modelo_seleccionado === "intervalo_fijo") {
            await prisma.modeloInventario.update({
              where: {
                id_modelo_inventario:
                  modeloInventarioNuevo.id_modelo_inventario,
              },
              data: {
                periodo_revision: periodo_revision,
                fecha_ultima_revision: new Date(),
                lote_optimo: null,
                punto_pedido: null,
              },
            });
          }
        }
      }
      return nuevoProveedor;
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "El email ya está en uso." });
    }
    console.error(error);
    res.status(500).json({
      error: [{ message: "Error al crear el proveedor" }],
    });
  }
};

export const obtenerProveedores = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { fechaBaja: null },
    });
    res.status(200).json(proveedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: [{ message: "Error al obtener los proveedores" }],
    });
  }
};

export const eliminarProveedor = async (req, res) => {
  const { id_proveedor } = req.query;
  if (!id_proveedor) {
    return res.status(400).json({ error: "Falta el id del proveedor" });
  }

  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id_proveedor: +id_proveedor },
    });

    if (!proveedor) {
      throw new Error("Proveedor no encontrado");
    }

    // Verificar que el proveedor no sea el predeterminado de al menos un artículo
    const proveedorArticulo = await prisma.proveedorArticulo.findFirst({
      where: {
        id_proveedor: +id_proveedor,
        es_predeterminado: true,
      },
    });
    if (proveedorArticulo) {
      throw new Error(
        "No se puede eliminar el proveedor porque es el predeterminado de al menos un artículo."
      );
    }

    // // Verificar que el proveedor no tenga órdenes de compra pendientes
    const ordenPendiente = await prisma.ordenCompra.findFirst({
      where: {
        or: [
          { id_estado_orden_compra: estadosOC.pendiente },
          { id_estado_orden_compra: estadosOC.enviada },
        ],
        proveedorArticulo: {
          id_proveedor: +id_proveedor,
        },
      },
    });

    if (ordenPendiente) {
      throw new Error(
        "No se puede eliminar el proveedor porque tiene órdenes de compra pendientes."
      );
    }

    // Marcar el proveedor como eliminado
    await prisma.proveedor.update({
      where: { id_proveedor: +id_proveedor },
      data: { fechaBaja: new Date() },
    });

    res.status(200).json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: { message: error.message || "Error al eliminar el proveedor" },
    });
  }
};

export const modificarProveedor = async (req, res) => {
  const { id_proveedor } = req.params;
  const { nombre, apellido, email, telefono } = req.body;

  if (!id_proveedor) {
    return res.status(400).json({ error: "Falta el id del proveedor" });
  }

  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id_proveedor: +id_proveedor },
    });

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    const updatedProveedor = await prisma.proveedor.update({
      where: { id_proveedor: +id_proveedor },
      data: {
        nombre,
        apellido,
        email,
        telefono,
      },
    });

    res.status(200).json(updatedProveedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: { message: "Error al modificar el proveedor" },
    });
  }
};
