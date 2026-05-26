import fs from 'fs';
import path from 'path';
import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asignarInspector } from '../src/lib/tramite-machine';

function loadEnvFile(fileName: string) {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de demostración...');

  // Limpiar datos previos para empezar limpios
  await prisma.comentario.deleteMany();
  await prisma.inspeccion.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.historialInfraestructura.deleteMany();
  await prisma.tramite.deleteMany();
  await prisma.negocio.deleteMany();
  await prisma.fechaNoHabil.deleteMany();
  await prisma.usuario.deleteMany();

  const hash = (pass: string) => bcrypt.hash(pass, 12);

  // ──────────────────────────────────────────
  // USUARIOS — 1 inspector + admin + contribuyente
  // ──────────────────────────────────────────
  const adminUser = await prisma.usuario.create({
    data: {
      email: 'admin@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Administrador Sistema MPT',
      rol: RolUsuario.ADMINISTRADOR,
      dni: '00000001',
      telefono: '044-123456',
    },
  });

  // Inspector demo con código INS (para acceso rápido)
  const inspector1 = await prisma.usuario.create({
    data: {
      email: 'inspector@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Carlos Mendoza García',
      rol: RolUsuario.INSPECTOR,
      dni: 'INS-001',
      telefono: '044-456789',
    },
  });

  const contribuyenteUser = await prisma.usuario.create({
    data: {
      email: 'contribuyente@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Carlos Pérez García',
      rol: RolUsuario.CONTRIBUYENTE,
      dni: '12345678',
      telefono: '987654321',
    },
  });

  console.log('✅ Usuarios creados (1 inspector):', {
    admin: adminUser.email,
    inspector: inspector1.email,
    contribuyente: contribuyenteUser.email,
  });

  // ──────────────────────────────────────────
  // NEGOCIOS
  // ──────────────────────────────────────────
  const negocio1 = await prisma.negocio.create({
    data: {
      ruc: '20481196515',
      razonSocial: 'RESTAURANTE EL SABOR TRUJILLANO S.A.C.',
      domicilioFiscal: 'AV. LARCO NRO. 1234 URB. LAS QUINTANAS',
      departamento: 'LA LIBERTAD',
      provincia: 'TRUJILLO',
      distrito: 'TRUJILLO',
      activo: true,
      habido: true,
      tipoContribuyente: 'SOCIEDAD ANONIMA CERRADA',
      usuarioId: contribuyenteUser.id,
    },
  });

  const negocio2 = await prisma.negocio.create({
    data: {
      ruc: '20132369477',
      razonSocial: 'FARMACIA SALUD TOTAL E.I.R.L.',
      domicilioFiscal: 'JR. INDEPENDENCIA NRO. 567 TRUJILLO',
      departamento: 'LA LIBERTAD',
      provincia: 'TRUJILLO',
      distrito: 'TRUJILLO',
      activo: true,
      habido: true,
      tipoContribuyente: 'EMPRESA INDIVIDUAL DE RESP. LTDA',
      usuarioId: contribuyenteUser.id,
    },
  });

  const negocio3 = await prisma.negocio.create({
    data: {
      ruc: '20481888901',
      razonSocial: 'BODEGA LA ESQUINA DE ORO S.R.L.',
      domicilioFiscal: 'CA. UNION NRO. 890 TRUJILLO',
      departamento: 'LA LIBERTAD',
      provincia: 'TRUJILLO',
      distrito: 'TRUJILLO',
      activo: true,
      habido: true,
      tipoContribuyente: 'SOCIEDAD COMERCIAL DE RESP. LTDA',
      usuarioId: contribuyenteUser.id,
    },
  });

  const negocio4 = await prisma.negocio.create({
    data: {
      ruc: '20481999002',
      razonSocial: 'TIENDA ELECTRO NORTE S.A.C.',
      domicilioFiscal: 'AV. ESPAÑA NRO. 432 TRUJILLO',
      departamento: 'LA LIBERTAD',
      provincia: 'TRUJILLO',
      distrito: 'TRUJILLO',
      activo: true,
      habido: true,
      usuarioId: contribuyenteUser.id,
    },
  });

  console.log('✅ Negocios creados');

  // ──────────────────────────────────────────
  // TRÁMITES DEMO
  // 1. APROBADO — con licencia (histórico)
  // 2. PAGADO — esperando asignación de inspector
  // 3. PAGADO — esperando asignación de inspector
  // 4. NEGADO — rechazado
  // ──────────────────────────────────────────

  // Tramite 1: APROBADO (completo, con licencia)
  await prisma.tramite.create({
    data: {
      id: 'tramite-aprobado-demo-001',
      negocioId: negocio1.id,
      estado: 'APROBADO',
      codigoLicencia: 'LIC-TRU-20250115-DEMO0001',
      qrData: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verificar/LIC-TRU-20250115-DEMO0001`,
      licenciaVigenteDesde: new Date('2025-01-15'),
      licenciaVigenteHasta: new Date('2026-01-15'),
      fechaAprobacion: new Date('2025-01-15'),
      esRenovacion: false,
      emailSolicitante: 'carlos@example.com',
      nombreSolicitante: 'Carlos Pérez García',
      tipoComprobante: 'FACTURA',
    },
  });

  await prisma.pago.create({
    data: {
      id: 'pago-aprobado-demo-001',
      tramiteId: 'tramite-aprobado-demo-001',
      monto: 180.00,
      referenciaPasarela: 'MP-TEST-123456789',
      preferenceId: 'PREF-TEST-001',
      estadoPago: 'APROBADO',
      fechaPago: new Date('2025-01-10'),
    },
  });

  console.log('✅ Trámite APROBADO creado (sin inspección)');

  // Tramite 2: PAGADO (simula pago reciente, esperando inspector)
  await prisma.tramite.create({
    data: {
      id: 'tramite-pagado-demo-002',
      negocioId: negocio2.id,
      estado: 'PAGADO',
      esRenovacion: false,
      emailSolicitante: 'maria@example.com',
      nombreSolicitante: 'María Vásquez Torres',
      tipoComprobante: 'BOLETA',
    },
  });

  await prisma.pago.create({
    data: {
      id: 'pago-pagado-demo-002',
      tramiteId: 'tramite-pagado-demo-002',
      monto: 1.80,
      referenciaPasarela: 'MP-TEST-987654321',
      estadoPago: 'APROBADO',
      fechaPago: new Date(),
      comprobanteSerie: 'BBB1',
      comprobanteNumero: '000001',
      comprobantePdfUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/comprobante/pago-pagado-demo-002/pdf`,
    },
  });

  console.log('✅ Trámite PAGADO #1 creado (esperando inspector)');

  // Tramite 3: PAGADO (otro, para probar balance de carga)
  await prisma.tramite.create({
    data: {
      id: 'tramite-pagado-demo-003',
      negocioId: negocio3.id,
      estado: 'PAGADO',
      esRenovacion: false,
      emailSolicitante: 'juan@example.com',
      nombreSolicitante: 'Juan Pérez López',
      tipoComprobante: 'FACTURA',
    },
  });

  await prisma.pago.create({
    data: {
      id: 'pago-pagado-demo-003',
      tramiteId: 'tramite-pagado-demo-003',
      monto: 1.80,
      referenciaPasarela: 'MP-TEST-111222333',
      estadoPago: 'APROBADO',
      fechaPago: new Date(),
      comprobanteSerie: 'FFF1',
      comprobanteNumero: '000001',
      comprobantePdfUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/comprobante/pago-pagado-demo-003/pdf`,
    },
  });

  console.log('✅ Trámite PAGADO #2 creado (esperando inspector)');

  // Tramite 4: NEGADO (terminal)
  await prisma.tramite.create({
    data: {
      id: 'tramite-negado-demo-004',
      negocioId: negocio4.id,
      estado: 'NEGADO',
      motivoNegado: 'El establecimiento no cumple con los requisitos mínimos de seguridad. Sistema eléctrico con riesgo de cortocircuito. Sin licencia de defensa civil actualizada.',
      esRenovacion: false,
      emailSolicitante: 'tienda@example.com',
      nombreSolicitante: 'Tienda Electro Norte',
      tipoComprobante: 'FACTURA',
    },
  });

  await prisma.pago.create({
    data: {
      id: 'pago-negado-demo-004',
      tramiteId: 'tramite-negado-demo-004',
      monto: 1.80,
      referenciaPasarela: 'MP-TEST-444555666',
      estadoPago: 'APROBADO',
      fechaPago: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Trámite NEGADO creado');

  // ──────────────────────────────────────────
  // FERIADOS NO HÁBILES
  // ──────────────────────────────────────────
  const feriados = [
    { fecha: new Date('2026-01-01'), motivo: 'Año Nuevo' },
    { fecha: new Date('2026-04-02'), motivo: 'Jueves Santo' },
    { fecha: new Date('2026-04-03'), motivo: 'Viernes Santo' },
    { fecha: new Date('2026-05-01'), motivo: 'Día del Trabajo' },
    { fecha: new Date('2026-06-29'), motivo: 'San Pedro y San Pablo' },
    { fecha: new Date('2026-07-28'), motivo: 'Fiestas Patrias' },
    { fecha: new Date('2026-07-29'), motivo: 'Fiestas Patrias' },
    { fecha: new Date('2026-08-30'), motivo: 'Santa Rosa de Lima' },
    { fecha: new Date('2026-10-08'), motivo: 'Combate de Angamos' },
    { fecha: new Date('2026-11-01'), motivo: 'Día de Todos los Santos' },
    { fecha: new Date('2026-12-08'), motivo: 'Inmaculada Concepción' },
    { fecha: new Date('2026-12-25'), motivo: 'Navidad' },
  ];

  for (const f of feriados) {
    await prisma.fechaNoHabil.create({ data: f });
  }

  console.log('✅ Feriados registrados');
  console.log('');
  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('📧 Cuentas de acceso:');
  console.log('   Admin:          admin@demo.pe          / Demo1234!');
  console.log('   Inspector:      inspector@demo.pe      / Demo1234!');
  console.log('   Contribuyente:  contribuyente@demo.pe   / Demo1234!');
  console.log('');
  console.log('📋 Trámites demo:');
  console.log('   APROBADO:  tramite-aprobado-demo-001 (con licencia)');
  console.log('   PAGADO:    tramite-pagado-demo-002 (esperando inspector)');
  console.log('   PAGADO:    tramite-pagado-demo-003 (esperando inspector)');
  console.log('   NEGADO:    tramite-negado-demo-004 (rechazado)');
  console.log('');
  console.log('🔧 Asignando inspectores a trámites en PAGADO...');

  const tramitesPendientes = ['tramite-pagado-demo-002', 'tramite-pagado-demo-003'];
  for (const tid of tramitesPendientes) {
    const result = await asignarInspector(tid);
    if (result.exito) {
      const inspNombre = result.datos?.inspectorNombre as string;
      const fechaProg = result.datos?.fechaProgramada as string;
      console.log(`   ✓ ${tid} → Inspector: ${inspNombre}, Fecha: ${fechaProg?.slice(0, 10)}`);
    } else {
      console.log(`   ✗ ${tid} → Error: ${result.error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
