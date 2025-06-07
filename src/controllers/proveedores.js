import { PrismaClient } from '@prisma/client'
import { validateProveedor } from '../validators/proveedor.schema.js'
import { estadosOC } from '../utils/constants.js'

const prisma = new PrismaClient()

export const crearProveedor = async (req, res) => {
  const result = validateProveedor(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const { nombre, apellido, email, telefono, articulos } = result.data

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoProveedor = await prisma.proveedor.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
        },
      })

      // Asociar artículos al proveedor
      if (articulos && articulos.length > 0) {
        for (const articulo of articulos) {
          const costoAlm = await prisma.articulo.findUnique({
            where: {
              id_articulo: articulo.id_articulo,
            },
            select: {
              costo_almacenamiento: true,
            },
          })

          console.log('costoAlm', costoAlm)
          const {
            id_articulo,
            precio_unitario,
            demora_entrega,
            costo_pedido, // Esto es (Demanda / Cantidad a pedir) * Costo de hacer un Pedido
            costo_compra, // Esto es Demanda * Costo por Unidad
            modelo_seleccionado,
            es_predeterminado,
          } = articulo

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
              cgi: costoAlm.costo_almacenamiento + costo_pedido + costo_compra,
            },
          })

          // Crear el modelo de inventario si es predeterminado
          if (es_predeterminado) {
            await prisma.modeloInventario.create({
              data: {
                id_proveedor_articulo:
                  nuevoProveedorArticulo.id_proveedor_articulo,
              },
            })
          }

          // Falta calcular el lote óptimo y punto de pedido de acuerdo al modelo de inventario seleccionado...
        }
      }
      return nuevoProveedor
    })

    res.status(201).json(resultado)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está en uso.' })
    }
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el proveedor' }],
    })
  }
}

export const obtenerProveedores = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { fechaBaja: null },
    })
    res.status(200).json(proveedores)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener los proveedores' }],
    })
  }
}

export const eliminarProveedor = async (req, res) => {
  const { id_proveedor } = req.query
  if (!id_proveedor) {
    return res.status(400).json({ error: 'Falta el id del proveedor' })
  }

  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id_proveedor: +id_proveedor },
    })

    if (!proveedor) {
      throw new Error('Proveedor no encontrado')
    }

    // Verificar que el proveedor no sea el predeterminado de al menos un artículo
    const proveedorArticulo = await prisma.proveedorArticulo.findFirst({
      where: {
        id_proveedor: +id_proveedor,
        es_predeterminado: true,
      },
    })
    if (proveedorArticulo) {
      throw new Error(
        'No se puede eliminar el proveedor porque es el predeterminado de al menos un artículo.'
      )
    }

    // // Verificar que el proveedor no tenga órdenes de compra pendientes
    const ordenPendiente = await prisma.ordenCompra.findFirst({
      where: {
        id_estado_orden_compra: estadosOC.pendiente,
        proveedorArticulo: {
          id_proveedor: +id_proveedor,
        },
      },
    })

    if (ordenPendiente) {
      throw new Error(
        'No se puede eliminar el proveedor porque tiene órdenes de compra pendientes.'
      )
    }

    // Marcar el proveedor como eliminado
    await prisma.proveedor.update({
      where: { id_proveedor: +id_proveedor },
      data: { fechaBaja: new Date() },
    })

    res.status(200).json({ message: 'Proveedor eliminado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: { message: error.message || 'Error al eliminar el proveedor' },
    })
  }
}
