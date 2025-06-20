import { PrismaClient } from '@prisma/client'
import { validateArticulo } from '../validators/articulo.schema.js'
import { estadosOC, nivelServicioZ } from '../utils/constants.js'
import { calcularInventarioMaximo, calcularStockSeguridadIF, calcularStockSeguridadLF } from '../utils/calculos.js'

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
    precioVenta
  } = result.data

  try {
    const nuevoArticulo = await prisma.articulo.create({
      data: {
        descripcion,
        demanda_articulo,
        desviacion_est_dem,
        costo_almacenamiento,
        stock,
        precioVenta
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
      where: { id_articulo: +id }
    })

    const articuloActualizado = await prisma.articulo.update({
      where: {
        id_articulo: +id,
      },

      data: result.data,
    })

    //Actualizo el lote_optimo por cada modelo relacionado a cada proveedorArticulo relacionado al articulo modificado
    if (articuloOriginal.demanda_articulo !== articuloActualizado.demanda_articulo ||
      articuloOriginal.costo_almacenamiento !== articuloActualizado.costo_almacenamiento) {
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
        
        const desviacion_estandar = articuloActualizado.desviacion_est_dem;
        const nivel_servicio = proveedorArticulo.nivel_servicio;
        const demora_entrega = proveedorArticulo.demora_entrega;

        const stock_seguridad = calcularStockSeguridadLF(nivelServicioZ[nivel_servicio], desviacion_estandar, demora_entrega);

        const D = articuloActualizado.demanda_articulo
        const S = proveedorArticulo.costo_pedido
        const H = articuloActualizado.costo_almacenamiento

        const Q = Math.round(Math.sqrt((2 * D * S) / H))

        await prisma.modeloInventario.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            lote_optimo: Q,
            stock_seguridad: stock_seguridad
          },
        })
      }
    }

    if (articuloOriginal.demanda_articulo !== articuloActualizado.demanda_articulo ||
      articuloOriginal.desviacion_est_dem !== articuloActualizado.desviacion_est_dem) {
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
        const periodo_revision = proveedorArticulo.modeloInventario.periodo_revision
        const demora_entrega = proveedorArticulo.demora_entrega
        const nivel_servicio = proveedorArticulo.nivel_servicio
        const demanda_diaria = articuloActualizado.demanda_articulo / 365;

        const stock_seguridad = calcularStockSeguridadIF(periodo_revision, demora_entrega, nivelServicioZ[nivel_servicio], desviacion_estandar);

        const inventario_maximo = calcularInventarioMaximo(demanda_diaria, periodo_revision, demora_entrega, nivelServicioZ[nivel_servicio], desviacion_estandar);

        await prisma.modeloInventario.update({
          where: {
            id_proveedor_articulo: proveedorArticulo.id_proveedor_articulo,
          },
          data: {
            stock_seguridad: stock_seguridad,
            inventario_maximo: inventario_maximo
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
        or: [
          { id_estado_orden_compra: estadosOC.pendiente },
          { id_estado_orden_compra: estadosOC.enviada },
        ],
        proveedorArticulo: {
          id_articulo: +id,
        },
      },
    })

    if (ordenPendiente) {
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
