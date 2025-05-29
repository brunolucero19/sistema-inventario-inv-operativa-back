import { PrismaClient } from '@prisma/client'
import { validateOrdenCompra } from '../validators/ordenCompra.schema.js'

const prisma = new PrismaClient()

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
        monto_total: 0,
        fecha_estimada_recepcion: new Date(fechaEntrega),
        id_proveedor_articulo,
        id_estado_orden_compra: 1, //Se me crea con estado pendiente por defecto 
      },
    })

    res.status(201).json(nuevaOrdenCompra)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}
