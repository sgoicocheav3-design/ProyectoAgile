import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de demostración...');

  const hash = (pass: string) => bcrypt.hash(pass, 12);

  // ──────────────────────────────────────────
  // USUARIOS
  // ──────────────────────────────────────────
  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@demo.pe' },
    update: {},
    create: {
      email: 'admin@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Administrador Sistema MPT',
      rol: RolUsuario.ADMINISTRADOR,
      dni: '00000001',
      telefono: '044-123456',
    },
  });

  const inspectorUser = await prisma.usuario.upsert({
    where: { email: 'inspector@demo.pe' },
    update: {},
    create: {
      email: 'inspector@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Inspector Juan Rojas Mendez',
      rol: RolUsuario.INSPECTOR,
      dni: '00000002',
      telefono: '044-234567',
    },
  });

  const inspector2User = await prisma.usuario.upsert({
    where: { email: 'inspector2@demo.pe' },
    update: {},
    create: {
      email: 'inspector2@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Inspector María Vásquez Torres',
      rol: RolUsuario.INSPECTOR,
      dni: '00000003',
      telefono: '044-345678',
    },
  });

  // Inspectores demo con código INS (para acceso rápido en presentaciones)
  const inspectorIns1 = await prisma.usuario.upsert({
    where: { email: 'ins-001@demo.pe' },
    update: {},
    create: {
      email: 'ins-001@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Carlos Mendoza García',
      rol: RolUsuario.INSPECTOR,
      dni: 'INS-001',
      telefono: '044-456789',
    },
  });

  const inspectorIns2 = await prisma.usuario.upsert({
    where: { email: 'ins-002@demo.pe' },
    update: {},
    create: {
      email: 'ins-002@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Rosa Huamán Vargas',
      rol: RolUsuario.INSPECTOR,
      dni: 'INS-002',
      telefono: '044-567890',
    },
  });

  const inspectorIns3 = await prisma.usuario.upsert({
    where: { email: 'ins-003@demo.pe' },
    update: {},
    create: {
      email: 'ins-003@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Miguel Ángel Ruiz Paredes',
      rol: RolUsuario.INSPECTOR,
      dni: 'INS-003',
      telefono: '044-678901',
    },
  });

  const contribuyenteUser = await prisma.usuario.upsert({
    where: { email: 'contribuyente@demo.pe' },
    update: {},
    create: {
      email: 'contribuyente@demo.pe',
      passwordHash: await hash('Demo1234!'),
      nombre: 'Carlos Pérez García',
      rol: RolUsuario.CONTRIBUYENTE,
      dni: '12345678',
      telefono: '987654321',
    },
  });

  console.log('✅ Usuarios creados:', {
    adminUser: adminUser.email,
    inspectorUser: inspectorUser.email,
    inspectorIns1: inspectorIns1.email,
    inspectorIns2: inspectorIns2.email,
    inspectorIns3: inspectorIns3.email,
    contribuyenteUser: contribuyenteUser.email,
  });

  // ──────────────────────────────────────────
  // NEGOCIO (datos reales de Trujillo)
  // ──────────────────────────────────────────
  const negocio = await prisma.negocio.upsert({
    where: { ruc: '20481196515' },
    update: {},
    create: {
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

  // ──────────────────────────────────────────
  // TRAMITE 1: Estado APROBADO (con licencia)
  // ──────────────────────────────────────────
  const tramiteAprobado = await prisma.tramite.upsert({
    where: { id: 'tramite-aprobado-demo-001' },
    update: {},
    create: {
      id: 'tramite-aprobado-demo-001',
      negocioId: negocio.id,
      estado: 'APROBADO',
      codigoLicencia: 'LIC-TRU-20250115-DEMO0001',
      qrData: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verificar/LIC-TRU-20250115-DEMO0001`,
      licenciaVigenteDesde: new Date('2025-01-15'),
      licenciaVigenteHasta: new Date('2026-01-15'),
      fechaAprobacion: new Date('2025-01-15'),
      esRenovacion: false,
    },
  });

  await prisma.pago.upsert({
    where: { id: 'pago-aprobado-demo-001' },
    update: {},
    create: {
      id: 'pago-aprobado-demo-001',
      tramiteId: tramiteAprobado.id,
      monto: 180.00,
      referenciaPasarela: 'MP-TEST-123456789',
      preferenceId: 'PREF-TEST-001',
      estadoPago: 'APROBADO',
      fechaPago: new Date('2025-01-10'),
    },
  });

  await prisma.inspeccion.upsert({
    where: { id: 'insp-aprobado-demo-001' },
    update: {},
    create: {
      id: 'insp-aprobado-demo-001',
      tramiteId: tramiteAprobado.id,
      inspectorId: inspectorUser.id,
      fechaProgramada: new Date('2025-01-13'),
      fechaRealizada: new Date('2025-01-13'),
      resultado: 'CONFORME',
      numeroVisita: 1,
      completada: true,
    },
  });

  console.log('✅ Trámite APROBADO creado:', tramiteAprobado.id);

  // ──────────────────────────────────────────
  // TRAMITE 2: Estado EN_INSPECCION
  // ──────────────────────────────────────────
  const negocio2 = await prisma.negocio.upsert({
    where: { ruc: '20132369477' },
    update: {},
    create: {
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

  const tramiteInspeccion = await prisma.tramite.upsert({
    where: { id: 'tramite-inspeccion-demo-002' },
    update: {},
    create: {
      id: 'tramite-inspeccion-demo-002',
      negocioId: negocio2.id,
      estado: 'EN_INSPECCION',
    },
  });

  await prisma.pago.upsert({
    where: { id: 'pago-inspeccion-demo-002' },
    update: {},
    create: {
      id: 'pago-inspeccion-demo-002',
      tramiteId: tramiteInspeccion.id,
      monto: 180.00,
      referenciaPasarela: 'MP-TEST-987654321',
      estadoPago: 'APROBADO',
      fechaPago: new Date(),
    },
  });

  // Fecha de inspección = 2 días hábiles desde hoy
  const fechaInsp = new Date();
  fechaInsp.setDate(fechaInsp.getDate() + 3);

  await prisma.inspeccion.upsert({
    where: { id: 'insp-pendiente-demo-002' },
    update: {},
    create: {
      id: 'insp-pendiente-demo-002',
      tramiteId: tramiteInspeccion.id,
      inspectorId: inspectorUser.id,
      fechaProgramada: fechaInsp,
      numeroVisita: 1,
      completada: false,
    },
  });

  console.log('✅ Trámite EN_INSPECCION creado:', tramiteInspeccion.id);

  // ──────────────────────────────────────────
  // TRAMITE 3: Estado OBSERVADO / SEGUNDA_INSPECCION
  // ──────────────────────────────────────────
  const negocio3 = await prisma.negocio.upsert({
    where: { ruc: '20481888901' },
    update: {},
    create: {
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

  const tramiteObservado = await prisma.tramite.upsert({
    where: { id: 'tramite-observado-demo-003' },
    update: {},
    create: {
      id: 'tramite-observado-demo-003',
      negocioId: negocio3.id,
      estado: 'SEGUNDA_INSPECCION',
    },
  });

  await prisma.pago.upsert({
    where: { id: 'pago-observado-demo-003' },
    update: {},
    create: {
      id: 'pago-observado-demo-003',
      tramiteId: tramiteObservado.id,
      monto: 180.00,
      referenciaPasarela: 'MP-TEST-111222333',
      estadoPago: 'APROBADO',
      fechaPago: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Visita 1: Observada (hace 5 días)
  await prisma.inspeccion.upsert({
    where: { id: 'insp-obs-v1-demo-003' },
    update: {},
    create: {
      id: 'insp-obs-v1-demo-003',
      tramiteId: tramiteObservado.id,
      inspectorId: inspectorUser.id,
      fechaProgramada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fechaRealizada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resultado: 'OBSERVADO',
      observaciones: 'Extintor vencido. Salida de emergencia bloqueada por cajas de mercadería. Área de almacenamiento no coincide con plano presentado. Se requiere corrección antes de la segunda visita.',
      numeroVisita: 1,
      completada: true,
    },
  });

  // Visita 2: Pendiente (en 10 días)
  const fechaV2 = new Date();
  fechaV2.setDate(fechaV2.getDate() + 10);
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 30);

  await prisma.inspeccion.upsert({
    where: { id: 'insp-obs-v2-demo-003' },
    update: {},
    create: {
      id: 'insp-obs-v2-demo-003',
      tramiteId: tramiteObservado.id,
      inspectorId: inspectorUser.id,
      fechaProgramada: fechaV2,
      fechaLimite: fechaLimite,
      numeroVisita: 2,
      completada: false,
    },
  });

  console.log('✅ Trámite SEGUNDA_INSPECCION creado:', tramiteObservado.id);

  // ──────────────────────────────────────────
  // TRAMITE 4: Estado NEGADO
  // ──────────────────────────────────────────
  const negocio4 = await prisma.negocio.upsert({
    where: { ruc: '20481999002' },
    update: {},
    create: {
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

  const tramiteNegado = await prisma.tramite.upsert({
    where: { id: 'tramite-negado-demo-004' },
    update: {},
    create: {
      id: 'tramite-negado-demo-004',
      negocioId: negocio4.id,
      estado: 'NEGADO',
      motivoNegado: 'Visita #2 rechazada. El establecimiento no corrigió las deficiencias señaladas en la primera inspección: sistema eléctrico con riesgo de cortocircuito, sin licencia de defensa civil actualizada.',
    },
  });

  console.log('✅ Trámite NEGADO creado:', tramiteNegado.id);

  // ──────────────────────────────────────────
  // FERIADOS NO HÁBILES 2025-2026
  // ──────────────────────────────────────────
  const feriados = [
    { fecha: new Date('2026-01-01'), motivo: 'Año Nuevo 2026' },
    { fecha: new Date('2026-04-02'), motivo: 'Jueves Santo 2026' },
    { fecha: new Date('2026-04-03'), motivo: 'Viernes Santo 2026' },
    { fecha: new Date('2026-05-01'), motivo: 'Día del Trabajo' },
  ];

  for (const f of feriados) {
    await prisma.fechaNoHabil.upsert({
      where: { fecha: f.fecha },
      update: {},
      create: f,
    });
  }

  console.log('✅ Feriados registrados');
  console.log('');
  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('📧 Cuentas de acceso:');
  console.log('   Admin:         admin@demo.pe        / Demo1234!');
  console.log('   Inspector:     inspector@demo.pe     / Demo1234!');
  console.log('   Inspector 2:   inspector2@demo.pe   / Demo1234!');
  console.log('   Contribuyente: contribuyente@demo.pe / Demo1234!');
  console.log('');
  console.log('📋 Trámites demo:');
  console.log('   APROBADO:          tramite-aprobado-demo-001');
  console.log('   EN_INSPECCION:     tramite-inspeccion-demo-002');
  console.log('   SEGUNDA_INSPECCION: tramite-observado-demo-003');
  console.log('   NEGADO:            tramite-negado-demo-004');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
