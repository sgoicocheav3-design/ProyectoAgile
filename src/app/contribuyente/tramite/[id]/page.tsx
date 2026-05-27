import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, Clock, FileText, Calendar,
  AlertTriangle, Download, RefreshCw, CreditCard
} from 'lucide-react';
import { EstadoTramite } from '@prisma/client';

function TimelineStep({
  titulo, descripcion, fecha, tipo, activo
}: {
  titulo: string; descripcion?: string | null; fecha?: Date | null;
  tipo: 'success' | 'warning' | 'error' | 'pending' | 'info';
  activo?: boolean;
}) {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    pending: <Clock className="w-5 h-5 text-blue-500 animate-pulse-soft" />,
    info: <FileText className="w-5 h-5 text-gray-400" />,
  };
  return (
    <div className={`flex gap-4 ${activo ? 'opacity-100' : 'opacity-60'}`}>
      <div className="flex flex-col items-center">
        <div className="p-1">{iconMap[tipo]}</div>
        <div className="w-px flex-1 bg-gray-200 my-1" />
      </div>
      <div className="pb-6">
        <p className="font-semibold text-gray-800 text-sm">{titulo}</p>
        {descripcion && <p className="text-gray-500 text-xs mt-0.5">{descripcion}</p>}
        {fecha && <p className="text-gray-400 text-xs mt-1">{new Date(fecha).toLocaleDateString('es-PE', { dateStyle: 'full', timeZone: 'America/Lima' })}</p>}
      </div>
    </div>
  );
}

