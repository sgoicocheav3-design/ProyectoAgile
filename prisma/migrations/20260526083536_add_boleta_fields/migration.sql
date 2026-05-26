-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('CONTRIBUYENTE', 'INSPECTOR', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "EstadoTramite" AS ENUM ('INICIADO', 'DOCUMENTOS_PENDIENTES', 'PAGADO', 'EN_INSPECCION', 'OBSERVADO', 'SEGUNDA_INSPECCION', 'APROBADO', 'NEGADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ResultadoInspeccion" AS ENUM ('CONFORME', 'OBSERVADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PLANO_LOCAL', 'ACTA_INSPECCION', 'OTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CONTRIBUYENTE',
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negocios" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "domicilio_fiscal" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "distrito" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "habido" BOOLEAN NOT NULL DEFAULT true,
    "tipo_contribuyente" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramites" (
    "id" TEXT NOT NULL,
    "negocio_id" TEXT NOT NULL,
    "estado" "EstadoTramite" NOT NULL DEFAULT 'INICIADO',
    "codigo_licencia" TEXT,
    "qr_data" TEXT,
    "licencia_vigente_desde" TIMESTAMP(3),
    "licencia_vigente_hasta" TIMESTAMP(3),
    "es_renovacion" BOOLEAN NOT NULL DEFAULT false,
    "tramite_origen_id" TEXT,
    "motivo_negado" TEXT,
    "email_solicitante" TEXT,
    "nombre_solicitante" TEXT,
    "tipo_comprobante" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_aprobacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tramites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "tramite_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "referencia_pasarela" TEXT,
    "preference_id" TEXT,
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "es_renovacion" BOOLEAN NOT NULL DEFAULT false,
    "fecha_pago" TIMESTAMP(3),
    "metadatos" JSONB,
    "comprobante_serie" TEXT,
    "comprobante_numero" TEXT,
    "comprobante_pdf_url" TEXT,
    "comprobante_xml_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" TEXT NOT NULL,
    "tramite_id" TEXT NOT NULL,
    "inspector_id" TEXT NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "fecha_realizada" TIMESTAMP(3),
    "resultado" "ResultadoInspeccion",
    "observaciones" TEXT,
    "url_acta" TEXT,
    "numero_visita" INTEGER NOT NULL,
    "fecha_limite" TIMESTAMP(3),
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tramite_id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime_type" TEXT,
    "tamanio" INTEGER,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_infraestructura" (
    "id" TEXT NOT NULL,
    "tramite_id" TEXT NOT NULL,
    "tiene_cambios" BOOLEAN NOT NULL,
    "descripcion_cambios" TEXT,
    "declarado_por" TEXT NOT NULL,
    "acepta_terminos" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_infraestructura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechas_no_habiles" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "fechas_no_habiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_dni_key" ON "usuarios"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "negocios_ruc_key" ON "negocios"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "tramites_codigo_licencia_key" ON "tramites"("codigo_licencia");

-- CreateIndex
CREATE UNIQUE INDEX "fechas_no_habiles_fecha_key" ON "fechas_no_habiles"("fecha");

-- AddForeignKey
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramites" ADD CONSTRAINT "tramites_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramites" ADD CONSTRAINT "tramites_tramite_origen_id_fkey" FOREIGN KEY ("tramite_origen_id") REFERENCES "tramites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_infraestructura" ADD CONSTRAINT "historial_infraestructura_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspecciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
