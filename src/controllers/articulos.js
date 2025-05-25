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

export const obtenerArticulos = async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany()
    res.status(200).json(articulos)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener los artículos' }],
    })
  }
}

export const obtenerArticulo = async (req, res) => {
  const id = req.params.id 
  if (!id) {
    return res.status(400).json({ error: 'Falta el id' })
  }
  try {
    const articulo = await prisma.articulo.findUnique({
      where: { id_articulo: parseInt(id) }
    })
    if (!articulo) {
      return res.status(404).json({ error: 'Artículo no encontrado' })
    }
    res.json(articulo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener el artículo' })
  }
}

