-- CreateTable
CREATE TABLE "Ventas" (
    "id_venta" SERIAL NOT NULL,
    "fechaVenta" TIMESTAMP(3) NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Ventas_pkey" PRIMARY KEY ("id_venta")
);

-- CreateTable
CREATE TABLE "DetallesVenta" (
    "id" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "totalDetalle" DOUBLE PRECISION NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "articuloId" INTEGER NOT NULL,

    CONSTRAINT "DetallesVenta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetallesVenta" ADD CONSTRAINT "DetallesVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Ventas"("id_venta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallesVenta" ADD CONSTRAINT "DetallesVenta_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulos"("id_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;
