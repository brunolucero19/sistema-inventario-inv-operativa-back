-- AlterTable
ALTER TABLE "Articulos" ADD COLUMN     "desviacion_est_dem" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "ProveedorArticulo" ADD COLUMN     "nivel_servicio" INTEGER NOT NULL DEFAULT 95;
