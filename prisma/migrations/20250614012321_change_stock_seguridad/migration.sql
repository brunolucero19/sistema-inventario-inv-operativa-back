/*
  Warnings:

  - You are about to drop the column `stock_seguridad` on the `Articulos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Articulos" DROP COLUMN "stock_seguridad";

-- AlterTable
ALTER TABLE "ProveedorArticulo" ADD COLUMN     "stock_seguridad" INTEGER NOT NULL DEFAULT 0;
