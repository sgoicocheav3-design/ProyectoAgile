import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { onDocumentosCargados } from '@/lib/tramite-machine';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Inicialización lazy del cliente Supabase (solo en runtime, no en build)
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const tramiteId = formData.get('tramiteId') as string;
  const tipo = formData.get('tipo') as string;

  if (!file || !tramiteId) {
    return NextResponse.json({ error: 'Archivo y tramiteId son requeridos.' }, { status: 400 });
  }

  // Validar tipo de archivo
  const tiposPermitidos = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (!tiposPermitidos.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF, PNG o JPG.' }, { status: 400 });
  }

  // Validar tamaño (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo no debe superar 10 MB.' }, { status: 400 });
  }

  // Verificar que el trámite pertenezca al usuario
  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: { negocio: true },
  });

  if (!tramite || tramite.negocio.usuarioId !== session.user.id) {
    return NextResponse.json({ error: 'Sin autorización para este trámite.' }, { status: 403 });
  }

  // Subir a Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `tramites/${tramiteId}/${tipo}_${Date.now()}.${fileExt}`;
  const fileBuffer = await file.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(fileName, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[UPLOAD] Error Supabase Storage:', uploadError);
    return NextResponse.json({ error: 'Error al subir el archivo.' }, { status: 500 });
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);
  const url = urlData.publicUrl;

  // Guardar en BD
  await prisma.documento.create({
    data: {
      tramiteId,
      tipo: tipo as 'PLANO_LOCAL' | 'ACTA_INSPECCION' | 'OTRO',
      url,
      nombre: file.name,
      mimeType: file.type,
      tamanio: file.size,
      vigente: true,
    },
  });

  // Avanzar el estado del trámite a DOCUMENTOS_PENDIENTES si viene de INICIADO
  if (tramite.estado === 'INICIADO') {
    await onDocumentosCargados(tramiteId);
  }

  return NextResponse.json({ url, nombre: file.name });
}
