/*
  Warnings:

  - You are about to drop the column `inventario_maximo` on the `Articulos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Articulos" DROP COLUMN "inventario_maximo";

-- AlterTable
ALTER TABLE "ModeloInventario" ADD COLUMN     "inventario_maximo" INTEGER NOT NULL DEFAULT 0;
