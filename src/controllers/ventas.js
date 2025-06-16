import { PrismaClient } from "@prisma/client";
import { validateVentaInput } from "../validators/venta.schema.js";
import { estadosOC } from "../utils/constants.js";

const prisma = new PrismaClient()

export const crearVenta = async (req, res) => {
    const result = validateVentaInput(req.body)

    if (result.error) {
        return res.status(400).json({ error: result.error.issues })
    }

    try {
        const { items } = result.data
        const detalles = []
        for (const item of items) {
            const articulo = await prisma.articulo.findUnique({ where: { id_articulo: item.articuloId } })

            if (!articulo) {
                return res.status(400).json({ error: `No existe articulo con id: ${item.articuloId}` })
            }

            if (articulo.stock < item.cantidad) {
                return res.status(400).json({ error: `Stock insuficiente para articulo con id: ${item.articuloId}` });
            }

            detalles.push({
                cantidad: item.cantidad,
                totalDetalle: item.cantidad * articulo.precioVenta,
                articuloId: item.articuloId
            })
        }

        const montoTotal = detalles.reduce((acc, detalle) => acc + detalle.totalDetalle, 0)

        const nuevaVenta = await prisma.$transaction(async (tx) => {

            //Crear venta
            const nuevaVenta = await tx.venta.create({
                data: {
                    fechaVenta: new Date(),
                    montoTotal,
                    detalles: {
                        create: detalles.map(detalle => ({
                            cantidad: detalle.cantidad,
                            totalDetalle: detalle.totalDetalle,
                            articulo: {
                                connect: { id_articulo: detalle.articuloId }
                            }
                        }))

                    }
                },
                include: {
                    detalles: true
                }
            })

            //Modificar stock de los articulos

            const { pendiente, enviada } = estadosOC
            for (const detalle of detalles) {
                const articulo = await tx.articulo.update({
                    where: {
                        id_articulo: detalle.articuloId
                    },
                    data: {
                        stock: { decrement: detalle.cantidad }
                    }
                })

                const proveedorArticuloPredeterminado = await tx.proveedorArticulo.findFirst({
                    where: {
                        id_articulo: articulo.id_articulo,
                        es_predeterminado: true
                    },
                    include: {
                        modeloInventario: true
                    }
                })

                if (proveedorArticuloPredeterminado && proveedorArticuloPredeterminado.modelo_seleccionado === "lote_fijo") {
                    const ordenesCompra = await tx.ordenCompra.findMany({
                        where: {
                            proveedorArticulo: {
                                id_articulo: articulo.id_articulo
                            },
                            estadoOrdenCompra: {
                                id_estado_orden_compra: {
                                    in: [pendiente, enviada]
                                }
                            }
                        }
                    })

                    // Si ya hay una orden de compra pendiente o enviada o no se llega al punto de pedido, no se crea una nueva orden de compra
                    if (ordenesCompra.length > 0 || articulo.stock > proveedorArticuloPredeterminado.modeloInventario.punto_pedido) continue
                        
                    

                    const fechaEntrega = new Date(Date.now() + proveedorArticuloPredeterminado.demora_entrega * 24 * 60 * 60 * 1000)
                    const cantidad = proveedorArticuloPredeterminado.modeloInventario.lote_optimo
                    const monto_total = proveedorArticuloPredeterminado.precio_unitario * cantidad
                    await tx.ordenCompra.create({
                        data: {
                            cantidad,
                            monto_total,
                            fecha_estimada_recepcion: fechaEntrega,
                            id_proveedor_articulo: proveedorArticuloPredeterminado.id_proveedor_articulo,
                            id_estado_orden_compra: pendiente //Se me crea con estado pendiente por defecto
                        }
                    })
                }
            }

            return nuevaVenta
        })



        res.status(201).json(nuevaVenta)


    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Error al crear la venta" })
    }
}

export const obtenerVentas = async (_req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            include: {
                detalles: {
                    include: {
                        articulo: {
                            select: {
                                descripcion: true
                            }
                        }
                    }
                }
            }
        })

        res.status(200).json(ventas)

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Error al obtener ventas" })
    }
}