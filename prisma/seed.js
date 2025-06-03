import { PrismaClient } from '@prisma/client'
import { estadosOC } from '../src/utils/constants.js'
const prisma = new PrismaClient()

async function main() {
 
    for (const estado in estadosOC){
        const id = estadosOC[estado]
        await prisma.estadoOrdenCompra.upsert({
            where: {
                id_estado_orden_compra: id
            },
            update: {
                nombre_eoc: estado
            },
            create: {
                id_estado_orden_compra: id,
                nombre_eoc: estado
            }
        })
    }

  console.log('Estados creados correctamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
