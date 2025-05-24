import { PrismaClient } from '@prisma/client'
import { validateArticulo } from '../validators/articulo.schema.js'

const prisma = new PrismaClient()

export const crearArticulo = async (req, res) => {
  const result = validateArticulo(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    nombre,
    descripcion,
    demanda_articulo,
    costo_almacenamiento,
    stock,
    precioVenta,
    cgi,
    stock_seguridad,
    inventario_maximo
  } = result.data

  try {
    const nuevoArticulo = await prisma.articulo.create({
      data: {
        nombre,
        descripcion,
        demanda_articulo,
        costo_almacenamiento,
        stock,
        precioVenta,
        cgi,
        stock_seguridad,
        inventario_maximo
      },
    })

    res.status(201).json(nuevoArticulo)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el artículo' }],
    })
  }
}