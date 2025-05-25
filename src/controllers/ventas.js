import { PrismaClient } from "@prisma/client";
import { validateVentaInput } from "../validators/venta.schema.js";

const prisma = new PrismaClient()

export const crearVenta = async (req, res) => {
    const result = validateVentaInput(req.body)

    if (result.error) {
        return res.status(400).json({ error: result.error.issues })
    }

    try{
        const {items} = result.data
        const detalles = []
        for (const item of items) {
            const articulo = await prisma.articulo.findUnique({where: {id_articulo : item.articuloId}})

            if(!articulo){
                return res.status(400).json({error: `No existe articulo con id: ${item.articuloId}`})
            } 

            if(articulo.stock < item.cantidad){
                return res.status(400).json({ error: `Stock insuficiente para articulo con id: ${item.articuloId}` });
            }

            detalles.push({
                cantidad: item.cantidad,
                totalDetalle: item.cantidad * articulo.precioVenta,
                articuloId: item.articuloId
            })
        }

        const montoTotal = detalles.reduce((acc, detalle) => acc + detalle.totalDetalle, 0)

        const nuevaVenta = await prisma.venta.create({
            data:{
                fechaVenta: new Date(),
                montoTotal,
                detalles:{
                    create: detalles.map(detalle => ({
                        cantidad: detalle.cantidad,
                        totalDetalle: detalle.totalDetalle,
                        articulo: {
                            connect: {id_articulo: detalle.articuloId}
                        }
                    }))
                    
                }
            },
            include:{
                detalles: true
            }
        })

        res.status(201).json(nuevaVenta)


    }catch(error){
        console.log(error)
        res.status(500).json({error: "Error al crear la venta"})
    }
}