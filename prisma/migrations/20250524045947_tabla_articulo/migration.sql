/*
  Warnings:

  - Added the required column `cgi` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costo_almacenamiento` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `demanda_articulo` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcion` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventario_maximo` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precioVenta` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock` to the `Articulos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock_seguridad` to the `Articulos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Articulos" ADD COLUMN     "cgi" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "costo_almacenamiento" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "demanda_articulo" INTEGER NOT NULL,
ADD COLUMN     "descripcion" TEXT NOT NULL,
ADD COLUMN     "fechaBaja" TIMESTAMP(3),
ADD COLUMN     "inventario_maximo" INTEGER NOT NULL,
ADD COLUMN     "precioVenta" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "stock" INTEGER NOT NULL,
ADD COLUMN     "stock_seguridad" INTEGER NOT NULL;
