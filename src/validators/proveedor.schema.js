import { z } from 'zod'

export const proveedorSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es obligatorio' }),
  apellido: z.string().min(1, { message: 'El apellido es obligatorio' }),
  email: z.string().email({ message: 'El email no es válido' }),
  telefono: z.string().optional(),
  articulos: z.array(
    z.object({
      id_articulo: z
        .number()
        .int({ message: 'El ID del artículo debe ser un número entero' }),
      precio_unitario: z
        .number()
        .positive({ message: 'El precio debe ser un número positivo' }),
      demora_entrega: z
        .number()
        .int({ message: 'La demora de entrega debe ser un número entero' }),
      costo_pedido: z.number(),
      modelo_seleccionado: z.string(),
      es_predeterminado: z.boolean(),
      periodo_revision: z
        .number()
        .int()
        .nonnegative({
          message:
            'El periodo de revisión debe ser un número entero no negativo',
        })
        .optional()
        .nullable(),
      nivel_servicio: z
        .number()
        .nonnegative({
          message: 'El nivel de servicio debe ser un número no negativo',
        }),
    })
  ),
})

export function validateProveedor(object) {
  return proveedorSchema.safeParse(object)
}
