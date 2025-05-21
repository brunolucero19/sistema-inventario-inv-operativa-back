/*
  Warnings:

  - Added the required column `apellido` to the `Proveedores` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Proveedores" ADD COLUMN     "apellido" TEXT NOT NULL;
