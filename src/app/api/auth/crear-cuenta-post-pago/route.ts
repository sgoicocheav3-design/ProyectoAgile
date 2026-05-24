import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const CrearCuentaSchema = z.object({
  email: z.string().email('Ingrese un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  nombre: z.string().min(2, 'Ingrese su nombre completo.'),
  tramiteId: z.string().min(1, 'tramiteId es requerido.'),
});

/**
 * POST /api/auth/crear-cuenta-post-pago
 * Crea cuenta del contribuyente DESPUÉS del pago
 * Asocia el negocio y trámite existente al nuevo usuario
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = CrearCuentaSchema.safeParse(body);

  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || 'Datos inválidos.';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { email, password, nombre, tramiteId } = parseResult.data;

  // Verificar que el trámite exista
  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: { negocio: true },
  });

  if (!tramite) {
    return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
  }

  // Verificar si ya existe un usuario con ese email
  const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existente) {
    // Si ya existe, solo asociar el negocio a ese usuario (si no tiene dueño)
    if (!tramite.negocio.usuarioId) {
      await prisma.negocio.update({
        where: { id: tramite.negocio.id },
        data: { usuarioId: existente.id },
      });
    }
    return NextResponse.json({
      mensaje: 'Ya existe una cuenta con ese email. Inicie sesión para ver su trámite.',
      yaExiste: true,
    });
  }

  // Crear usuario
  const passwordHash = await bcrypt.hash(password, 12);

  const usuario = await prisma.usuario.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      nombre,
      rol: 'CONTRIBUYENTE',
    },
  });

  // Asociar el negocio al nuevo usuario
  await prisma.negocio.update({
    where: { id: tramite.negocio.id },
    data: { usuarioId: usuario.id },
  });

  return NextResponse.json({
    mensaje: 'Cuenta creada exitosamente. Use su email y contraseña para futuras consultas.',
    yaExiste: false,
    userId: usuario.id,
  }, { status: 201 });
}
