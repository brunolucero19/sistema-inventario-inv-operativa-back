import { z } from 'zod'

export const proveedorSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es obligatorio' }),
  apellido: z.string().min(1, { message: 'El apellido es obligatorio' }),
  email: z.string().email({ message: 'El email no es válido' }),
  telefono: z.string().optional(),
})

export function validateProveedor(object) {
  return proveedorSchema.safeParse(object)
}
