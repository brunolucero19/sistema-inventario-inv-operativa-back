import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { estadosOC, nivelServicioZ } from '../utils/constants.js'
import { calcularStockAReponer } from '../utils/calculos.js'

const prisma = new PrismaClient()

export const iniciarCronIntervaloFijo = (revisionHora) => {
    cron.schedule(revisionHora, async () => {
    console.log('Ejecutando revisión de inventario por modelo de intervalo fijo')

    const articulos = await prisma.proveedorArticulo.findMany({
        where: {
        es_predeterminado: true,
        modelo_seleccionado: 'intervalo_fijo',
        modeloInventario: {
            NOT: {
            periodo_revision: null
            }
        }
        },
        include: {
        modeloInventario: true,
        articulo: true,
        },
    })

    const hoy = new Date()

    for (const pa of articulos) {
        const { fecha_ultima_revision, periodo_revision } = pa.modeloInventario

        const proximaRevision = new Date(fecha_ultima_revision)
        proximaRevision.setDate(proximaRevision.getDate() + periodo_revision)

        if (hoy >= proximaRevision) {
        const { demanda_articulo, desviacion_est_dem, stock } = pa.articulo

        if (demanda_articulo == null || desviacion_est_dem == null || stock == null) {
            console.warn(`Artículo ${pa.articulo.descripcion} tiene valores faltantes. Se omite.`);
            continue;
        }

        const demanda_diaria = demanda_articulo / 365
        
        const cantidadAReponer = Math.max(0, calcularStockAReponer(demanda_diaria, periodo_revision, pa.demora_entrega, nivelServicioZ[pa.nivel_servicio], desviacion_est_dem, stock));
        console.log('cantidad a reponer', calcularStockAReponer(demanda_diaria, periodo_revision, pa.demora_entrega, nivelServicioZ[pa.nivel_servicio], desviacion_est_dem, stock))
        console.log(`[${hoy.toISOString()}] Artículo: ${pa.articulo.descripcion} - Reposición: ${cantidadAReponer} uds (Stock actual: ${stock}, Demanda diaria: ${demanda_diaria.toFixed(2)})`);

        if (cantidadAReponer > 0) {
            const monto_total = pa.costo_pedido + cantidadAReponer * pa.precio_unitario;

            await prisma.ordenCompra.create({
                data: {
                cantidad: Math.ceil(cantidadAReponer),
                monto_total,
                fecha_estimada_recepcion: new Date(hoy.getTime() + (pa.demora_entrega * 24 * 60 * 60 * 1000)),
                id_proveedor_articulo: pa.id_proveedor_articulo,
                id_estado_orden_compra: estadosOC.pendiente
                }
            });

            console.log(`Orden de compra generada para el artículo "${pa.articulo.descripcion}" por ${Math.ceil(cantidadAReponer)} unidades`);
        } else {
            console.log(`No se genera orden para "${pa.articulo.descripcion}" (cantidad calculada: ${cantidadAReponer})`);
        }

        // Actualizar fecha_ultima_revision
        await prisma.modeloInventario.update({
            where: {
            id_modelo_inventario: pa.modeloInventario.id_modelo_inventario
            },
            data: {
            fecha_ultima_revision: hoy
            }
        })
        }
    }
    })
}