/*
  Warnings:

  - You are about to drop the column `stock_seguridad` on the `ProveedorArticulo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ModeloInventario" ADD COLUMN     "stock_seguridad" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProveedorArticulo" DROP COLUMN "stock_seguridad";
