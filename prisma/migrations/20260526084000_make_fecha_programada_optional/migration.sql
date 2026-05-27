-- AlterTable: Make fecha_programada nullable so inspectors can set it manually
ALTER TABLE "inspecciones" ALTER COLUMN "fecha_programada" DROP NOT NULL;
