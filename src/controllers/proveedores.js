import { PrismaClient } from '@prisma/client'
import { validateProveedor } from '../validators/proveedor.schema.js'
import { estadosOC, nivelServicioZ } from '../utils/constants.js'
import {
  calcularCGI,
  calcularCostoCompra,
  calcularInventarioMaximo,
  calcularLoteOptimoPuntoPedido,
  calcularStockSeguridadIF,
  calcularStockSeguridadLF,
} from '../utils/calculos.js'

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
          const art = await prisma.articulo.findUnique({
            where: {
              id_articulo: articulo.id_articulo,
            },
          })

          const {
            id_articulo,
            precio_unitario,
            demora_entrega,
            costo_pedido,
            modelo_seleccionado,
            es_predeterminado,
            periodo_revision,
            nivel_servicio,
          } = articulo

          const costo_compra = calcularCostoCompra(
            precio_unitario,
            art.demanda_articulo
          )

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
              nivel_servicio,
            },
            include: {
              proveedor: true,
              articulo: true,
            },
          })

          // Setear en false a los demás proveedores del artículo si el nuevo es predeterminado
          if (es_predeterminado) {
            await prisma.proveedorArticulo.updateMany({
              where: {
                id_articulo: id_articulo,
                id_proveedor: {
                  not: nuevoProveedor.id_proveedor,
                },
              },
              data: { es_predeterminado: false },
            })
          }

          const modeloInventarioNuevo = await prisma.modeloInventario.create({
            data: {
              id_proveedor_articulo:
                nuevoProveedorArticulo.id_proveedor_articulo,
            },
          })

          let cgi;
          
          //Calculo de lote optimo si el modelo es de lote fijo
          if (modelo_seleccionado === 'lote_fijo') {
            const { Q, R } = await calcularLoteOptimoPuntoPedido(
              nuevoProveedorArticulo
            )

            const stock_seguridad = calcularStockSeguridadLF(
              nivelServicioZ[nivel_servicio],
              nuevoProveedorArticulo.articulo.desviacion_est_dem,
              nuevoProveedorArticulo.demora_entrega
            )

            // Calculo CGI
            const D = nuevoProveedorArticulo.articulo.demanda_articulo;
            const S = nuevoProveedorArticulo.costo_pedido;
            const costo_pedido = (D / Q) * S;

            const H = nuevoProveedorArticulo.articulo.costo_almacenamiento;
            const costo_almacenamiento = (Q / 2) * H;
            
            cgi = calcularCGI(
              costo_almacenamiento,
              costo_pedido,
              costo_compra
            )

            await prisma.modeloInventario.update({
              where: {
                id_modelo_inventario:
                  modeloInventarioNuevo.id_modelo_inventario,
              },

              data: {
                lote_optimo: Q,
                punto_pedido: R,
                periodo_revision: null, // No se usa en lote fijo
                fecha_ultima_revision: null, // No se usa en lote fijo
                stock_seguridad,
              },
            })
          }

          // Para modelo de intervalo fijo
          if (modelo_seleccionado === 'intervalo_fijo') {
            const desviacion_estandar =
              nuevoProveedorArticulo.articulo.desviacion_est_dem
            const stock_seguridad = calcularStockSeguridadIF(
              periodo_revision,
              demora_entrega,
              nivelServicioZ[nivel_servicio],
              desviacion_estandar
            )

            const demanda_diaria =
              nuevoProveedorArticulo.articulo.demanda_articulo / 365

            const inventario_maximo = calcularInventarioMaximo(
              demanda_diaria,
              periodo_revision,
              demora_entrega,
              nivelServicioZ[nivel_servicio],
              desviacion_estandar
            )
            await prisma.modeloInventario.update({
              where: {
                id_modelo_inventario:
                  modeloInventarioNuevo.id_modelo_inventario,
              },
              data: {
                periodo_revision: periodo_revision,
                fecha_ultima_revision: new Date(),
                lote_optimo: null,
                punto_pedido: null,
                stock_seguridad,
                inventario_maximo,
              },
            })
          }

          // Actualizar CGI
          await prisma.proveedorArticulo.update({
            where: {
              id_proveedor_articulo: nuevoProveedorArticulo.id_proveedor_articulo,
            },
            data: {
              cgi: cgi,
            },
          })

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
        or: [
          { id_estado_orden_compra: estadosOC.pendiente },
          { id_estado_orden_compra: estadosOC.enviada },
        ],
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

export const modificarProveedor = async (req, res) => {
  const { id_proveedor } = req.params
  const { nombre, apellido, email, telefono } = req.body

  if (!id_proveedor) {
    return res.status(400).json({ error: 'Falta el id del proveedor' })
  }

  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id_proveedor: +id_proveedor },
    })

    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }

    const updatedProveedor = await prisma.proveedor.update({
      where: { id_proveedor: +id_proveedor },
      data: {
        nombre,
        apellido,
        email,
        telefono,
      },
    })

    res.status(200).json(updatedProveedor)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: { message: 'Error al modificar el proveedor' },
    })
  }
}
