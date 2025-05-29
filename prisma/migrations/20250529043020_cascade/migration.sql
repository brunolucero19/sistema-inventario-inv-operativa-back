/*
  Warnings:

  - A unique constraint covering the columns `[id_proveedor,id_articulo]` on the table `ProveedorArticulo` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ProveedorArticulo" DROP CONSTRAINT "ProveedorArticulo_id_articulo_fkey";

-- DropForeignKey
ALTER TABLE "ProveedorArticulo" DROP CONSTRAINT "ProveedorArticulo_id_proveedor_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "ProveedorArticulo_id_proveedor_id_articulo_key" ON "ProveedorArticulo"("id_proveedor", "id_articulo");

-- AddForeignKey
ALTER TABLE "ProveedorArticulo" ADD CONSTRAINT "ProveedorArticulo_id_articulo_fkey" FOREIGN KEY ("id_articulo") REFERENCES "Articulos"("id_articulo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorArticulo" ADD CONSTRAINT "ProveedorArticulo_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "Proveedores"("id_proveedor") ON DELETE CASCADE ON UPDATE CASCADE;
