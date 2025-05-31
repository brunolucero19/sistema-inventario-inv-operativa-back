import { PrismaClient } from '@prisma/client'
import { validateProveedorArticulo } from '../validators/proveedorArticulo.schema.js'

const prisma = new PrismaClient()

//POST
export const crearProveedorArticulo = async (req, res) => {
  const result = validateProveedorArticulo(req.body)

  if (result.error) {
    return res.status(400).json({ error: result.error.issues })
  }

  const { id_proveedor, id_articulo, costo_pedido, costo_compra, precio_unitario, demora_entrega, cgi, modelo_seleccionado } = result.data

  try {
    const nuevoProveedorArticulo = await prisma.proveedorArticulo.create({
      data: {
        id_proveedor,
        id_articulo,
        costo_pedido,
        costo_compra,
        precio_unitario,
        demora_entrega,
        cgi,
        modelo_seleccionado,
      },
    })

    res.status(201).json(nuevoProveedorArticulo)
  } catch (error) {

    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El proveedor ya está asociado a ese artículo.' })
    }

    console.error(error)
    res.status(500).json({
      error: [{ message: 'Error al crear el proveedor-artículo' }],
    })
    
  }
}

//Todos los proveedores por aritculo 
export const obtenerProveedoresPorArticulo = async (req, res) => {
  const idArticulo = req.params.id;

  try {
    const resultados = await prisma.proveedorArticulo.findMany({
      where: { id_articulo: +idArticulo },
      include: {
        proveedor: true,
        articulo: true
      }
    });

    res.status(200).json(resultados);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: [{ message: 'Error al obtener proveedores por artículo' }],
    });
  }
};

