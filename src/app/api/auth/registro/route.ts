import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const RegistroSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  dni: z.string().length(8, 'El DNI debe tener 8 dígitos').optional(),
  telefono: z.string().optional(),
});

/**
 * POST /api/auth/registro
 * Registro de nuevos contribuyentes (rol por defecto: CONTRIBUYENTE)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = RegistroSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', detalle: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, nombre, dni, telefono } = parseResult.data;

  // Verificar si el email ya existe
  const existe = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existe) {
    return NextResponse.json(
      { error: 'Ya existe una cuenta con ese email.' },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const usuario = await prisma.usuario.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      nombre: nombre.trim(),
      dni,
      telefono,
      rol: 'CONTRIBUYENTE',
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ usuario }, { status: 201 });
}
