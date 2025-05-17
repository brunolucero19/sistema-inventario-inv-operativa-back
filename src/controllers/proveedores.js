import { PrismaClient } from '@prisma/client'
import { validateProveedor } from '../validators/proveedor.schema.js'

const prisma = new PrismaClient()

export const crearProveedor = async (req, res) => {
  const result = validateProveedor(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const { nombre, email, telefono } = result.data

  try {
    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        nombre,
        email,
        telefono,
      },
    })

    res.status(201).json(nuevoProveedor)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está en uso.' })
    }
    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el proveedor' }],
    })
  }
}
