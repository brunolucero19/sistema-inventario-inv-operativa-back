import { PrismaClient } from "@prisma/client";
import { validateArticulo } from "../validators/articulo.schema.js";
import { estadosOC } from "../utils/constants.js";

const prisma = new PrismaClient();

export const crearArticulo = async (req, res) => {
  const result = validateArticulo(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error.issues });
  }

  const {
    descripcion,
    demanda_articulo,
    costo_almacenamiento,
    stock,
    precioVenta,
    stock_seguridad,
    inventario_maximo,
  } = result.data;

  try {
    const nuevoArticulo = await prisma.articulo.create({
      data: {
        descripcion,
        demanda_articulo,
        costo_almacenamiento,
        stock,
        precioVenta,
        stock_seguridad,
        inventario_maximo,
      },
    });

    res.status(201).json(nuevoArticulo);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: [{ message: "Error al crear el artículo" }],
    });
  }
};

export const obtenerArticulos = async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany();
    res.status(200).json(articulos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: [{ message: "Error al obtener los artículos" }],
    });
  }
};

export const obtenerArticulo = async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Falta el id" });
  }
  try {
    const articulo = await prisma.articulo.findUnique({
      where: { id_articulo: parseInt(id) },
    });
    if (!articulo) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }
    res.json(articulo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el artículo" });
  }
};

export const modificarArticulo = async (req, res) => {
  const id = req.params.id;
  const result = validateArticulo(req.body);

  if (!id) {
    return res.status(400).json({ error: "Falta el id" });
  }

  if (result.error) {
    return res.status(400).json({ error: result.error.issues });
  }

  try {
    const articuloActualizado = await prisma.articulo.update({
      where: {
        id_articulo: +id,
      },

      data: result.data,
    });
    res.json(articuloActualizado);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025")
      return res
        .status(404)
        .json({ error: "No se encontró un artículo con ese id" });

    res.status(500).json({ error: "Error al actualizar el artículo" });
  }
};

export const eliminarArticulo = async (req, res) => {
  const id = parseInt(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "Falta el id" });
  }

  try {

     const ordenPendiente = await prisma.ordenCompra.findFirst({
      where: {
        id_estado_orden_compra: estadosOC.pendiente,
        proveedorArticulo: { // es el join en prisma
          id_articulo: id,
        },
      },
    });

    if (ordenPendiente) {
      return res.status(400).json({
        error: "No se puede eliminar el artículo porque está en una orden de compra pendiente.",
      });
    }

    const articuloEliminado = await prisma.articulo.update({
      where: {
        id_articulo: +id,
      },
      data: {
        fechaBaja: new Date()
      }
    });
    res.json(articuloEliminado);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025")
      return res
        .status(404)
        .json({ error: "No se encontró un artículo con ese id" });

    res.status(500).json({ error: "Error al eliminar el artículo" });
  }
};
