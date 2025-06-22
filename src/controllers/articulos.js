import { PrismaClient } from '@prisma/client'
import { validateArticulo } from '../validators/articulo.schema.js'
import { estadosOC, nivelServicioZ } from '../utils/constants.js'
import {
  calcularCGI,
  calcularInventarioMaximo,
  calcularLoteOptimoPuntoPedido,
  calcularStockSeguridadIF,
  calcularStockSeguridadLF,
} from '../utils/calculos.js'

const prisma = new PrismaClient()

export const crearArticulo = async (req, res) => {
  const result = validateArticulo(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const {
    descripcion,
    demanda_articulo,
    desviacion_est_dem,
    costo_almacenamiento,
    stock,
    precioVenta,
  } = result.data

  try {
    const nuevoArticulo = await prisma.articulo.create({
      data: {
        descripcion,
        demanda_articulo,
        desviacion_est_dem,
        costo_almacenamiento,
        stock,
        precioVenta,
      },
    })

    res.status(201).json(nuevoArticulo)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el artículo' }],
    })
  }
}

export const obtenerArticulos = async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      where: { fechaBaja: null },
    })
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
      where: { id_articulo: parseInt(id) },
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

export const modificarArticulo = async (req, res) => {
  const id = req.params.id
  const result = validateArticulo(req.body)

  if (!id) {
    return res.status(400).json({ error: 'Falta el id' })
  }

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  try {
    const articuloOriginal = await prisma.articulo.findUnique({
      where: { id_articulo: +id },
    })

    const articuloActualizado = await prisma.articulo.update({
      where: {
        id_articulo: +id,
      },

      data: result.data,
    })

    //Actualizo el lote_optimo por cada modelo relacionado a cada proveedorArticulo relacionado al articulo modificado
    if (
      articuloOriginal.demanda_articulo !==
        articuloActualizado.demanda_articulo ||
      articuloOriginal.costo_almacenamiento !==
        articuloActualizado.costo_almacenamiento ||
      articuloOriginal.desviacion_est_dem !==
        articuloActualizado.desviacion_est_dem
    ) {
      const proveedoresArticulos = await prisma.proveedorArticulo.findMany({
        where: {
          id_articulo: articuloActualizado.id_articulo,
          modelo_seleccionado: 'lote_fijo',
        },
        include: {
          modeloInventario: true,
        },
      })

      for (const proveedorArticulo of proveedoresArticulos) {
        const { demora_entrega, nivel_servicio } = proveedorArticulo
        const desviacion_estandar = articuloActualizado.desviacion_est_dem
        const stock_seguridad = calcularStockSeguridadLF(
          nivelServicioZ[nivel_servicio],
          desviacion_estandar,
          demora_entrega
        )
        const { Q, R } = await calcularLoteOptimoPuntoPedido(
          proveedorArticulo,
          stock_seguridad
        )

        const D = articuloActualizado.demanda_articulo
        const S = proveedorArticulo.costo_pedido
        const H = articuloActualizado.costo_almacenamiento
        const C = proveedorArticulo.precio_unitario

        // Calculo CGI
        const costo_pedido = Q === 0 ? null : (D / Q) * S

        const costo_almacenamiento = (Q / 2) * H

        const costo_compra = D * C

        const cgi = calcularCGI(
          costo_almacenamiento,
          costo_pedido,
          costo_compra
        )

        await prisma.modeloInventario.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            lote_optimo: Q,
            punto_pedido: R,
            stock_seguridad: stock_seguridad,
          },
        })

        await prisma.proveedorArticulo.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            cgi: cgi,
          },
        })
      }
    }

    if (
      articuloOriginal.demanda_articulo !==
        articuloActualizado.demanda_articulo ||
      articuloOriginal.desviacion_est_dem !==
        articuloActualizado.desviacion_est_dem ||
      articuloOriginal.costo_almacenamiento !==
        articuloActualizado.costo_almacenamiento
    ) {
      const proveedoresArticulos = await prisma.proveedorArticulo.findMany({
        where: {
          id_articulo: articuloActualizado.id_articulo,
          modelo_seleccionado: 'intervalo_fijo',
        },
        include: {
          modeloInventario: true,
        },
      })

      for (const proveedorArticulo of proveedoresArticulos) {
        const desviacion_estandar = articuloActualizado.desviacion_est_dem
        const periodo_revision =
          proveedorArticulo.modeloInventario.periodo_revision
        const demora_entrega = proveedorArticulo.demora_entrega
        const nivel_servicio = proveedorArticulo.nivel_servicio
        const demanda_diaria = articuloActualizado.demanda_articulo / 365

        const stock_seguridad = calcularStockSeguridadIF(
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          desviacion_estandar
        )

        const inventario_maximo = calcularInventarioMaximo(
          demanda_diaria,
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          desviacion_estandar
        )

        const D = articuloActualizado.demanda_articulo
        const S = proveedorArticulo.costo_pedido
        const H = articuloActualizado.costo_almacenamiento
        const C = proveedorArticulo.precio_unitario

        // Calculo CGI
        const T = periodo_revision / 365
        const costo_pedido = T === 0 ? null : (1 / T) * S

        const costo_almacenamiento = ((D * T) / 2) * H

        const costo_compra = D * C

        const cgi = calcularCGI(
          costo_almacenamiento,
          costo_pedido,
          costo_compra
        )

        await prisma.modeloInventario.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            stock_seguridad: stock_seguridad,
            inventario_maximo: inventario_maximo,
          },
        })

        await prisma.proveedorArticulo.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            cgi: cgi,
          },
        })
      }
    }

    res.json(articuloActualizado)
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025')
      return res
        .status(404)
        .json({ error: 'No se encontró un artículo con ese id' })

    res.status(500).json({ error: 'Error al actualizar el artículo' })
  }
}

