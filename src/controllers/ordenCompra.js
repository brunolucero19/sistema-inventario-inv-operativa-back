import { PrismaClient } from '@prisma/client'
import { validateOrdenCompra } from '../validators/ordenCompra.schema.js'

const prisma = new PrismaClient()

// Crear OC
export const crearOrdenCompra = async (req, res) => {
  const result = validateOrdenCompra(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    id_proveedor_articulo,
    cantidad,
    fechaEntrega,
  } = result.data

  try {
    const nuevaOrdenCompra = await prisma.ordenCompra.create({
      data: {
        cantidad,
        monto_total: 1,
        fecha_estimada_recepcion: new Date(fechaEntrega),
        id_proveedor_articulo,
        id_estado_orden_compra: 1, //es el estado pendiente definido en compu valen
      },
    })

    res.status(201).json(nuevaOrdenCompra)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

//Actualizar OC
export const actualizarOrdenCompra = async (req, res) => {
  const idOrdenCompra = parseInt(req.params.id);
  const { cantidad: nuevaCantidad } = req.body;

  if (!nuevaCantidad || isNaN(idOrdenCompra)) {
    return res.status(400).json({ error: "Faltan datos o formato inválido" });
  }

  try {
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
      include: { proveedorArticulo: true },
    });

    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    const precioUnitario = ordenCompra.proveedorArticulo.precio_unitario;
    const nuevoMontoTotal = precioUnitario * nuevaCantidad;

    const ordenActualizada = await prisma.ordenCompra.update({
      where: { id_orden_compra: idOrdenCompra },
      data: {
        cantidad: nuevaCantidad,
        monto_total: nuevoMontoTotal,
      },
    });

    res.json(ordenActualizada);
  } catch (error) {
    console.error('Error al actualizar la orden de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
