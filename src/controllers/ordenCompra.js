import { PrismaClient } from '@prisma/client'
import { validateOrdenCompra } from '../validators/ordenCompra.schema.js'

const prisma = new PrismaClient()

// POST
export const crearOrdenCompra = async (req, res) => {
  const result = validateOrdenCompra(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    id_proveedor_articulo,
    cantidad,
  } = result.data

  try {

    const proveedorArticulo = await prisma.proveedorArticulo.findUnique({
      where: { id_proveedor_articulo: id_proveedor_articulo },
    })

    if( !proveedorArticulo) {
      return res.status(404).json({ error: 'ProveedorArticulo no encontrado' })
    }
    const fechaEntrega = new Date(Date.now() + proveedorArticulo.demora_entrega * 24 * 60 * 60 * 1000)

    const monto_total = proveedorArticulo.precio_unitario * cantidad
    const nuevaOrdenCompra = await prisma.ordenCompra.create({
      data: {
        cantidad,
        monto_total,
        fecha_estimada_recepcion: fechaEntrega,
        id_proveedor_articulo,
        id_estado_orden_compra: 1, //Se me crea con estado pendiente por defecto 
      },
      include:{
        estadoOrdenCompra: true,
        proveedorArticulo:{
          include: {
            proveedor: {
              select: {
                id_proveedor: true,
                nombre: true,
              }
            },
            articulo: {
              select: {
                id_articulo: true,
                descripcion: true
              }
            },
          }
        }
      }
    })

    res.status(201).json(nuevaOrdenCompra)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

//GET ALL
export const obtenerOrdenesCompra = async (req, res) => {
  try {
    const ordenesCompra = await prisma.ordenCompra.findMany({
      include: {
        proveedorArticulo: {
          include: {
            proveedor: {
              select: {
                id_proveedor: true,
                nombre: true,
              },
            },
            articulo: {
              select: {
                id_articulo: true,
                descripcion: true,
              },
            },
          },
        },
        estadoOrdenCompra: true,
      },
    })

    res.status(200).json(ordenesCompra)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

// GET POR ID
export const obtenerOrdenCompra = async (req, res) => {
  const { id } = req.params

  try {
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: {
        proveedorArticulo: true,
        estadoOrdenCompra: true,
      },
    })

    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' })
    }

    res.status(200).json(ordenCompra)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

// PATCH
export const actualizarOrdenCompra = async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }

  try {
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: { proveedorArticulo: true },
    });

    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    const precioUnitario = ordenCompra.proveedorArticulo.precio_unitario;
    const nuevoMontoTotal = precioUnitario * cantidad;

    const ordenActualizada = await prisma.ordenCompra.update({
      where: { id_orden_compra: parseInt(id) },
      data: {
        cantidad,
        monto_total: nuevoMontoTotal,
      },
    });

    res.status(200).json(ordenActualizada);
  } catch (error) {
    console.error('Error al actualizar la orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};