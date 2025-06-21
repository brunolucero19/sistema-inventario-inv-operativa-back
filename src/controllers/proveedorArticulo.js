import { PrismaClient } from '@prisma/client'
import { validateProveedorArticulo } from '../validators/proveedorArticulo.schema.js'
import {
  calcularLoteOptimoPuntoPedido,
  calcularStockSeguridadLF,
  calcularStockSeguridadIF,
  calcularInventarioMaximo,
  calcularCostoCompra,
} from '../utils/calculos.js'
import { estadosOC, nivelServicioZ } from '../utils/constants.js'

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
    precio_unitario,
    demora_entrega,
    nivel_servicio,
    modelo_seleccionado,
    es_predeterminado,
    periodo_revision,
  } = result.data

  try {
    // Crear relación proveedor-artículo
    const articulo = await prisma.articulo.findUnique({
      where: { id_articulo },
    })

    const costo_compra = calcularCostoCompra(
      precio_unitario,
      articulo.demanda_articulo
    )

    const nuevoProveedorArticulo = await prisma.proveedorArticulo.create({
      data: {
        id_proveedor,
        id_articulo,
        costo_pedido,
        costo_compra,
        precio_unitario,
        demora_entrega,
        nivel_servicio,
        modelo_seleccionado,
        es_predeterminado,
      },
      include: {
        proveedor: true,
        articulo: true,
      },
    })

    const nuevoModeloInventario = await prisma.modeloInventario.create({
      data: {
        id_proveedor_articulo: nuevoProveedorArticulo.id_proveedor_articulo,
      },
    })

    let cgi = 0
    
    const D = nuevoProveedorArticulo.articulo.demanda_articulo;
    const S = nuevoProveedorArticulo.costo_pedido;
    const H = nuevoProveedorArticulo.articulo.costo_almacenamiento;
    const T = periodo_revision / 365;

    //Calculo de lote optimo si el modelo es de lote fijo
    if (modelo_seleccionado === 'lote_fijo') {

      // Calculo Lote Optimo
      const { Q, R } = await calcularLoteOptimoPuntoPedido(
        nuevoProveedorArticulo
      )

      // Calculo Stock Seguridad
      const stock_seguridad = calcularStockSeguridadLF(
        nivelServicioZ[nivel_servicio],
        nuevoProveedorArticulo.articulo.desviacion_est_dem,
        demora_entrega
      )
      
      // Calculo CGI
      const costo_pedido = (D / Q) * S;

      const costo_almacenamiento = (Q / 2) * H;
      
      cgi = calcularCGI(
        costo_almacenamiento,
        costo_pedido,
        costo_compra
      )

      await prisma.modeloInventario.update({
        where: {
          id_modelo_inventario: nuevoModeloInventario.id_modelo_inventario,
        },
        data: {
          lote_optimo: Q,
          punto_pedido: R,
          periodo_revision: null, // No se usa en lote fijo
          fecha_ultima_revision: null, // No se usa en lote fijo
          stock_seguridad: stock_seguridad,
        },
      })
    }

    // Para modelo de intervalo fijo
    if (modelo_seleccionado === 'intervalo_fijo') {
      const desviacion_estandar =
        nuevoProveedorArticulo.articulo.desviacion_est_dem

      // Calculo Stock Seguridad
      const stock_seguridad = calcularStockSeguridadIF(
        periodo_revision,
        demora_entrega,
        nivelServicioZ[nivel_servicio],
        desviacion_estandar
      )

      // Calculo Inventario Maximo
      const demanda_diaria =
        nuevoProveedorArticulo.articulo.demanda_articulo / 365

      const inventario_maximo = calcularInventarioMaximo(
        demanda_diaria,
        periodo_revision,
        demora_entrega,
        nivelServicioZ[nivel_servicio],
        desviacion_estandar
      )

      // Calculo CGI      
      const costo_pedido = (1 / T) * S;

      const costo_almacenamiento = ((D * T) / 2) * H;
      
      cgi = calcularCGI(
        costo_almacenamiento,
        costo_pedido,
        costo_compra
      )

      await prisma.modeloInventario.update({
        where: {
          id_modelo_inventario: nuevoModeloInventario.id_modelo_inventario,
        },
        data: {
          periodo_revision: periodo_revision,
          fecha_ultima_revision: new Date(),
          lote_optimo: null,
          punto_pedido: null,
          stock_seguridad: stock_seguridad,
          inventario_maximo: inventario_maximo,
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
    console.log(error.message)
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
        modeloInventario: {
          select: {
            lote_optimo: true,
          },
        },
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
        modeloInventario: true,
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
    console.log(result.error.issues)
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    id_proveedor,
    id_articulo,
    costo_pedido,
    precio_unitario,
    demora_entrega,
    nivel_servicio,
    es_predeterminado,
    modelo_seleccionado,
    periodo_revision,
  } = result.data

  try {
    // Verificar si existe el proveedor-artículo
    const proveedorArticuloExistente = await prisma.proveedorArticulo.findFirst(
      {
        where: {
          id_proveedor,
          id_articulo,
        },
        include: {
          modeloInventario: true,
          articulo: true,
        },
      }
    )
    if (!proveedorArticuloExistente) {
      throw new Error('El proveedor-artículo no existe o no está asociado.')
    }

    // Si es predeterminado, buscar si existe algún articulo-proveedor que ya tenga un proveedor predeterminado y setearlo a false

    if (!es_predeterminado && proveedorArticuloExistente.es_predeterminado) {
      return res.status(400).json({
        error:
          'No se puede desmarcar a éste proveedor como el predeterminado. Primero debe asignarle otro proveedor como predeterminado.',
      })
    }

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

    // Actualizar el proveedor-artículo
    const costo_compra = proveedorArticuloExistente.articulo.demanda_articulo * precio_unitario
    const proveedorArticuloActualizado = await prisma.proveedorArticulo.update({
      where: {
        id_proveedor_articulo: proveedorArticuloExistente.id_proveedor_articulo,
      },
      data: {
        costo_pedido,
        costo_compra,
        precio_unitario,
        demora_entrega,
        nivel_servicio,
        modelo_seleccionado,
        es_predeterminado,
      },
      include: {
        articulo: true,
      },
    })
    // Si es predeterminado, buscar si existe algún articulo-proveedor que ya tenga un proveedor predeterminado y setearlo a false
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

    const modeloInventarioUpdated = {}
    //Calculo de lote optimo si el modelo es de lote fijo
    if (modelo_seleccionado === 'lote_fijo') {
      if (
        proveedorArticuloExistente.nivel_servicio !== proveedorArticuloActualizado.nivel_servicio ||
        proveedorArticuloExistente.demora_entrega !== proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.modelo_seleccionado !== proveedorArticuloActualizado.modelo_seleccionado
      ) {
        modeloInventarioUpdated.stock_seguridad = calcularStockSeguridadLF(
          nivelServicioZ[nivel_servicio],
          proveedorArticuloActualizado.articulo.desviacion_est_dem,
          demora_entrega
        )
      }
      if (
        proveedorArticuloExistente.demora_entrega !== proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.costo_pedido !== proveedorArticuloActualizado.costo_pedido ||
        proveedorArticuloExistente.modelo_seleccionado !== proveedorArticuloActualizado.modelo_seleccionado
      ) {
        const { Q, R } = await calcularLoteOptimoPuntoPedido(
          proveedorArticuloActualizado
        )
        modeloInventarioUpdated.lote_optimo = Q
        modeloInventarioUpdated.punto_pedido = R
      }


      await prisma.modeloInventario.update({
        where: {
          id_proveedor_articulo:
            proveedorArticuloActualizado.id_proveedor_articulo,
        },
        data: {
          ...modeloInventarioUpdated,
          periodo_revision: null, // No se usa en lote fijo
          fecha_ultima_revision: null, // No se usa en lote fijo
        },
      })

    }

    // Para modelo de intervalo fijo
    if (modelo_seleccionado === 'intervalo_fijo') {
      if (
        proveedorArticuloExistente.periodo_revision !== proveedorArticuloActualizado.periodo_revision ||
        proveedorArticuloExistente.demora_entrega !== proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.nivel_servicio !== proveedorArticuloActualizado.nivel_servicio ||
        proveedorArticuloExistente.modelo_seleccionado !== proveedorArticuloActualizado.modelo_seleccionado
      ) {
        const desviacion_estandar = proveedorArticuloActualizado.articulo.desviacion_est_dem

        modeloInventarioUpdated.stock_seguridad = calcularStockSeguridadIF(
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          desviacion_estandar
        )
      }
      if (
        proveedorArticuloExistente.periodo_revision !== proveedorArticuloActualizado.periodo_revision ||
        proveedorArticuloExistente.demora_entrega !== proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.nivel_servicio !== proveedorArticuloActualizado.nivel_servicio ||
        proveedorArticuloExistente.modelo_seleccionado !== proveedorArticuloActualizado.modelo_seleccionado
      ) {
        const demanda_diaria =
          proveedorArticuloActualizado.articulo.demanda_articulo / 365

        modeloInventarioUpdated.inventario_maximo = calcularInventarioMaximo(
          demanda_diaria,
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          proveedorArticuloActualizado.articulo.desviacion_est_dem
        )
      }

      // Traer datos actuales del modelo inventario
      const stock_seguridad = calcularStockSeguridadIF(
        periodo_revision,
        demora_entrega,
        nivelServicioZ[nivel_servicio],
        proveedorArticuloActualizado.articulo.desviacion_est_dem
      )
      modeloInventarioUpdated.stock_seguridad = stock_seguridad

      const modeloInventarioActual = await prisma.modeloInventario.findUnique({
        where: {
          id_proveedor_articulo:
            proveedorArticuloActualizado.id_proveedor_articulo,
        },
        select: {
          fecha_ultima_revision: true,
        },
      })

      await prisma.modeloInventario.update({
        where: {
          id_proveedor_articulo:
            proveedorArticuloActualizado.id_proveedor_articulo,
        },
        data: {
          periodo_revision: periodo_revision,
          fecha_ultima_revision:
            modeloInventarioActual.fecha_ultima_revision ?? new Date(),
          ...modeloInventarioUpdated,
          lote_optimo: null,
          punto_pedido: null,
        },
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

    const proveedorArticulosCount = await prisma.proveedorArticulo.count({
      where: {
        id_proveedor: +id_proveedor,
      },
    })

    if (proveedorArticulosCount <= 1) {
      return res.status(400).json({
        error:
          'No se puede eliminar la última relación asociada a este proveedor.',
      })
    }
    // Eliminar el modelo de inventario asociado
    if (proveedorArticulo.es_predeterminado) {
      return res.status(400).json({
        error:
          'No se puede eliminar un Proveedor-artículo predeterminado. Debe cambiar el proveedor predeterminado antes de eliminar este registro.',
      })
    }
    await prisma.modeloInventario.delete({
      where: {
        id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
      },
    })

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

//Proveedor-artículo que el stock este por debajo del punto de pedido y no tenga una orden activa
export const obtenerProveedorArticuloAreponner = async (_req, res) => {

  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        AND: [
          {
            proveedoresArticulo: {
              some: {
                es_predeterminado: true,
                modelo_seleccionado: "lote_fijo",
              }
            }
          },
          {
            proveedoresArticulo: {
              every: {
                ordenesCompra: {
                  none: {
                    id_estado_orden_compra: {
                      in: [estadosOC.pendiente, estadosOC.enviada]
                    }
                  }
                }
              }
            }
          }
        ]
      },

      include: {
        proveedoresArticulo: {
          where: {
            es_predeterminado: true,
            modelo_seleccionado: 'lote_fijo',
          },
          include: {
            modeloInventario: true,
            proveedor: true
          }
        }
      },
    })

    const articulosFiltrados = articulos.filter(articulo => {
      const proveedorArticulo = articulo.proveedoresArticulo.find(
        pa => pa.es_predeterminado && pa.modelo_seleccionado === 'lote_fijo'
      )
      if (!proveedorArticulo) return false

      const stock = articulo.stock
      const puntoPedido = proveedorArticulo.modeloInventario.punto_pedido

      return stock < puntoPedido
    }).map(articulo => {
      const proveedorArticulo = articulo.proveedoresArticulo.find(
        pa => pa.es_predeterminado && pa.modelo_seleccionado === 'lote_fijo'
      )
      return {
        id_articulo: articulo.id_articulo,
        descripcion: articulo.descripcion,
        stock: articulo.stock,
        punto_pedido: proveedorArticulo.modeloInventario.punto_pedido,
        proveedor: proveedorArticulo.proveedor.nombre
      }
    })

    res.status(200).json(articulosFiltrados)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener Articulos a reponer' }],
    })
  }
}