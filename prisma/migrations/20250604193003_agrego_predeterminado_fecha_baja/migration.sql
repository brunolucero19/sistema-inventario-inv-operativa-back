-- AlterTable
ALTER TABLE "ProveedorArticulo" ADD COLUMN     "es_predeterminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaBaja" TIMESTAMP(3);
