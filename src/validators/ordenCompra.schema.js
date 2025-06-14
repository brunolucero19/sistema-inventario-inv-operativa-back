import { z } from 'zod'

export const ordenCompraSchema = z.object({
  id_proveedor_articulo: z.number({ invalid_type_error: 'Debe ser un número' })
    .int()
    .positive({ message: 'ID de proveedor-artículo inválido' }),

  cantidad: z.number({ invalid_type_error: 'Debe ser un número' })
    .int()
    .positive({ message: 'La cantidad debe ser mayor a 0' })
})

export function validateOrdenCompra(data) {
  return ordenCompraSchema.safeParse(data)
}
