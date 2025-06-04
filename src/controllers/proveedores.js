import { PrismaClient } from '@prisma/client'
import { validateProveedor } from '../validators/proveedor.schema.js'

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
          const {
            id_articulo,
            precio_unitario,
            demora_entrega,
            costo_pedido,
            costo_compra,
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