export const eliminarArticulo = async (req, res) => {
  const id = parseInt(req.params.id)

  if (!id) {
    return res.status(400).json({ error: 'Falta el id' })
  }

  try {
    const articulo = await prisma.articulo.findUnique({
      where: {
        id_articulo: id,
      },
    })

    if (!articulo) {
      return res.status(404).json({ error: 'No se encontró el artículo' })
    }

    const ordenPendienteOEnviada = await prisma.ordenCompra.findFirst({
      where: {
        OR: [
          { id_estado_orden_compra: estadosOC.pendiente },
          { id_estado_orden_compra: estadosOC.enviada },
        ],
        proveedorArticulo: {
          id_articulo: +id,
        },
      },
    })

    if (ordenPendienteOEnviada) {
      return res.status(400).json({
        error:
          'No se puede eliminar el artículo porque está en una orden de compra pendiente o enviada.',
      })
    }

    if (articulo.stock > 0) {
      return res.status(400).json({
        error:
          'No se puede eliminar el artículo porque aún tiene stock disponible.',
      })
    }

    // Buscar todos los proveedoresArticulo relacionados al artículo eliminado
    const proveedoresArticulos = await prisma.proveedorArticulo.findMany({
      where: {
        id_articulo: id,
      },
    })

    // Eliminar las instancias de modeloInventario asociadas a esos proveedoresArticulo
    for (const proveedorArticulo of proveedoresArticulos) {
      await prisma.modeloInventario.deleteMany({
        where: {
          id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
        },
      })
      await prisma.proveedorArticulo.delete({
        where: {
          id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
        },
      })
    }

    const articuloEliminado = await prisma.articulo.update({
      where: {
        id_articulo: id,
      },
      data: {
        fechaBaja: new Date(),
      },
    })

    res.json(articuloEliminado)
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({ error: 'No se encontró un artículo con ese id' })
    }

    res.status(500).json({ error: 'Error al eliminar el artículo' })
  }
}

//Artículos que el stock este por debajo del punto de pedido y no tenga una orden activa
export const obtenerArticulosAreponer = async (_req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        AND: [
          {
            fechaBaja: null,
          },
          {
            proveedoresArticulo: {
              some: {
                es_predeterminado: true,
                modelo_seleccionado: 'lote_fijo',
              },
            },
          },
          {
            proveedoresArticulo: {
              every: {
                ordenesCompra: {
                  none: {
                    id_estado_orden_compra: {
                      in: [estadosOC.pendiente, estadosOC.enviada],
                    },
                  },
                },
              },
            },
          },
        ],
      },

      include: {
        proveedoresArticulo: {
          where: {
            es_predeterminado: true,
            modelo_seleccionado: 'lote_fijo',
          },
          include: {
            modeloInventario: true,
            proveedor: true,
          },
        },
      },
    })

    const articulosFiltrados = articulos
      .filter((articulo) => {
        const proveedorArticulo = articulo.proveedoresArticulo.find(
          (pa) => pa.es_predeterminado && pa.modelo_seleccionado === 'lote_fijo'
        )
        if (!proveedorArticulo) return false

        const stock = articulo.stock
        const puntoPedido = proveedorArticulo.modeloInventario.punto_pedido

        return stock < puntoPedido
      })
      .map((articulo) => {
        const proveedorArticulo = articulo.proveedoresArticulo.find(
          (pa) => pa.es_predeterminado && pa.modelo_seleccionado === 'lote_fijo'
        )
        return {
          id_articulo: articulo.id_articulo,
          descripcion: articulo.descripcion,
          stock: articulo.stock,
          punto_pedido: proveedorArticulo.modeloInventario.punto_pedido,
          proveedor_predeterminado: proveedorArticulo.proveedor.nombre,
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

//Artículos que el stock este por debajo del punto de pedido y no tenga una orden activa
export const obtenerArticulosFaltantes = async (_req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        AND: [
          {
            fechaBaja: null,
          },
          {
            proveedoresArticulo: {
              some: {
                es_predeterminado: true,
              },
            },
          },
          {
            proveedoresArticulo: {
              every: {
                ordenesCompra: {
                  none: {
                    id_estado_orden_compra: {
                      in: [estadosOC.pendiente, estadosOC.enviada],
                    },
                  },
                },
              },
            },
          },
        ],
      },

      include: {
        proveedoresArticulo: {
          where: {
            es_predeterminado: true,
          },
          include: {
            modeloInventario: true,
            proveedor: true,
          },
        },
      },
    })

    const articulosFiltrados = articulos
      .filter((articulo) => {
        const proveedorArticulo = articulo.proveedoresArticulo.find(
          (pa) => pa.es_predeterminado
        )
        if (!proveedorArticulo) return false

        const stock = articulo.stock
        const stock_seguridad =
          proveedorArticulo.modeloInventario.stock_seguridad

        return stock < stock_seguridad
      })
      .map((articulo) => {
        const proveedorArticulo = articulo.proveedoresArticulo.find(
          (pa) => pa.es_predeterminado
        )
        return {
          id_articulo: articulo.id_articulo,
          descripcion: articulo.descripcion,
          stock: articulo.stock,
          stock_seguridad: proveedorArticulo.modeloInventario.stock_seguridad,
          proveedor_predeterminado: proveedorArticulo.proveedor.nombre,
        }
      })

    res.status(200).json(articulosFiltrados)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener Articulos faltantes' }],
    })
  }
}
