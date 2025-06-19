import { z } from 'zod'

export const proveedorArticuloSchema = z.object({
  id_proveedor: z.number().int().positive({
    message: 'El ID del proveedor debe ser un número entero positivo',
  }),
  id_articulo: z.number().int().positive({
    message: 'El ID del artículo debe ser un número entero positivo',
  }),
  costo_pedido: z
    .number()
    .nonnegative({ message: 'El costo pedido debe ser un número no negativo' }),
  precio_unitario: z
    .number()
    .positive({ message: 'El precio unitario debe ser un número positivo' }),
  demora_entrega: z.number().int().nonnegative({
    message: 'La demora de entrega debe ser un número entero no negativo',
  }),
  cgi: z.number().optional(),
  nivel_servicio: z.number().nonnegative({ message: 'El nivel de servicio debe ser un número no negativo' }),
  modelo_seleccionado: z.string(),
  es_predeterminado: z.boolean(),
  periodo_revision: z
    .number()
    .int()
    .nonnegative({
      message: 'El periodo de revisión debe ser un número entero no negativo',
    })
    .optional(),
})

export function validateProveedorArticulo(data) {
  return proveedorArticuloSchema.safeParse(data)
}