export default async function TramiteDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { pago?: string; payment_id?: string; preference_id?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFICACIÓN ACTIVA DEL PAGO
  // Cuando MercadoPago redirige al usuario de vuelta, añade payment_id y
  // status en la URL. Lo usamos para actualizar Supabase ANTES de renderizar,
  // sin depender del webhook (que no funciona en localhost).
  // ─────────────────────────────────────────────────────────────────────────
  const regresoDePago = searchParams.pago === 'success' || searchParams.pago === 'pending';
  const mpPaymentId = searchParams.payment_id;
  const mpPreferenceId = searchParams.preference_id;
  const mpStatus = searchParams.status; // MercadoPago también envía ?status=approved

  if (regresoDePago || mpPaymentId || mpStatus === 'approved') {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${appUrl}/api/pagos/verificar-retorno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tramiteId: params.id,
          paymentId: mpPaymentId ?? null,
          preferenceId: mpPreferenceId ?? null,
        }),
        // Sin cache — necesitamos datos frescos siempre
        cache: 'no-store',
      });
    } catch (err) {
      // Si falla la verificación, continuamos igual — no bloqueamos el render
      console.error('[TramitePage] Error al verificar retorno de pago:', err);
    }
  }

  const tramite = await prisma.tramite.findUnique({
    where: { id: params.id },
    include: {
      negocio: true,
      pagos: { orderBy: { createdAt: 'desc' } },
      inspecciones: {
        orderBy: { numeroVisita: 'asc' },
        include: { inspector: { select: { nombre: true } } },
      },
      documentos: { where: { vigente: true } },
    },
  });

  if (!tramite) notFound();

  // Verificar acceso: el contribuyente solo puede ver sus propios trámites
  if (
    session.user.rol === 'CONTRIBUYENTE' &&
    tramite.negocio.usuarioId !== session.user.id
  ) {
    redirect('/contribuyente/dashboard');
  }

  const inspeccion1 = tramite.inspecciones.find((i) => i.numeroVisita === 1);
  const inspeccion2 = tramite.inspecciones.find((i) => i.numeroVisita === 2);
  const ultimoPago = tramite.pagos[0];
  const pagoExitoso = searchParams.pago === 'success' || ultimoPago?.estadoPago === 'APROBADO';


  const estadoConfig: Record<EstadoTramite, { color: string; label: string; desc: string }> = {
    INICIADO:              { color: 'bg-gray-100 text-gray-700', label: 'Iniciado', desc: 'El trámite ha sido creado.' },
    DOCUMENTOS_PENDIENTES: { color: 'bg-yellow-100 text-yellow-800', label: 'Documentos Pendientes', desc: 'Suba los documentos requeridos y realice el pago.' },
    PAGADO:                { color: 'bg-blue-100 text-blue-800', label: 'Pago Confirmado', desc: 'El pago fue registrado. Agenda de inspección en proceso.' },
    EN_INSPECCION:         { color: 'bg-indigo-100 text-indigo-800', label: 'En Inspección', desc: 'Inspector asignado. Espere la fecha programada.' },
    OBSERVADO:             { color: 'bg-orange-100 text-orange-800', label: 'Observado', desc: 'Se encontraron observaciones. Se ha agendado una segunda visita.' },
    SEGUNDA_INSPECCION:    { color: 'bg-purple-100 text-purple-800', label: 'Segunda Inspección', desc: 'Segunda visita programada. Esta es la última oportunidad.' },
    APROBADO:              { color: 'bg-green-100 text-green-800', label: '✓ Aprobado', desc: 'Su licencia ha sido aprobada. Puede descargar el PDF.' },
    NEGADO:                { color: 'bg-red-100 text-red-800', label: '✗ Negado Definitivo', desc: 'El trámite fue rechazado. Debe iniciar desde cero.' },
  };

  const cfg = estadoConfig[tramite.estado];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs">
              <Link href="/contribuyente/dashboard" className="hover:text-white">← Dashboard</Link>
            </p>
            <h1 className="font-bold text-lg">Detalle del Trámite</h1>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Banner de pago confirmado */}
        {searchParams.pago === 'success' && (
          <div className="md:col-span-3 bg-green-50 border border-green-300 rounded-xl px-5 py-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-800 text-sm">¡Pago procesado correctamente!</p>
              <p className="text-green-700 text-xs mt-0.5">
                Su pago ha sido validado con MercadoPago y su trámite ha avanzado a la etapa de inspección.
              </p>
              {inspeccion1 && (
                <p className="text-green-700 text-sm font-semibold mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Inspección asignada a: {inspeccion1.inspector.nombre}
                </p>
              )}
            </div>
          </div>
        )}
        {searchParams.pago === 'failure' && (
          <div className="md:col-span-3 bg-red-50 border border-red-300 rounded-xl px-5 py-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-sm">El pago no pudo completarse</p>
              <p className="text-red-700 text-xs mt-0.5">
                Su pago fue rechazado o cancelado. Puede intentarlo nuevamente desde la sección de pago.
              </p>
            </div>
          </div>
        )}

        {/* Columna izquierda: Info */}
        <div className="md:col-span-2 space-y-5">
          {/* Info del negocio */}
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Datos del Negocio
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400 text-xs">Razón Social</p><p className="font-semibold">{tramite.negocio.razonSocial}</p></div>
              <div><p className="text-gray-400 text-xs">RUC</p><p className="font-semibold font-mono">{tramite.negocio.ruc}</p></div>
              <div className="col-span-2"><p className="text-gray-400 text-xs">Domicilio Fiscal</p><p className="font-semibold">{tramite.negocio.domicilioFiscal}</p></div>
              <div><p className="text-gray-400 text-xs">Provincia</p><p className="font-semibold">{tramite.negocio.provincia}</p></div>
              <div><p className="text-gray-400 text-xs">N° Expediente</p><p className="font-semibold font-mono text-xs">{tramite.id.toUpperCase().slice(0, 12)}</p></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Historial del Proceso
            </h2>
            <div>
              <TimelineStep titulo="Trámite Iniciado" fecha={tramite.createdAt} tipo="success" activo />
              <TimelineStep
                titulo="Pago de S/. 180.00"
                descripcion={ultimoPago?.estadoPago === 'APROBADO' ? `Ref: ${ultimoPago.referenciaPasarela}` : 'Pendiente de pago'}
                fecha={ultimoPago?.fechaPago}
                tipo={ultimoPago?.estadoPago === 'APROBADO' ? 'success' : 'pending'}
                activo={!!ultimoPago}
              />
              {inspeccion1 && (
                <TimelineStep
                  titulo={`Inspección #1 — ${inspeccion1.completada ? (inspeccion1.resultado === 'CONFORME' ? 'Conforme ✓' : 'Observada') : 'Programada'}`}
                  descripcion={inspeccion1.completada
                    ? inspeccion1.observaciones || 'Sin observaciones'
                    : `Inspector: ${inspeccion1.inspector.nombre}`
                  }
                  fecha={inspeccion1.fechaRealizada || inspeccion1.fechaProgramada}
                  tipo={inspeccion1.completada
                    ? (inspeccion1.resultado === 'CONFORME' ? 'success' : 'warning')
                    : 'pending'
                  }
                  activo={!!(inspeccion1)}
                />
              )}
              {inspeccion2 && (
                <TimelineStep
                  titulo={`Inspección #2 — ${inspeccion2.completada ? (inspeccion2.resultado === 'CONFORME' ? 'Aprobada ✓' : 'Rechazada ✗') : 'Programada'}`}
                  descripcion={inspeccion2.completada
                    ? inspeccion2.observaciones || undefined
                    : `Programada: ${inspeccion2.fechaProgramada ? new Date(inspeccion2.fechaProgramada).toLocaleDateString('es-PE') : 'Pendiente de asignación'} | Límite: ${inspeccion2.fechaLimite ? new Date(inspeccion2.fechaLimite).toLocaleDateString('es-PE') : 'N/A'}`
                  }
                  fecha={inspeccion2.fechaRealizada || inspeccion2.fechaProgramada}
                  tipo={inspeccion2.completada
                    ? (inspeccion2.resultado === 'CONFORME' ? 'success' : 'error')
                    : 'pending'
                  }
                  activo={!!(inspeccion2)}
                />
              )}
              {tramite.estado === 'APROBADO' && (
                <TimelineStep
                  titulo="Licencia Aprobada y Emitida"
                  descripcion={`Código: ${tramite.codigoLicencia} | Vence: ${tramite.licenciaVigenteHasta ? new Date(tramite.licenciaVigenteHasta).toLocaleDateString('es-PE') : ''}`}
                  fecha={tramite.fechaAprobacion}
                  tipo="success"
                  activo
                />
              )}
              {tramite.estado === 'NEGADO' && (
                <TimelineStep
                  titulo="Trámite NEGADO Definitivamente"
                  descripcion={tramite.motivoNegado || 'Segunda inspección rechazada.'}
                  tipo="error"
                  activo
                />
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Acciones */}
        <div className="space-y-4">
          {/* Estado card */}
          <div className={`card border-2 ${tramite.estado === 'APROBADO' ? 'border-green-400' : tramite.estado === 'NEGADO' ? 'border-red-400' : 'border-blue-200'}`}>
            <p className="text-xs text-gray-500 mb-1">Estado actual</p>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
            <p className="text-xs text-gray-500 mt-2">{cfg.desc}</p>
          </div>

          {/* Comprobante de Pago (Factura/Boleta) */}
          {ultimoPago?.estadoPago === 'APROBADO' && ultimoPago?.comprobantePdfUrl && (
            <div className="card bg-gray-50 border border-gray-200 text-center">
              <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-bold text-gray-700 text-sm mb-1">Comprobante de Pago</p>
              <p className="text-xs text-gray-500 mb-3">
                {ultimoPago.comprobanteSerie}-{ultimoPago.comprobanteNumero}
              </p>
              <a
                href={ultimoPago.comprobantePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar {tramite.tipoComprobante === 'FACTURA' ? 'Factura' : 'Boleta'}
              </a>
            </div>
          )}

          {/* Descarga PDF */}
          {tramite.estado === 'APROBADO' && (
            <div className="card bg-green-50 border border-green-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-sm mb-1">¡Licencia Lista!</p>
              <p className="text-xs text-green-600 mb-3">Código: <strong>{tramite.codigoLicencia}</strong></p>
              <a
                href={`/api/licencia/${tramite.id}/pdf`}
                target="_blank"
                id="btn-descargar-pdf"
                className="btn-primary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar Licencia PDF
              </a>
              <p className="text-xs text-green-500 mt-2">
                Vence: {tramite.licenciaVigenteHasta
                  ? new Date(tramite.licenciaVigenteHasta).toLocaleDateString('es-PE')
                  : '—'}
              </p>
            </div>
          )}

          {/* Reiniciar si NEGADO */}
          {tramite.estado === 'NEGADO' && (
            <div className="card bg-red-50 border border-red-200 text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="font-bold text-red-800 text-sm mb-1">Trámite Negado</p>
              <p className="text-xs text-red-600 mb-3">Para intentarlo nuevamente, debe iniciar un trámite nuevo con pago de S/. 180.00.</p>
              <Link href="/contribuyente/nuevo-tramite" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4" />
                Iniciar Nuevo Trámite
              </Link>
            </div>
          )}

          {/* Pago pendiente */}
          {tramite.estado === 'DOCUMENTOS_PENDIENTES' && (
            <div className="card bg-yellow-50 border border-yellow-200 text-center">
              <p className="font-bold text-yellow-800 text-sm mb-3">Pago Pendiente</p>
              <Link href="/contribuyente/nuevo-tramite" className="btn-primary w-full text-sm">
                Continuar con el Pago
              </Link>
            </div>
          )}

          {/* Próxima inspección */}
          {(tramite.estado === 'EN_INSPECCION' || tramite.estado === 'SEGUNDA_INSPECCION') && (
            (() => {
              const insp = tramite.inspecciones.find(i => !i.completada);
              return insp ? (
                <div className="card bg-indigo-50 border border-indigo-200">
                  <Calendar className="w-6 h-6 text-indigo-500 mb-2" />
                  <p className="font-bold text-indigo-800 text-sm mb-1">
                    {tramite.estado === 'SEGUNDA_INSPECCION' ? 'Segunda Visita Programada' : 'Inspección Programada'}
                  </p>
                  <p className="text-indigo-600 text-xs">
                    {insp.fechaProgramada
                      ? new Date(insp.fechaProgramada).toLocaleDateString('es-PE', { dateStyle: 'full', timeZone: 'America/Lima' })
                      : 'Fecha pendiente de asignación'}
                  </p>
                  <p className="text-xs text-indigo-500 mt-1">Inspector: {insp.inspector.nombre}</p>
                  {insp.fechaLimite && (
                    <p className="text-xs text-red-500 mt-1">
                      Límite: {new Date(insp.fechaLimite).toLocaleDateString('es-PE')}
                    </p>
                  )}
                </div>
              ) : null;
            })()
          )}
        </div>
      </main>
    </div>
  );
}
