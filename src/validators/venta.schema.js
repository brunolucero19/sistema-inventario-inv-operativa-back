import { z } from "zod";

export const itemVentaSchema = z.object({
    articuloId: z.number().int().positive({ message: 'ID inválido' }),
    cantidad: z.number().int().positive({ message: 'Cantidad debe ser mayor a cero' })
})

export const ventaSchema = z.object({
    items: z.array(itemVentaSchema).min(1, { message: 'Debe haber al menos un artículo' })
})

export function validateVentaInput(input) {
  return ventaSchema.safeParse(input)
}