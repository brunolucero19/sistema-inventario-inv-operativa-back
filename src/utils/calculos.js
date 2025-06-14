import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const calcularLoteOptimoPuntoPedido = async (proveedorArticulo) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id_articulo: proveedorArticulo.id_articulo },
  })

  //Calcular el lote óptimo (EOQ)
  const D = articulo.demanda_articulo
  const S = proveedorArticulo.costo_pedido
  const H = articulo.costo_almacenamiento

  const Q = Math.round(Math.sqrt((2 * D * S) / H))

  //Calcular el punto de pedido
  const L = proveedorArticulo.demora_entrega
  const d = articulo.demanda_articulo / 365 // Demanda diaria asumiendo 365 días al año

  const R = Math.round(d * L) // Punto de pedido
  return { Q, R }
}

export const calcularCostoCompra = (precio_unitario, demanda_anual) => {
  const costo_compra = precio_unitario * demanda_anual
  return costo_compra
}

export const calcularCGI = (
  costo_almacenamiento,
  costo_pedido,
  costo_compra
) => {
  const cgi = costo_almacenamiento + costo_pedido + costo_compra
  return cgi
}

export const calcularStockSeguridad = (z, desviacionEstDem) => {
  const stock_seguridad = z * desviacionEstDem
  return stock_seguridad
}