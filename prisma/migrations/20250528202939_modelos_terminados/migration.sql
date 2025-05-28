/*
  Warnings:

  - You are about to drop the column `cgi` on the `Articulos` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `Articulos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Articulos" DROP COLUMN "cgi",
DROP COLUMN "nombre";

-- AlterTable
ALTER TABLE "Ventas" ALTER COLUMN "fechaVenta" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "OrdenesCompra" (
    "id_orden_compra" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "monto_total" DOUBLE PRECISION NOT NULL,
    "fecha_estimada_recepcion" TIMESTAMP(3),
    "fecha_real_recepcion" TIMESTAMP(3),
    "id_proveedor_articulo" INTEGER NOT NULL,
    "id_estado_orden_compra" INTEGER NOT NULL,

    CONSTRAINT "OrdenesCompra_pkey" PRIMARY KEY ("id_orden_compra")
);

-- CreateTable
CREATE TABLE "EstadosOrdenCompra" (
    "id_estado_orden_compra" SERIAL NOT NULL,
    "nombre_eoc" TEXT NOT NULL,

    CONSTRAINT "EstadosOrdenCompra_pkey" PRIMARY KEY ("id_estado_orden_compra")
);

-- CreateTable
CREATE TABLE "ProveedorArticulo" (
    "id_proveedor_articulo" SERIAL NOT NULL,
    "costo_pedido" DOUBLE PRECISION NOT NULL,
    "costo_compra" DOUBLE PRECISION NOT NULL,
    "precio_unitario" DOUBLE PRECISION NOT NULL,
    "demora_entrega" INTEGER NOT NULL,
    "cgi" DOUBLE PRECISION,
    "modelo_seleccionado" TEXT NOT NULL,
    "id_articulo" INTEGER NOT NULL,
    "id_proveedor" INTEGER NOT NULL,

    CONSTRAINT "ProveedorArticulo_pkey" PRIMARY KEY ("id_proveedor_articulo")
);

-- CreateTable
CREATE TABLE "ModeloInventario" (
    "id_modelo_inventario" SERIAL NOT NULL,
    "lote_optimo" INTEGER,
    "punto_pedido" INTEGER,
    "id_proveedor_articulo" INTEGER NOT NULL,

    CONSTRAINT "ModeloInventario_pkey" PRIMARY KEY ("id_modelo_inventario")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModeloInventario_id_proveedor_articulo_key" ON "ModeloInventario"("id_proveedor_articulo");

-- AddForeignKey
ALTER TABLE "OrdenesCompra" ADD CONSTRAINT "OrdenesCompra_id_proveedor_articulo_fkey" FOREIGN KEY ("id_proveedor_articulo") REFERENCES "ProveedorArticulo"("id_proveedor_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenesCompra" ADD CONSTRAINT "OrdenesCompra_id_estado_orden_compra_fkey" FOREIGN KEY ("id_estado_orden_compra") REFERENCES "EstadosOrdenCompra"("id_estado_orden_compra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorArticulo" ADD CONSTRAINT "ProveedorArticulo_id_articulo_fkey" FOREIGN KEY ("id_articulo") REFERENCES "Articulos"("id_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorArticulo" ADD CONSTRAINT "ProveedorArticulo_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "Proveedores"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloInventario" ADD CONSTRAINT "ModeloInventario_id_proveedor_articulo_fkey" FOREIGN KEY ("id_proveedor_articulo") REFERENCES "ProveedorArticulo"("id_proveedor_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;
