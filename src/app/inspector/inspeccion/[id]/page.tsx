import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Clock,
  MapPin,
} from 'lucide-react';
import FormResultadoInspeccion from '@/components/inspector/form-resultado';
import ComentariosSection from '@/components/inspector/comentarios-section';

export default async function InspeccionDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    redirect('/login');
  }

  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: params.id },
    include: {
      inspector: { select: { nombre: true, email: true } },
      tramite: {
        include: {
          negocio: true,
          documentos: {
            where: { vigente: true },
            orderBy: { createdAt: 'desc' },
          },
          pagos: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!inspeccion) notFound();

  // Verify inspector access
  if (
    session.user.rol === 'INSPECTOR' &&
    inspeccion.inspectorId !== session.user.id
  ) {
    redirect('/inspector/agenda');
  }

  const { tramite } = inspeccion;
  const { negocio, documentos, pagos } = tramite;

  // Find approved payment
  const pagoAprobado = pagos.find((p) => p.estadoPago === 'APROBADO');
  const tieneDocumentos = documentos.length > 0;

  // Estado badge for resultado
  const resultadoInfo = inspeccion.resultado
    ? {
        CONFORME: {
          label: 'Conforme',
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'bg-green-100 text-green-700 border-green-300',
        },
        OBSERVADO: {
          label: 'Observado',
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'bg-orange-100 text-orange-700 border-orange-300',
        },
        RECHAZADO: {
          label: 'Rechazado',
          icon: <XCircle className="w-5 h-5" />,
          color: 'bg-red-100 text-red-700 border-red-300',
        },
      }[inspeccion.resultado]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/inspector/agenda"
              className="p-2 hover:bg-blue-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-blue-300 text-xs uppercase tracking-wider">
                Detalle de Inspección
              </p>
              <h1 className="font-bold text-lg">
                Visita #{inspeccion.numeroVisita} — {negocio.razonSocial}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{session.user.nombre}</span>
            <Link
              href="/api/auth/signout"
              className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition"
            >
              Salir
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        <div
          className={`card flex items-center gap-4 ${
            inspeccion.completada
              ? resultadoInfo
                ? `border ${resultadoInfo.color}`
                : ''
              : 'border border-blue-200 bg-blue-50'
          }`}
        >
          {inspeccion.completada && resultadoInfo ? (
            <>
              {resultadoInfo.icon}
              <div>
                <p className="font-bold">Inspección completada — {resultadoInfo.label}</p>
                {inspeccion.fechaRealizada && (
                  <p className="text-sm opacity-75">
                    Realizada el{' '}
                    {new Date(inspeccion.fechaRealizada).toLocaleDateString('es-PE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'America/Lima',
                    })}
                  </p>
                )}
                {inspeccion.observaciones && (
                  <p className="text-sm mt-1 italic">&quot;{inspeccion.observaciones}&quot;</p>
                )}
              </div>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-bold text-blue-800">Inspección pendiente</p>
                <p className="text-sm text-blue-600">
                  Programada para el{' '}
                  {new Date(inspeccion.fechaProgramada).toLocaleDateString('es-PE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'America/Lima',
                  })}
                </p>
                {inspeccion.numeroVisita === 2 && inspeccion.fechaLimite && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    ⚠ Fecha límite:{' '}
                    {new Date(inspeccion.fechaLimite).toLocaleDateString('es-PE')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Business info + Documents + Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business info */}
            <div className="card">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
                Información del Negocio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Razón Social
                  </p>
                  <p className="font-semibold text-gray-800">{negocio.razonSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">RUC</p>
                  <p className="font-semibold text-gray-800">{negocio.ruc}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Domicilio Fiscal
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {negocio.domicilioFiscal}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Provincia
                  </p>
                  <p className="font-semibold text-gray-800">{negocio.provincia}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Departamento
                  </p>
                  <p className="font-semibold text-gray-800">{negocio.departamento}</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                Documentos del Trámite ({documentos.length})
              </h2>
              {!tieneDocumentos ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No se han subido documentos para este trámite.
                </p>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {doc.nombre}
                          </p>
                          <p className="text-xs text-gray-400">
                            {doc.tipo === 'PLANO_LOCAL'
                              ? 'Plano del local'
                              : doc.tipo === 'ACTA_INSPECCION'
                              ? 'Acta de inspección'
                              : 'Otro documento'}
                            {doc.mimeType && ` • ${doc.mimeType}`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium shrink-0 ml-3"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment status */}
            <div className="card">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Estado del Pago
              </h2>
              {pagos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No se encontraron pagos registrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {pagos.map((pago) => (
                    <div
                      key={pago.id}
                      className={`p-4 rounded-lg border ${
                        pago.estadoPago === 'APROBADO'
                          ? 'bg-green-50 border-green-200'
                          : pago.estadoPago === 'PENDIENTE'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            pago.estadoPago === 'APROBADO'
                              ? 'bg-green-100 text-green-700'
                              : pago.estadoPago === 'PENDIENTE'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {pago.estadoPago === 'APROBADO'
                            ? '✓ Aprobado'
                            : pago.estadoPago === 'PENDIENTE'
                            ? '⏳ Pendiente'
                            : '✗ ' + pago.estadoPago}
                        </span>
                        <span className="text-lg font-black text-gray-800">
                          S/ {Number(pago.monto).toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        {pago.fechaPago && (
                          <div>
                            <span className="text-xs text-gray-400">Fecha de pago:</span>
                            <p className="font-medium">
                              {new Date(pago.fechaPago).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                timeZone: 'America/Lima',
                              })}
                            </p>
                          </div>
                        )}
                        {pago.referenciaPasarela && (
                          <div>
                            <span className="text-xs text-gray-400">Referencia:</span>
                            <p className="font-medium font-mono text-xs">
                              {pago.referenciaPasarela}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment verification indicator */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {pagoAprobado ? (
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">
                      Pago verificado — S/ {Number(pagoAprobado.monto).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      No se encontró un pago aprobado para este trámite
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Comments + Result form */}
          <div className="space-y-6">
            {/* Comments */}
            <div className="card">
              <ComentariosSection inspeccionId={inspeccion.id} />
            </div>

            {/* Result form — only for pending inspections */}
            {!inspeccion.completada && (
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-4">
                  Registrar Resultado
                </h2>
                <FormResultadoInspeccion inspeccionId={inspeccion.id} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
