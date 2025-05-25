/*
  Warnings:

  - The primary key for the `DetallesVenta` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `articuloId` on the `DetallesVenta` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `DetallesVenta` table. All the data in the column will be lost.
  - You are about to drop the column `ventaId` on the `DetallesVenta` table. All the data in the column will be lost.
  - Added the required column `id_articulo` to the `DetallesVenta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_venta` to the `DetallesVenta` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DetallesVenta" DROP CONSTRAINT "DetallesVenta_articuloId_fkey";

-- DropForeignKey
ALTER TABLE "DetallesVenta" DROP CONSTRAINT "DetallesVenta_ventaId_fkey";

-- AlterTable
ALTER TABLE "DetallesVenta" DROP CONSTRAINT "DetallesVenta_pkey",
DROP COLUMN "articuloId",
DROP COLUMN "id",
DROP COLUMN "ventaId",
ADD COLUMN     "id_articulo" INTEGER NOT NULL,
ADD COLUMN     "id_detalleVenta" SERIAL NOT NULL,
ADD COLUMN     "id_venta" INTEGER NOT NULL,
ADD CONSTRAINT "DetallesVenta_pkey" PRIMARY KEY ("id_detalleVenta");

-- AddForeignKey
ALTER TABLE "DetallesVenta" ADD CONSTRAINT "DetallesVenta_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "Ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallesVenta" ADD CONSTRAINT "DetallesVenta_id_articulo_fkey" FOREIGN KEY ("id_articulo") REFERENCES "Articulos"("id_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;
