import { z } from 'zod'

export const articuloSchema = z.object({
  descripcion: z.string().min(1, { message: 'La descripción es obligatoria' }),
  demanda_articulo: z.number({ invalid_type_error: 'Debe ser un número' }).int().nonnegative({ message: 'No puede ser negativo' }),
  desviacion_est_dem: z.number({ invalid_type_error: 'Debe ser un número' }).int().nonnegative({ message: 'No puede ser negativo' }),
  costo_almacenamiento: z.number({ invalid_type_error: 'Debe ser un número' }).nonnegative({ message: 'No puede ser negativo' }),
  stock: z.number({ invalid_type_error: 'Debe ser un número' }).int().nonnegative({ message: 'No puede ser negativo' }),
  precioVenta: z.number({ invalid_type_error: 'Debe ser un número' }).nonnegative({ message: 'No puede ser negativo' }),
  inventario_maximo: z.number({ invalid_type_error: 'Debe ser un número' }).int().nonnegative({ message: 'No puede ser negativo' }),
})

export function validateArticulo(object) {
  return articuloSchema.safeParse(object)
}
