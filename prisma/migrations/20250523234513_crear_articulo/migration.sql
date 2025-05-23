/*
  Warnings:

  - The primary key for the `Proveedores` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Proveedores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Proveedores" DROP CONSTRAINT "Proveedores_pkey",
DROP COLUMN "id",
ADD COLUMN     "id_proveedor" SERIAL NOT NULL,
ADD CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("id_proveedor");

-- CreateTable
CREATE TABLE "Articulos" (
    "id_articulo" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Articulos_pkey" PRIMARY KEY ("id_articulo")
);
