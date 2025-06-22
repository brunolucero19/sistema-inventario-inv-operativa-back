import { PrismaClient } from '@prisma/client'
import { validateProveedorArticulo } from '../validators/proveedorArticulo.schema.js'
import {
  calcularLoteOptimoPuntoPedido,
  calcularStockSeguridadLF,
  calcularStockSeguridadIF,
  calcularInventarioMaximo,
  calcularCostoCompra,
  calcularCGI,
  redondearA2Decimales,
} from '../utils/calculos.js'
import { nivelServicioZ } from '../utils/constants.js'

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

  let es_proveedor_predeterminado = es_predeterminado

  try {
    // Crear relación proveedor-artículo
    const articulo = await prisma.articulo.findUnique({
      where: { id_articulo },
    })

    // Buscar si existe un proveedor-articulo para ese artículo, si no existe, debe ser el predeterminado automáticamente
    const proveedorArticuloExistente = await prisma.proveedorArticulo.findFirst(
      {
        where: {
          id_articulo,
          es_predeterminado: true,
        },
      }
    )
    let predeterminado_por_defecto = false
    if (!proveedorArticuloExistente) {
      es_proveedor_predeterminado = true
      predeterminado_por_defecto = true
    }

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
        es_predeterminado: es_proveedor_predeterminado,
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

    const D = nuevoProveedorArticulo.articulo.demanda_articulo
    const S = nuevoProveedorArticulo.costo_pedido
    const H = nuevoProveedorArticulo.articulo.costo_almacenamiento

    //Calculo de lote optimo si el modelo es de lote fijo
    if (modelo_seleccionado === 'lote_fijo') {
      // Calculo Stock Seguridad
      const stock_seguridad = calcularStockSeguridadLF(
        nivelServicioZ[nivel_servicio],
        nuevoProveedorArticulo.articulo.desviacion_est_dem,
        demora_entrega
      )

      // Calculo Lote Optimo y Punto de Pedido
      const { Q, R } = await calcularLoteOptimoPuntoPedido(
        nuevoProveedorArticulo,
        stock_seguridad
      )
      // Calculo CGI
      const costo_pedido = Q === 0 ? null : (D / Q) * S

      const costo_almacenamiento = (Q / 2) * H

      cgi = calcularCGI(costo_almacenamiento, costo_pedido, costo_compra)

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
      const T = periodo_revision / 365
      const costo_pedido = T === 0 ? null : (1 / T) * S

      const costo_almacenamiento = ((D * T) / 2) * H

      cgi = calcularCGI(costo_almacenamiento, costo_pedido, costo_compra)

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

    res.status(201).json({
      message: `Proveedor-artículo ${nuevoProveedorArticulo.id_proveedor_articulo} creado correctamente.`,
      proveedorArticulo: nuevoProveedorArticulo,
      predeterminado_por_defecto,
    })
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
        modeloInventario: true,
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
          articulo: true,
          modeloInventario: true,
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
    const costo_compra =
      proveedorArticuloExistente.articulo.demanda_articulo * precio_unitario
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
        modeloInventario: true,
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

    let cgi = proveedorArticuloActualizado.cgi

    const D = proveedorArticuloActualizado.articulo.demanda_articulo
    const H = proveedorArticuloActualizado.articulo.costo_almacenamiento
    const S = proveedorArticuloActualizado.costo_pedido

    //Calculo de lote optimo si el modelo es de lote fijo
    if (modelo_seleccionado === 'lote_fijo') {
      if (
        proveedorArticuloExistente.nivel_servicio !==
          proveedorArticuloActualizado.nivel_servicio ||
        proveedorArticuloExistente.demora_entrega !==
          proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.costo_pedido !==
          proveedorArticuloActualizado.costo_pedido ||
        proveedorArticuloExistente.modelo_seleccionado !==
          proveedorArticuloActualizado.modelo_seleccionado
      ) {
        modeloInventarioUpdated.stock_seguridad = calcularStockSeguridadLF(
          nivelServicioZ[nivel_servicio],
          proveedorArticuloActualizado.articulo.desviacion_est_dem,
          demora_entrega
        )

        const { Q, R } = await calcularLoteOptimoPuntoPedido(
          proveedorArticuloActualizado,
          modeloInventarioUpdated.stock_seguridad
        )
        modeloInventarioUpdated.lote_optimo = Q
        modeloInventarioUpdated.punto_pedido = R

        // Calculo CGI
        const costo_pedido = Q === 0 ? null : (D / Q) * S

        const costo_almacenamiento = (Q / 2) * H

        cgi = calcularCGI(costo_almacenamiento, costo_pedido, costo_compra)
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
        proveedorArticuloExistente.modeloInventario.periodo_revision !==
          proveedorArticuloActualizado.modeloInventario.periodo_revision ||
        proveedorArticuloExistente.demora_entrega !==
          proveedorArticuloActualizado.demora_entrega ||
        proveedorArticuloExistente.nivel_servicio !==
          proveedorArticuloActualizado.nivel_servicio ||
        proveedorArticuloExistente.modelo_seleccionado !==
          proveedorArticuloActualizado.modelo_seleccionado
      ) {
        const desviacion_estandar =
          proveedorArticuloActualizado.articulo.desviacion_est_dem

        modeloInventarioUpdated.stock_seguridad = calcularStockSeguridadIF(
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          desviacion_estandar
        )
        const demanda_diaria =
          proveedorArticuloActualizado.articulo.demanda_articulo / 365

        modeloInventarioUpdated.inventario_maximo = calcularInventarioMaximo(
          demanda_diaria,
          periodo_revision,
          demora_entrega,
          nivelServicioZ[nivel_servicio],
          proveedorArticuloActualizado.articulo.desviacion_est_dem
        )

        // Calculo CGI
        const T = proveedorArticuloActualizado.periodo_revision / 365
        const costo_pedido = T === 0 ? null : (1 / T) * S

        const costo_almacenamiento = ((D * T) / 2) * H

        cgi = calcularCGI(costo_almacenamiento, costo_pedido, costo_compra)
      }

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

    // Se actualiza el CGI
    await prisma.proveedorArticulo.update({
      where: {
        id_proveedor_articulo:
          proveedorArticuloActualizado.id_proveedor_articulo,
      },
      data: {
        cgi: cgi,
      },
    })

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
        articulo: {
          fechaBaja: null,
        },
      },
      select: {
        precio_unitario: true,
        costo_pedido: true,
        cgi: true,
        modelo_seleccionado: true,
        proveedor: {
          select: {
            nombre: true,
          },
        },
        articulo: {
          select: {
            demanda_articulo: true,
            costo_almacenamiento: true,
          },
        },
        modeloInventario: {
          select: {
            lote_optimo: true,
            periodo_revision: true,
          },
        },
      },
    })

    const resultados = data.map((pa) => {
      const D = pa.articulo.demanda_articulo
      const H = pa.articulo.costo_almacenamiento
      const C = pa.precio_unitario
      const S = pa.costo_pedido

      const costo_compra = D * C

      let costo_pedido = 0
      let costo_almacenamiento = 0

      if (pa.modelo_seleccionado === 'lote_fijo') {
        const Q = pa.modeloInventario.lote_optimo
        costo_pedido = Q === 0 ? null : (D / Q) * S
        costo_almacenamiento = (Q / 2) * H
      } else if (pa.modelo_seleccionado === 'intervalo_fijo') {
        const T = pa.modeloInventario.periodo_revision / 365
        costo_pedido = T === 0 ? null : (1 / T) * S
        costo_almacenamiento = ((D * T) / 2) * H
      }

      const cgi = costo_compra + costo_pedido + costo_almacenamiento

      return {
        proveedor: pa.proveedor.nombre,
        costo_compra: redondearA2Decimales(costo_compra),
        costo_pedido: redondearA2Decimales(costo_pedido),
        costo_almacenamiento: redondearA2Decimales(costo_almacenamiento),
        cgi: redondearA2Decimales(cgi),
      }
    })

    res.status(200).json(resultados)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al obtener CGI por articulo' }],
    })
  }
}
