import { PrismaClient } from '@prisma/client'
import { validateOrdenCompra } from '../validators/ordenCompra.schema.js'
import { estadosOC } from '../utils/constants.js'

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

    if (!proveedorArticulo) {
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
      include: {
        estadoOrdenCompra: true,
        proveedorArticulo: {
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
  const { cantidad, estadoId } = req.body;

  if ((!cantidad || isNaN(cantidad) || cantidad <= 0) && !estadoId) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }

  try {
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: parseInt(id) },
      include: { proveedorArticulo: true, estadoOrdenCompra: true },
    });

    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (ordenCompra.estadoOrdenCompra.id_estado_orden_compra === estadosOC.cancelada) {
      return res.status(400).json({ error: 'No se puede actualizar una orden de compra cancelada' });
    }

    if (ordenCompra.estadoOrdenCompra.id_estado_orden_compra === estadosOC.finalizada) {
      return res.status(400).json({ error: 'No se puede actualizar una orden de compra finalizada' });
    }

    if (ordenCompra.estadoOrdenCompra.id_estado_orden_compra === estadosOC.enviada) {
      const { enviada, finalizada } = estadosOC;

      const esEstadoValido = estadoId ? [enviada, finalizada].includes(+estadoId) : false;
      if (!esEstadoValido) {
        return res.status(400).json({ error: 'No se puede actualizar una orden de compra enviada a un estado diferente a finalizada' });
      }

      if (cantidad) {
        return res.status(400).json({ error: 'No se puede actualizar la cantidad de una orden de compra enviada' });
      }

      const ordenActualizada = await prisma.$transaction(async (tx) => {
        const ordenActualizada = await tx.ordenCompra.update({
          where: { id_orden_compra: +id },
          data: {
            id_estado_orden_compra: estadosOC.finalizada, // Cambia el estado a finalizada
            fecha_real_recepcion: new Date(), 
          },
          include: {
            proveedorArticulo: {
              include: {
                articulo: true
              }
            },
            estadoOrdenCompra: true,
          }
        });

        await tx.articulo.update({
          where: {
            id_articulo: ordenActualizada.proveedorArticulo.articulo.id_articulo
          },
          data: {
            stock: {
              increment: ordenActualizada.cantidad // Incrementa el stock del artículo
            }
          }
        })

        return ordenActualizada;
      });

      // Eliminar el proveedorArticulo y estadoOrdenCompra para no enviarlos en la res
      delete ordenActualizada.proveedorArticulo
      delete ordenActualizada.estadoOrdenCompra
      return res.status(200).json(ordenActualizada)

    }


    // Si la orden de compra está pendiente, se puede actualizar la cantidad y el estado

    if (ordenCompra.estadoOrdenCompra.id_estado_orden_compra === estadosOC.pendiente) {
      const precioUnitario = ordenCompra.proveedorArticulo.precio_unitario;
      const nuevoMontoTotal = cantidad ? precioUnitario * cantidad : ordenCompra.monto_total;

      const { cancelada, enviada, pendiente } = estadosOC

      const esEstadoValido = estadoId ? [cancelada, enviada, pendiente].includes(+estadoId) : false; // Verifica si el estado es válido

      if (estadoId && !esEstadoValido) {
        return res.status(400).json({ error: 'Estado inválido para una orden de compra pendiente' });
      }

      const ordenActualizada = await prisma.ordenCompra.update({
        where: { id_orden_compra: +id },
        data: {
          cantidad: cantidad || ordenCompra.cantidad,
          monto_total: nuevoMontoTotal,
          id_estado_orden_compra: esEstadoValido ? +estadoId : estadosOC.pendiente // Si no se proporciona estadoId, se mantiene como pendiente
        },
      });
      
      return res.status(200).json(ordenActualizada);
    }

    res.status(400).json({ error: 'Estado de orden de compra no válido para actualización' });

  } catch (error) {
    console.error('Error al actualizar la orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};