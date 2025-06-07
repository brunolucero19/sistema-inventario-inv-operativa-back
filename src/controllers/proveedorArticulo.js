import { PrismaClient } from '@prisma/client'
import { validateProveedorArticulo } from '../validators/proveedorArticulo.schema.js'

const prisma = new PrismaClient()

//POST
export const crearProveedorArticulo = async (req, res) => {
  const result = validateProveedorArticulo(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    id_proveedor,
    id_articulo,
    costo_pedido,
    costo_compra,
    precio_unitario,
    demora_entrega,
    modelo_seleccionado,
    es_predeterminado,
  } = result.data

  try {
    // Crear relación proveedor-artículo
    const nuevoProveedorArticulo = await prisma.proveedorArticulo.create({
      data: {
        id_proveedor,
        id_articulo,
        costo_pedido,
        costo_compra,
        precio_unitario,
        demora_entrega,
        modelo_seleccionado,
        es_predeterminado,
      },
      include: {
        proveedor: true,
        articulo: true,
      },
    })
    // Si es predeterminado, crear el modelo de inventario
    if (es_predeterminado) {
      await prisma.modeloInventario.create({
        data: {
          id_proveedor_articulo: nuevoProveedorArticulo.id_proveedor_articulo,
        },
      })
    }

    // Falta calcular de acuerdo al modelo de inventario seleccionado

    // Si es predeterminado, buscar si existe algún articulo-proveedor que ya tenga un proveedor predeterminado y setearlo a false
    if (es_predeterminado) {
      await prisma.proveedorArticulo.updateMany({
        where: {
          id_articulo: id_articulo,
          es_predeterminado: true,
          id_proveedor_articulo: {
            not: nuevoProveedorArticulo.id_proveedor_articulo,
          },
        },
        data: { es_predeterminado: false },
      })
    }

    res.status(201).json(nuevoProveedorArticulo)
  } catch (error) {
    if (error.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'El proveedor ya está asociado a ese artículo.' })
    }

    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el proveedor-artículo' }],
    })
  }
}

//Todos los proveedores por aritculo
export const obtenerProveedoresPorArticulo = async (req, res) => {
  const idArticulo = req.params.id

  try {
    const resultados = await prisma.proveedorArticulo.findMany({
      where: { id_articulo: +idArticulo },
      include: {
        proveedor: true,
        articulo: true,
      },
    })

    res.status(200).json(resultados)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener proveedores por artículo' }],
    })
  }
}

//Todos los articulos por proveedor
export const obtenerArticulosPorProveedor = async (req, res) => {
  const { id_proveedor } = req.query
  if (!id_proveedor) {
    return res.status(400).json({ error: 'Falta el id del proveedor' })
  }

  try {
    const data = await prisma.proveedorArticulo.findMany({
      where: { id_proveedor: +id_proveedor },
      include: {
        proveedor: true,
        articulo: true,
      },
    })

    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener artículos por proveedor' }],
    })
  }
}

// Actualizar proveedor-articulo
export const actualizarProveedorArticulo = async (req, res) => {
  const result = validateProveedorArticulo(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    id_proveedor,
    id_articulo,
    costo_pedido,
    costo_compra,
    precio_unitario,
    demora_entrega,
    es_predeterminado,
    modelo_seleccionado,
  } = result.data

  try {
    // Verificar si existe el proveedor-artículo
    const proveedorArticuloExistente = await prisma.proveedorArticulo.findFirst(
      {
        where: {
          id_proveedor,
          id_articulo,
        },
      }
    )
    if (!proveedorArticuloExistente) {
      throw new Error('El proveedor-artículo no existe o no está asociado.')
    }
    // Actualizar el proveedor-artículo
    const proveedorArticuloActualizado = await prisma.proveedorArticulo.update({
      where: {
        id_proveedor_articulo: proveedorArticuloExistente.id_proveedor_articulo,
      },
      data: {
        costo_pedido,
        costo_compra,
        precio_unitario,
        demora_entrega,
        modelo_seleccionado,
        es_predeterminado,
      },
    })
    // Si es predeterminado, buscar si existe algún articulo-proveedor que ya tenga un proveedor predeterminado y setearlo a false
    if (es_predeterminado) {
      await prisma.proveedorArticulo.updateMany({
        where: {
          id_articulo: id_articulo,
          es_predeterminado: true,
          id_proveedor_articulo: {
            not: proveedorArticuloExistente.id_proveedor_articulo,
          },
        },
        data: { es_predeterminado: false },
      })
    }

    res.status(200).json(proveedorArticuloActualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al actualizar el proveedor-artículo' }],
    })
  }
}

export const eliminarProveedorArticulo = async (req, res) => {
  const { id_articulo, id_proveedor } = req.query
  if (!id_articulo || !id_proveedor) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' })
  }
  try {
    const proveedorArticulo = await prisma.proveedorArticulo.findFirst({
      where: {
        id_articulo: +id_articulo,
        id_proveedor: +id_proveedor,
      },
    })

    if (!proveedorArticulo) {
      return res.status(404).json({ error: 'Proveedor-artículo no encontrado' })
    }

    await prisma.proveedorArticulo.delete({
      where: {
        id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
      },
    })

    res
      .status(200)
      .json({ message: 'Proveedor-artículo eliminado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al eliminar el proveedor-artículo' }],
    })
  }
}

export const obtenerCGIPorArticulo = async (req, res) => {
  const { idArticulo } = req.params
  if (!idArticulo) {
    return res.status(400).json({ error: 'Falta el id del articulo' })
  }

  try {
    const data = await prisma.proveedorArticulo.findMany({
      where: {
        id_articulo: +idArticulo,
        proveedor: {
          fechaBaja: null,
        },
      },
      select: {
        cgi: true,
        proveedor: {
          select: {
            nombre: true,
          },
        },
      },
    })

    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener CGI por articulo' }],
    })
  }
}